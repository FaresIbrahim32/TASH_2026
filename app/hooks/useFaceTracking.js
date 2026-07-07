"use client";

// Ports early-face-screener/app.js's MediaPipe FaceLandmarker analysis
// (measureFace/analyzeFrame/summarizeSession/scoreSession, including the
// baseline-comparison block) into a React hook. The only behavioral change
// from the prototype: `baseline` is passed in (fetched from DynamoDB by the
// caller) instead of being read from localStorage.
//
// Also owns an optional MediaRecorder on the same video stream, used when
// the patient consents to saving the session video.

import { useCallback, useEffect, useRef, useState } from "react";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const EXPRESSION_CATEGORIES = [
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "mouthSmileLeft",
  "mouthSmileRight",
  "jawOpen",
];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function verticalRatio(points, top, bottom, left, right) {
  return distance(points[top], points[bottom]) / Math.max(distance(points[left], points[right]), 0.001);
}

function mean(values) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

function relativeDrop(current, baseline) {
  return baseline > 0 ? Math.max(0, (baseline - current) / baseline) : 0;
}

function relativeRise(current, baseline) {
  return baseline > 0 ? Math.max(0, (current - baseline) / baseline) : 0;
}

function measureFace(landmarks, blendshapes) {
  const leftEyeOpen = verticalRatio(landmarks, 159, 145, 33, 133);
  const rightEyeOpen = verticalRatio(landmarks, 386, 374, 362, 263);
  const mouthOpen = verticalRatio(landmarks, 13, 14, 61, 291);
  const nose = landmarks[1];
  const leftIris = landmarks[468] || landmarks[33];
  const rightIris = landmarks[473] || landmarks[263];
  const gazePoint = {
    x: (leftIris.x + rightIris.x) / 2,
    y: (leftIris.y + rightIris.y) / 2,
  };
  const expressionScore = blendshapes
    .filter((shape) => EXPRESSION_CATEGORIES.includes(shape.categoryName))
    .reduce((sum, shape) => sum + shape.score, 0);

  return {
    eyeOpen: (leftEyeOpen + rightEyeOpen) / 2,
    mouthOpen,
    headPoint: { x: nose.x, y: nose.y },
    gazePoint,
    expressionScore,
  };
}

function summarizeSession(session) {
  const detectedSec = Math.max(session.durationSec, 1);
  const values = (key) => session.samples.map((sample) => sample[key]);
  return {
    trackingQuality: session.frames ? session.detectedFrames / session.frames : 0,
    blinkRatePerMin: session.blinks / (detectedSec / 60),
    headMotionScore: mean(values("headDelta")) * 100,
    gazeMotionScore: mean(values("gazeDelta")) * 100,
    mouthMotionScore: mean(values("mouthDelta")) * 100,
    expressionVariability: stdev(values("expressionScore")),
    sampleCount: session.samples.length,
  };
}

// Ported from early-face-screener/app.js scoreSession(), baseline block included.
function scoreSession(summary, baseline) {
  const reasons = [];
  let points = 0;

  if (summary.trackingQuality < 0.7) {
    return {
      level: "Needs repeat",
      severity: "medium",
      reasons: ["Face tracking quality was too low for a reliable review flag."],
    };
  }

  if (summary.blinkRatePerMin < 5 || summary.blinkRatePerMin > 35) {
    points += 1;
    reasons.push("Blink rate is outside the expected broad range.");
  }
  if (summary.expressionVariability < 0.08) {
    points += 1;
    reasons.push("Facial expressiveness is low during the task.");
  }
  if (summary.headMotionScore < 0.08 || summary.headMotionScore > 1.9) {
    points += 1;
    reasons.push("Head movement is unusually reduced or unstable.");
  }
  if (summary.mouthMotionScore < 0.03) {
    points += 1;
    reasons.push("Mouth movement is low for a speaking task.");
  }

  if (baseline) {
    const deltas = [
      relativeDrop(summary.expressionVariability, baseline.expressionVariability),
      relativeDrop(summary.mouthMotionScore, baseline.mouthMotionScore),
      relativeRise(summary.headMotionScore, baseline.headMotionScore),
      relativeRise(summary.gazeMotionScore, baseline.gazeMotionScore),
    ];
    if (deltas.some((delta) => delta > 0.35)) {
      points += 2;
      reasons.push("This session differs meaningfully from the patient baseline.");
    }
  }

  if (points >= 4) return { level: "High review flag", severity: "high", reasons };
  if (points >= 2) return { level: "Medium review flag", severity: "medium", reasons };
  return {
    level: "Low review flag",
    severity: "low",
    reasons: reasons.length ? reasons : ["No major facial-behavior pattern was flagged."],
  };
}

