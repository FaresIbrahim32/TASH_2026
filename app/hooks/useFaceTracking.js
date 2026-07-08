"use client";

// A React hook around MediaPipe's FaceLandmarker: runs live facial-behavior
// analysis (measureFace/analyzeFrame/summarizeSession) over a webcam stream
// and computes a non-diagnostic review flag. Scoring is fixed-threshold only —
// see scoreSession() for the research backing each threshold.
//
// Also owns an optional MediaRecorder on the same video stream, used when
// the patient consents to saving the session video, and an optional overlay
// canvas that draws the tracked landmarks for the live DOM preview only —
// MediaRecorder always records the raw camera MediaStream directly (see
// startTracking), so the overlay never reaches the saved video file.

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

// Landmark indices used by measureFace() (what's actually scored).
const LEFT_EYE = [159, 145, 33, 133]; // top, bottom, left, right
const RIGHT_EYE = [386, 374, 362, 263];
const MOUTH = [13, 14, 61, 291];
const NOSE_INDEX = 1;
const LEFT_IRIS_INDEX = 468;
const RIGHT_IRIS_INDEX = 473;

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

function measureFace(landmarks, blendshapes) {
  const leftEyeOpen = verticalRatio(landmarks, ...LEFT_EYE);
  const rightEyeOpen = verticalRatio(landmarks, ...RIGHT_EYE);
  const mouthOpen = verticalRatio(landmarks, ...MOUTH);
  const nose = landmarks[NOSE_INDEX];
  const leftIris = landmarks[LEFT_IRIS_INDEX] || landmarks[33];
  const rightIris = landmarks[RIGHT_IRIS_INDEX] || landmarks[263];
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

// Keeps the overlay canvas's internal bitmap resolution matched to the
// video's native size. Called every tracked frame (not just once after
// `play()`) because a live getUserMedia MediaStream doesn't guarantee
// videoWidth/videoHeight are populated the instant play() resolves — if they
// were still 0 on the one-time assignment, the canvas would stay 0x0 (every
// draw silently no-ops) for the rest of the session with no way to recover.
// The width/height check makes this a no-op once sizes match, so it's cheap
// to call unconditionally.
function syncOverlayCanvasSize(canvas, videoEl) {
  if (!canvas || !videoEl.videoWidth || !videoEl.videoHeight) return;
  if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
  }
}

