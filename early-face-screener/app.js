import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const tasks = {
  picture: {
    title: "Picture description",
    text: "Describe what you see in the picture. Keep talking until the timer ends.",
    image:
      "https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=900&q=80",
  },
  animals: {
    title: "Name animals",
    text: "Name as many animals as you can. Keep going until the timer ends.",
    image:
      "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80",
  },
  memory: {
    title: "Five-word recall",
    text: "Read these words once: apple, chair, river, penny, garden. Then look at the camera and repeat the words.",
    image:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80",
  },
};

const els = {
  form: document.querySelector("#sessionForm"),
  patientId: document.querySelector("#patientId"),
  taskSelect: document.querySelector("#taskSelect"),
  durationSelect: document.querySelector("#durationSelect"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  exportButton: document.querySelector("#exportButton"),
  modelStatus: document.querySelector("#modelStatus"),
  taskTitle: document.querySelector("#taskTitle"),
  taskText: document.querySelector("#taskText"),
  taskImage: document.querySelector("#taskImage"),
  video: document.querySelector("#video"),
  overlay: document.querySelector("#overlay"),
  timer: document.querySelector("#timer"),
  flagBox: document.querySelector("#flagBox"),
  flagLevel: document.querySelector("#flagLevel"),
  flagText: document.querySelector("#flagText"),
  baselineText: document.querySelector("#baselineText"),
  trackingQuality: document.querySelector("#trackingQuality"),
  blinkRate: document.querySelector("#blinkRate"),
  headMotion: document.querySelector("#headMotion"),
  gazeMotion: document.querySelector("#gazeMotion"),
  mouthMotion: document.querySelector("#mouthMotion"),
  expressionVar: document.querySelector("#expressionVar"),
};

let faceLandmarker;
let drawingUtils;
let stream;
let running = false;
let animationId = 0;
let session = null;
let lastVideoTime = -1;
let lastMetrics = null;

function createBlankSession() {
  return {
    id: crypto.randomUUID(),
    patientId: els.patientId.value.trim(),
    task: els.taskSelect.value,
    durationSec: Number(els.durationSelect.value),
    startedAt: new Date().toISOString(),
    endedAt: null,
    frames: 0,
    detectedFrames: 0,
    blinks: 0,
    eyeClosed: false,
    responseDelaySec: null,
    samples: [],
    summary: null,
    flag: null,
  };
}

async function initModel() {
  try {
    const resolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    drawingUtils = new DrawingUtils(els.overlay.getContext("2d"));
    setModelStatus("Tracker ready", "ready");
  } catch (error) {
    console.error(error);
    setModelStatus("Tracker failed", "error");
    els.flagText.textContent = "MediaPipe could not load. Check the internet connection and refresh.";
  }
}

function setModelStatus(text, state) {
  els.modelStatus.textContent = text;
  els.modelStatus.className = `status-pill ${state || ""}`.trim();
}

function setTask(taskKey) {
  const task = tasks[taskKey];
  els.taskTitle.textContent = task.title;
  els.taskText.textContent = task.text;
  els.taskImage.src = task.image;
}

async function startSession(event) {
  event.preventDefault();
  if (!faceLandmarker || running) return;

  session = createBlankSession();
  resetUi();
  running = true;
  lastVideoTime = -1;
  lastMetrics = null;
  els.startButton.disabled = true;
  els.stopButton.disabled = false;
  els.exportButton.disabled = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    els.video.srcObject = stream;
    await els.video.play();
  } catch (error) {
    console.error(error);
    running = false;
    els.startButton.disabled = false;
    els.stopButton.disabled = true;
    els.flagLevel.textContent = "Camera unavailable";
    els.flagText.textContent = "Allow camera access or connect a webcam, then start again.";
    return;
  }

  sizeCanvas();
  requestAnimationFrame(tick);
}

function stopSession() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(animationId);
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  session.endedAt = new Date().toISOString();
  session.summary = summarizeSession(session);
  session.flag = scoreSession(session.summary, session.patientId);
  saveBaselineIfNeeded(session.patientId, session.summary);
  renderSummary(session.summary, session.flag, session.patientId);
  els.startButton.disabled = false;
  els.stopButton.disabled = true;
  els.exportButton.disabled = false;
}

function tick() {
  if (!running) return;
  const elapsedSec = (Date.now() - Date.parse(session.startedAt)) / 1000;
  const remaining = Math.max(0, session.durationSec - elapsedSec);
  els.timer.textContent = formatTime(remaining);

  if (remaining <= 0) {
    stopSession();
    return;
  }

  if (els.video.currentTime !== lastVideoTime) {
    lastVideoTime = els.video.currentTime;
    analyzeFrame(Date.now(), elapsedSec);
  }
  animationId = requestAnimationFrame(tick);
}