export function useFaceTracking() {
  const [modelStatus, setModelStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [modelError, setModelError] = useState("");
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const faceLandmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const sessionRef = useRef(null);
  const lastMetricsRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const animationIdRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function initModel() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const resolver = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(resolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) return;
        faceLandmarkerRef.current = landmarker;
        setModelStatus("ready");
      } catch (err) {
        console.error("Failed to load the facial-behavior tracker:", err);
        if (!cancelled) {
          setModelStatus("error");
          setModelError("Could not load the facial-behavior tracker. Check your internet connection and refresh.");
        }
      }
    }

    initModel();
    return () => {
      cancelled = true;
    };
  }, []);

  // Guarantees the camera (and any in-progress recorder) is released if the
  // patient navigates away mid-session — without this, a client-side route
  // change (not a full page reload) would leave the webcam light on
  // indefinitely, since stopping tracks only happened inside stopTracking().
  useEffect(() => {
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animationIdRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const analyzeFrame = useCallback((videoEl, nowMs, elapsedSec) => {
    const session = sessionRef.current;
    if (!session || !faceLandmarkerRef.current) return;

    const result = faceLandmarkerRef.current.detectForVideo(videoEl, nowMs);
    session.frames += 1;

    if (!result.faceLandmarks?.length) {
      setLiveMetrics(summarizeSession(session));
      return;
    }

    session.detectedFrames += 1;
    const landmarks = result.faceLandmarks[0];
    const metrics = measureFace(landmarks, result.faceBlendshapes?.[0]?.categories || []);

    const last = lastMetricsRef.current;
    metrics.headDelta = last ? distance(metrics.headPoint, last.headPoint) : 0;
    metrics.gazeDelta = last ? distance(metrics.gazePoint, last.gazePoint) : 0;
    metrics.mouthDelta = last ? Math.abs(metrics.mouthOpen - last.mouthOpen) : 0;
    lastMetricsRef.current = metrics;

    if (metrics.eyeOpen < 0.18 && !session.eyeClosed) {
      session.eyeClosed = true;
      session.blinks += 1;
    }
    if (metrics.eyeOpen > 0.24) {
      session.eyeClosed = false;
    }

    session.samples.push({
      t: Number(elapsedSec.toFixed(2)),
      eyeOpen: metrics.eyeOpen,
      mouthOpen: metrics.mouthOpen,
      headDelta: metrics.headDelta,
      gazeDelta: metrics.gazeDelta,
      mouthDelta: metrics.mouthDelta,
      expressionScore: metrics.expressionScore,
    });

    setLiveMetrics(summarizeSession(session));
  }, []);

  const tick = useCallback(
    (videoEl) => {
      if (!runningRef.current) return;
      const nowMs = Date.now();
      if (videoEl.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = videoEl.currentTime;
        const elapsedSec = (nowMs - sessionRef.current.startedAtMs) / 1000;
        analyzeFrame(videoEl, nowMs, elapsedSec);
      }
      animationIdRef.current = requestAnimationFrame(() => tick(videoEl));
    },
    [analyzeFrame]
  );

  /**
   * Starts the webcam + live face tracking on the given <video> element.
   * @param {HTMLVideoElement} videoEl
   * @param {{ durationSec: number, recordVideo: boolean }} options
   */
  const startTracking = useCallback(
    async (videoEl, { durationSec, recordVideo }) => {
      // Set the guard synchronously, before any `await` — otherwise two
      // near-simultaneous calls (e.g. React StrictMode's dev-only double-effect)
      // would both pass this check while the first is still awaiting
      // getUserMedia, starting two overlapping camera streams/tick loops.
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        // Include a mic track only when we'll actually save the video, so the
        // recorded session video has sound for clinician review. MediaPipe
        // ignores the audio track; the preview <video> is muted, so there's no
        // speaker feedback. (The spoken-answer clip is still captured separately
        // by AudioRecorder for transcription, regardless of video consent.)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: !!recordVideo,
        });
        streamRef.current = stream;
        videoEl.srcObject = stream;
        await videoEl.play();

        sessionRef.current = {
          startedAtMs: Date.now(),
          durationSec,
          frames: 0,
          detectedFrames: 0,
          blinks: 0,
          eyeClosed: false,
          samples: [],
        };
        lastMetricsRef.current = null;
        lastVideoTimeRef.current = -1;
        setIsTracking(true);
        setLiveMetrics(null);

        if (recordVideo) {
          videoChunksRef.current = [];
          let recorder;
          try {
            recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          } catch {
            recorder = new MediaRecorder(stream);
          }
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              videoChunksRef.current.push(event.data);
            }
          };
          mediaRecorderRef.current = recorder;
          recorder.start(1000);
        }

        tick(videoEl);
      } catch (err) {
        // Reset the guard so a legitimate retry (e.g. user re-grants camera
        // permission and clicks "Start" again) isn't permanently locked out.
        runningRef.current = false;
        setIsTracking(false);
        // Release the camera/mic if getUserMedia already succeeded but a later
        // step threw (e.g. videoEl.play() rejected or MediaRecorder failed) —
        // otherwise the webcam light would stay on until the component unmounts.
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
          mediaRecorderRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        throw err;
      }
    },
    [tick]
  );

  /**
   * Stops tracking, computes the summary + flag (optionally against a
   * baseline), and resolves the recorded video Blob (if any) only after the
   * MediaRecorder's `onstop` has actually flushed its last chunk.
   * @param {object|null} baseline
   * @returns {Promise<{ summary: object|null, flag: object|null, videoBlob: Blob|null }>}
   */
  const stopTracking = useCallback((baseline) => {
    runningRef.current = false;
    setIsTracking(false);
    cancelAnimationFrame(animationIdRef.current);

    return new Promise((resolve) => {
      function finish(videoBlob) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const session = sessionRef.current;
        if (!session) {
          resolve({ summary: null, flag: null, videoBlob });
          return;
        }

        session.durationSec = Math.max(1, (Date.now() - session.startedAtMs) / 1000);
        const summary = summarizeSession(session);
        const flag = scoreSession(summary, baseline);
        resolve({ summary, flag, videoBlob });
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || "video/webm";
          const videoBlob = videoChunksRef.current.length
            ? new Blob(videoChunksRef.current, { type: mimeType })
            : null;
          mediaRecorderRef.current = null;
          finish(videoBlob);
        };
        recorder.stop();
      } else {
        finish(null);
      }
    });
  }, []);

  return { modelStatus, modelError, liveMetrics, isTracking, startTracking, stopTracking };
}