// Draws a face mask over the live preview only: a subtle full-face mesh plus
// highlighted face-oval/eye/lip contours, via MediaPipe's own DrawingUtils +
// FaceLandmarker's static connector arrays. The canvas's CSS box mirrors the <video>
// element's own width/height/objectFit exactly (see culture-connect/page.js
// — both are unbordered children of a bordered wrapper) and its internal
// resolution is kept at the video's native size (see syncOverlayCanvasSize),
// so DrawingUtils' normalized-landmark scaling lines up with the video pixels
// underneath — no separate crop/scale math needed.
function drawLandmarkOverlay(ctx, canvas, drawingUtils, FaceLandmarkerClass, landmarks) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks || !drawingUtils || !FaceLandmarkerClass) return;

  drawingUtils.drawConnectors(landmarks, FaceLandmarkerClass.FACE_LANDMARKS_TESSELATION, {
    color: "rgba(255,255,255,0.18)",
    lineWidth: 1,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarkerClass.FACE_LANDMARKS_FACE_OVAL, {
    color: "#7be0c9",
    lineWidth: 2,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarkerClass.FACE_LANDMARKS_LEFT_EYE, {
    color: "#f5c16c",
    lineWidth: 2,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarkerClass.FACE_LANDMARKS_RIGHT_EYE, {
    color: "#f5c16c",
    lineWidth: 2,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarkerClass.FACE_LANDMARKS_LIPS, {
    color: "#ff9178",
    lineWidth: 2,
  });
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

// Fixed-threshold scoring only. An earlier baseline-comparison block was
// removed — the "baseline" was captured from whichever patient happened to run
// the first-ever session on a given clinician login, with no way to reset it,
// so later patients were being scored against an arbitrary,
// possibly-already-impaired reference rather than their own prior visit; this
// app has no patient identifier to guarantee it was even the same person.
//
// Each threshold's *direction* is grounded in published dementia/AD research
// (cited inline). The exact cutoff values are heuristics tuned to this app's
// own MediaPipe-derived metrics — no published study uses these formulas —
// so this remains a screening nudge for a clinician to look closer, not a
// diagnostic score.
function scoreSession(summary) {
  const reasons = [];
  let points = 0;

  if (summary.trackingQuality < 0.7) {
    return {
      level: "Needs repeat",
      severity: "medium",
      reasons: ["Face tracking quality was too low for a reliable review flag."],
    };
  }

  // Blink rate: normal resting range is ~12-20/min, rising to ~30+/min during
  // active conversation (task-dependent). MCI patients show significantly
  // *higher* blink rate than age-matched controls, inversely correlated with
  // MoCA score (Ladas et al. 2014, Int J Psychophysiol 93(1):12-6). The lower
  // bound is a broader neuromotor-slowing catch (relevant to Lewy body
  // dementia's parkinsonian features) rather than a core-AD-specific marker.
  if (summary.blinkRatePerMin < 5 || summary.blinkRatePerMin > 35) {
    points += 1;
    reasons.push("Blink rate is outside the expected broad range.");
  }
  // Flat affect / hypomimia: well documented in AD, not just Parkinson's — one
  // study found 58% of AD patients met a validated hypomimia threshold
  // (MDS-UPDRS-III item 3.2) vs controls (p=0.02), correlating with disease
  // duration (Cannavacciuolo et al. 2023, J Neural Transm 131(1):31-41).
  if (summary.expressionVariability < 0.08) {
    points += 1;
    reasons.push("Facial expressiveness is low during the task.");
  }
  // Head motion: only the "too still" direction is checked. Psychomotor
  // slowing (reduced movement, not excess movement) is a consistently
  // documented AD/Lewy body dementia finding across multiple motor measures
  // (Bailon et al. 2010, Dement Geriatr Cogn Disord 29(5):388-96). No
  // comparable evidence supports flagging *excess* head motion, so that side
  // of the old range (>1.9) was dropped rather than carried over unexamined.
  if (summary.headMotionScore < 0.08) {
    points += 1;
    reasons.push("Head movement is unusually reduced during the task.");
  }
  // Mouth motion: reduced, uncoordinated orofacial movement during speech
  // (apraxia/hypokinesia) is documented in AD and worsens with severity.
  if (summary.mouthMotionScore < 0.03) {
    points += 1;
    reasons.push("Mouth movement is low for a speaking task.");
  }

  // summary.gazeMotionScore is tracked and stored (see summarizeSession) but
  // intentionally not scored here — AD-related gaze-variance findings exist
  // in the literature, but no threshold has been vetted yet for this app's
  // specific eye-landmark-derived metric. Revisit before adding a check for it.

  // Max achievable points is 4 (one per check above) now that the baseline
  // comparison's +2 bonus is gone, so "High" only requires 3 of 4 independent
  // signals to agree, not a literal unanimous 4/4 (which would make the tier
  // practically unreachable in a single 60s task).
  if (points >= 3) return { level: "High review flag", severity: "high", reasons };
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
  const [overlayEnabled, setOverlayEnabledState] = useState(true);

  const faceLandmarkerRef = useRef(null);
  const faceLandmarkerClassRef = useRef(null); // the FaceLandmarker class itself, for its static FACE_LANDMARKS_* connector arrays
  const drawingUtilsClassRef = useRef(null); // the DrawingUtils constructor, instantiated per-canvas in startTracking
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const sessionRef = useRef(null);
  const lastMetricsRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const animationIdRef = useRef(0);
  const runningRef = useRef(false);
  const overlayCanvasRef = useRef(null);
  const overlayCtxRef = useRef(null); // cached 2D context — avoids getContext() on every tracked frame
  const drawingUtilsRef = useRef(null); // MediaPipe DrawingUtils instance wrapping overlayCtxRef.current
  const overlayEnabledRef = useRef(true); // mirrors overlayEnabled state, read inside the rAF loop to avoid stale closures

  const setOverlayEnabled = useCallback((enabled) => {
    overlayEnabledRef.current = enabled;
    setOverlayEnabledState(enabled);
    if (!enabled && overlayCanvasRef.current) {
      drawLandmarkOverlay(overlayCtxRef.current, overlayCanvasRef.current, drawingUtilsRef.current, faceLandmarkerClassRef.current, null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initModel() {
      try {
        const { FaceLandmarker, FilesetResolver, DrawingUtils } = await import("@mediapipe/tasks-vision");
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
        faceLandmarkerClassRef.current = FaceLandmarker;
        drawingUtilsClassRef.current = DrawingUtils;
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

    if (overlayEnabledRef.current) syncOverlayCanvasSize(overlayCanvasRef.current, videoEl);

    const result = faceLandmarkerRef.current.detectForVideo(videoEl, nowMs);
    session.frames += 1;

    if (!result.faceLandmarks?.length) {
      if (overlayEnabledRef.current) {
        drawLandmarkOverlay(overlayCtxRef.current, overlayCanvasRef.current, drawingUtilsRef.current, faceLandmarkerClassRef.current, null);
      }
      setLiveMetrics(summarizeSession(session));
      return;
    }

    session.detectedFrames += 1;
    const landmarks = result.faceLandmarks[0];
    if (overlayEnabledRef.current) {
      drawLandmarkOverlay(overlayCtxRef.current, overlayCanvasRef.current, drawingUtilsRef.current, faceLandmarkerClassRef.current, landmarks);
    }
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
   * @param {{ durationSec: number, recordVideo: boolean, overlayCanvas?: HTMLCanvasElement|null }} options
   */
  const startTracking = useCallback(
    async (videoEl, { durationSec, recordVideo, overlayCanvas }) => {
      // Set the guard synchronously, before any `await` — otherwise two
      // near-simultaneous calls (e.g. React StrictMode's dev-only double-effect)
      // would both pass this check while the first is still awaiting
      // getUserMedia, starting two overlapping camera streams/tick loops.
      if (runningRef.current) return;
      runningRef.current = true;

      // Taking the canvas as a startTracking() option (rather than a separate
      // attachOverlayCanvas() call made by the caller beforehand) means there's
      // no ordering dependency to get wrong — the element and its context are
      // always in place before the tick loop that would read them ever runs.
      overlayCanvasRef.current = overlayCanvas || null;
      overlayCtxRef.current = overlayCanvas ? overlayCanvas.getContext("2d") : null;
      drawingUtilsRef.current =
        overlayCtxRef.current && drawingUtilsClassRef.current ? new drawingUtilsClassRef.current(overlayCtxRef.current) : null;

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

        // A stop can race ahead of this async getUserMedia call — e.g. capture
        // is gated on a record button now, so a very fast Start-then-Stop click
        // can call stopTracking() while we're still awaiting the camera. If
        // that happened, runningRef.current is already false: release this
        // now-orphaned stream immediately instead of leaving the camera light
        // on indefinitely (nothing else will ever stop these tracks).
        if (!runningRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoEl.srcObject = stream;
        await videoEl.play();

        // Same race, second window: a stop could also land during play().
        if (!runningRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          videoEl.srcObject = null;
          return;
        }

        // Best-effort initial sizing; analyzeFrame's per-frame
        // syncOverlayCanvasSize() call is what actually guarantees correctness
        // if videoWidth/videoHeight aren't populated yet at this point.
        syncOverlayCanvasSize(overlayCanvasRef.current, videoEl);

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
   * Stops tracking, computes the summary + flag, and resolves the recorded
   * video Blob (if any) only after the MediaRecorder's `onstop` has actually
   * flushed its last chunk. Safe to call when nothing is running (e.g. a fast
   * double-click, or a stop that arrives while a previous take's stop is
   * still being awaited elsewhere) — resolves immediately as a no-op rather
   * than re-stopping an already-stopped recorder/stream. runningRef is the
   * single authoritative signal for this, checked synchronously so two
   * overlapping calls can't both think there's something to stop.
   * @returns {Promise<{ summary: object|null, flag: object|null, videoBlob: Blob|null }>}
   */
  const stopTracking = useCallback(() => {
    if (!runningRef.current) {
      return Promise.resolve({ summary: null, flag: null, videoBlob: null });
    }
    runningRef.current = false;
    setIsTracking(false);
    cancelAnimationFrame(animationIdRef.current);

    return new Promise((resolve) => {
      function finish(videoBlob) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        overlayCanvasRef.current = null;
        overlayCtxRef.current = null;
        drawingUtilsRef.current = null;

        const session = sessionRef.current;
        if (!session) {
          resolve({ summary: null, flag: null, videoBlob });
          return;
        }

        session.durationSec = Math.max(1, (Date.now() - session.startedAtMs) / 1000);
        const summary = summarizeSession(session);
        const flag = scoreSession(summary);
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

  return {
    modelStatus,
    modelError,
    liveMetrics,
    isTracking,
    startTracking,
    stopTracking,
    overlayEnabled,
    setOverlayEnabled,
  };
}