function analyzeFrame(nowMs, elapsedSec) {
  const result = faceLandmarker.detectForVideo(els.video, nowMs);
  const ctx = els.overlay.getContext("2d");
  ctx.clearRect(0, 0, els.overlay.width, els.overlay.height);
  session.frames += 1;

  if (!result.faceLandmarks?.length) {
    updateLiveMetrics();
    return;
  }

  session.detectedFrames += 1;
  const landmarks = result.faceLandmarks[0];
  drawFace(landmarks);

  const metrics = measureFace(landmarks, result.faceBlendshapes?.[0]?.categories || []);
  if (lastMetrics) {
    metrics.headDelta = distance(metrics.headPoint, lastMetrics.headPoint);
    metrics.gazeDelta = distance(metrics.gazePoint, lastMetrics.gazePoint);
    metrics.mouthDelta = Math.abs(metrics.mouthOpen - lastMetrics.mouthOpen);
  } else {
    metrics.headDelta = 0;
    metrics.gazeDelta = 0;
    metrics.mouthDelta = 0;
  }
  lastMetrics = metrics;

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
  updateLiveMetrics();
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
    .filter((shape) =>
      ["browDownLeft", "browDownRight", "browInnerUp", "mouthSmileLeft", "mouthSmileRight", "jawOpen"].includes(
        shape.categoryName,
      ),
    )
    .reduce((sum, shape) => sum + shape.score, 0);

  return {
    eyeOpen: (leftEyeOpen + rightEyeOpen) / 2,
    mouthOpen,
    headPoint: { x: nose.x, y: nose.y },
    gazePoint,
    expressionScore,
  };
}

function verticalRatio(points, top, bottom, left, right) {
  return distance(points[top], points[bottom]) / Math.max(distance(points[left], points[right]), 0.001);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawFace(landmarks) {
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
    color: "rgba(255,255,255,0.18)",
    lineWidth: 1,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
    color: "#7be0c9",
    lineWidth: 2,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
    color: "#f5c16c",
    lineWidth: 2,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
    color: "#f5c16c",
    lineWidth: 2,
  });
  drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
    color: "#ff9178",
    lineWidth: 2,
  });
}

function summarizeSession(current) {
  const detectedSec = Math.max(current.durationSec, 1);
  const values = (key) => current.samples.map((sample) => sample[key]);
  return {
    patientId: current.patientId,
    task: current.task,
    durationSec: current.durationSec,
    startedAt: current.startedAt,
    trackingQuality: current.frames ? current.detectedFrames / current.frames : 0,
    blinkRatePerMin: current.blinks / (detectedSec / 60),
    headMotionScore: mean(values("headDelta")) * 100,
    gazeMotionScore: mean(values("gazeDelta")) * 100,
    mouthMotionScore: mean(values("mouthDelta")) * 100,
    expressionVariability: stdev(values("expressionScore")),
    sampleCount: current.samples.length,
  };
}

function scoreSession(summary, patientId) {
  const baseline = getBaseline(patientId);
  let points = 0;
  const reasons = [];

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

  if (points >= 4) {
    return { level: "High review flag", severity: "high", reasons };
  }
  if (points >= 2) {
    return { level: "Medium review flag", severity: "medium", reasons };
  }
  return {
    level: "Low review flag",
    severity: "low",
    reasons: reasons.length ? reasons : ["No major facial-behavior pattern was flagged."],
  };
}

function updateLiveMetrics() {
  const summary = summarizeSession(session);
  els.trackingQuality.textContent = `${Math.round(summary.trackingQuality * 100)}%`;
  els.blinkRate.textContent = summary.blinkRatePerMin.toFixed(1);
  els.headMotion.textContent = summary.headMotionScore.toFixed(2);
  els.gazeMotion.textContent = summary.gazeMotionScore.toFixed(2);
  els.mouthMotion.textContent = summary.mouthMotionScore.toFixed(2);
  els.expressionVar.textContent = summary.expressionVariability.toFixed(2);
}

function renderSummary(summary, flag, patientId) {
  updateLiveMetrics();
  els.flagBox.className = `flag ${flag.severity}`;
  els.flagLevel.textContent = flag.level;
  els.flagText.textContent = flag.reasons.join(" ");

  const baseline = getBaseline(patientId);
  if (baseline) {
    els.baselineText.textContent = `Baseline exists for ${patientId}. Current expression variability: ${summary.expressionVariability.toFixed(
      2,
    )}; baseline: ${baseline.expressionVariability.toFixed(2)}.`;
  } else {
    els.baselineText.textContent = `Saved this session as the local baseline for ${patientId}.`;
  }
}

function resetUi() {
  els.flagBox.className = "flag";
  els.flagLevel.textContent = "Recording";
  els.flagText.textContent = "Tracking facial behavior while the prompt is active.";
  els.timer.textContent = formatTime(Number(els.durationSelect.value));
}

function exportSession() {
  if (!session?.summary) return;
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${session.patientId}_${session.task}_${session.startedAt.slice(0, 19).replaceAll(":", "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function getBaseline(patientId) {
  const raw = localStorage.getItem(`baseline:${patientId}`);
  return raw ? JSON.parse(raw) : null;
}

function saveBaselineIfNeeded(patientId, summary) {
  if (!getBaseline(patientId)) {
    localStorage.setItem(`baseline:${patientId}`, JSON.stringify(summary));
  }
}

function relativeDrop(current, baseline) {
  return baseline > 0 ? Math.max(0, (baseline - current) / baseline) : 0;
}

function relativeRise(current, baseline) {
  return baseline > 0 ? Math.max(0, (current - baseline) / baseline) : 0;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function sizeCanvas() {
  const rect = els.video.getBoundingClientRect();
  els.overlay.width = Math.floor(rect.width);
  els.overlay.height = Math.floor(rect.height);
}

els.taskSelect.addEventListener("change", () => setTask(els.taskSelect.value));
els.form.addEventListener("submit", startSession);
els.stopButton.addEventListener("click", stopSession);
els.exportButton.addEventListener("click", exportSession);
window.addEventListener("resize", sizeCanvas);

setTask(els.taskSelect.value);
initModel();
