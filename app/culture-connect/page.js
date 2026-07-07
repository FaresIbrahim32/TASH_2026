"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2, Volume2, VolumeX, ScanFace } from "lucide-react";
import AudioRecorder from "../components/AudioRecorder";
import { useFaceTracking } from "../hooks/useFaceTracking";
import { pickCultureSession, cultureTests, cultureUI, supportedCultureLanguages } from "../lib/cultureContent";

function dataURLtoBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const FLAG_COLORS = {
  low: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
  medium: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  high: { bg: "#fff5f5", border: "#fee2e2", text: "#991b1b" },
};

// The raw supporting measurements behind the flag (see scoreSession() in
// useFaceTracking.js). English-only labels to match the flag/reasons text,
// which is also not localized. Kept visually secondary to the flag itself —
// these are heuristic, non-validated numbers, not a diagnostic score.
const FACE_METRICS = [
  { key: "trackingQuality", label: "Tracking quality", format: (v) => `${Math.round((v ?? 0) * 100)}%` },
  { key: "blinkRatePerMin", label: "Blink rate", format: (v) => `${(v ?? 0).toFixed(1)}/min` },
  { key: "headMotionScore", label: "Head motion", format: (v) => (v ?? 0).toFixed(2) },
  { key: "gazeMotionScore", label: "Gaze motion", format: (v) => (v ?? 0).toFixed(2) },
  { key: "mouthMotionScore", label: "Mouth motion", format: (v) => (v ?? 0).toFixed(2) },
  { key: "expressionVariability", label: "Expression variability", format: (v) => (v ?? 0).toFixed(2) },
];

// Languages that exist as content but aren't wired up for a session yet.
const COMING_SOON = [];

export default function CultureConnectPage() {
  const router = useRouter();
  const { modelStatus, modelError, isTracking, startTracking, stopTracking, overlayEnabled, setOverlayEnabled } =
    useFaceTracking();

  const [stage, setStage] = useState("setup"); // setup | consent | session | submitting | results | error
  const [language, setLanguage] = useState("en");
  const [videoConsent, setVideoConsent] = useState(true);
  const [sessionContent, setSessionContent] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // picture -> audio dataURL, game -> selected option
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const activeAudioRef = useRef(null);
  const sessionIdRef = useRef(null);
  const faceResultRef = useRef(null); // { summary, flag, videoBlob } captured when recording stops
  const faceStopPromiseRef = useRef(null); // in-flight stopTracking() promise, awaited before advancing / re-recording
  const isAdvancingRef = useRef(false); // guards handleNextStep against a double-click firing it twice while the async stop is still in flight

  const t = cultureUI[language] || cultureUI.en;
  const dir = cultureTests[language]?.direction || "ltr";

  const steps = sessionContent
    ? [
        {
          id: sessionContent.picture.id,
          type: "picture",
          text: sessionContent.instruction,
          imageUrl: sessionContent.picture.imageUrl,
        },
        ...sessionContent.games.map((g) => ({
          id: g.id,
          type: "game",
          text: g.question,
          expectedAnswer: g.expectedAnswer,
          options: g.options,
          imageUrl: g.imageUrl,
        })),
      ]
    : [];

  const currentStep = steps[stepIndex];

  // Note: face tracking (webcam + MediaPipe analysis + optional saved video) is
  // deliberately NOT auto-started when the picture step opens. It's gated on the
  // audio record button so the camera only turns on when the patient starts
  // recording — see handleRecordingStart / handleRecordingStop, driven by the
  // AudioRecorder's onRecordingStart / onRecordingStop.

  useEffect(() => {
    return () => stopAllSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAllSpeech() {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
      } catch {}
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  // TTS: ElevenLabs via /api/tts first, browser SpeechSynthesis as fallback.
  // Ported from app/test/page.js's handleSpeak.
  async function handleSpeak(text, locale) {
    if (typeof window === "undefined") return;
    if (isSpeaking) {
      stopAllSpeech();
      return;
    }
    stopAllSpeech();

    const playNativeSpeech = () => {
      if (!window.speechSynthesis) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 0.85;
      try {
        const voices = window.speechSynthesis.getVoices();
        const languagePrefix = locale.split("-")[0].toLowerCase();
        const matched = voices.find(
          (v) => v.lang.toLowerCase() === locale.toLowerCase() || v.lang.toLowerCase().startsWith(languagePrefix)
        );
        if (matched) utterance.voice = matched;
      } catch (err) {
        console.warn("Voice matching failed:", err);
      }
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    };

    const playAudioUrl = (url) => {
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        activeAudioRef.current = null;
        playNativeSpeech();
      };
      setIsSpeaking(true);
      audio.play().catch(() => playNativeSpeech());
    };

    try {
      let langPrefix = locale.split("-")[0];
      if (langPrefix === "zh") {
        langPrefix = "zh-TW";
      }
      const queryUrl = `/api/tts?language=${encodeURIComponent(langPrefix)}&text=${encodeURIComponent(text)}`;
      const response = await fetch(queryUrl);
      if (response.ok) {
        const blob = await response.blob();
        playAudioUrl(URL.createObjectURL(blob));
      } else {
        playNativeSpeech();
      }
    } catch (err) {
      console.warn("Hybrid speak failed, falling back to native SpeechSynthesis:", err);
      playNativeSpeech();
    }
  }

  function handleSetupContinue() {
    setErrorMsg("");
    setSessionContent(pickCultureSession(language));
    setStage("consent");
  }

  function handleStartSession() {
    setErrorMsg("");
    setStepIndex(0);
    setAnswers({});
    faceResultRef.current = null;
    faceStopPromiseRef.current = null;
    sessionIdRef.current = `culture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setStage("session");
  }

  // Picture step: store the recorded audio dataURL.
  function handleAudioConfirm(base64) {
    if (!currentStep) return;
    setAnswers((prev) => ({ ...prev, [currentStep.id]: base64 }));
  }

  // Fired by AudioRecorder when recording starts (Start Recording, or a Retake).
  // Starts the webcam face-tracking in lockstep with the mic. On a retake this
  // trashes the prior take's result and starts fresh.
  async function handleRecordingStart() {
    setErrorMsg("");
    // If a previous take's stopTracking() is still flushing, let it finish
    // before acquiring a fresh camera stream — otherwise the old stop could
    // tear down the new stream mid-start.
    if (faceStopPromiseRef.current) {
      try {
        await faceStopPromiseRef.current;
      } catch {}
      faceStopPromiseRef.current = null;
    }
    faceResultRef.current = null;
    if (!videoRef.current) return;
    try {
      await startTracking(videoRef.current, {
        durationSec: 60,
        recordVideo: videoConsent,
        overlayCanvas: overlayCanvasRef.current,
      });
    } catch (err) {
      console.error("Camera/mic access error:", err);
      setErrorMsg(t.cameraError);
    }
  }

  // Fired by AudioRecorder when recording stops (Stop button, or the 60s cap).
  // Stops face-tracking and captures the flag/video; the promise is stashed so
  // handleNextStep can await it if the patient advances before it resolves.
  function handleRecordingStop() {
    // A fast double-click on "Stop" can fire this twice before the button
    // unmounts. Guard so we only call stopTracking() once per take — a second
    // concurrent call would see the recorder already 'inactive' and resolve
    // with a null video blob, clobbering the real one. (Reset in
    // handleRecordingStart for the next take.)
    if (faceStopPromiseRef.current) return;
    const promise = stopTracking();
    faceStopPromiseRef.current = promise;
    promise.then((result) => {
      faceResultRef.current = result;
    });
  }

  // Game step: store the clicked option.
  function handleSelectOption(option) {
    if (!currentStep) return;
    setAnswers((prev) => ({ ...prev, [currentStep.id]: option }));
  }

  async function handleNextStep() {
    // Guards against a double-click/double-tap re-entering this function while
    // the picture step's `await` below is still in flight — the button's
    // disabled state doesn't update fast enough to block a second click in the
    // same tick, which would otherwise fire setStepIndex twice and skip a step.
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    try {
      stopAllSpeech();

      // Picture step: tracking was already stopped when the patient clicked
      // "Stop" (handleRecordingStop). Just make sure that stop's async result
      // has resolved before advancing. Everything after this is a silent,
      // untracked click quiz.
      if (currentStep.type === "picture") {
        if (faceStopPromiseRef.current) {
          faceResultRef.current = await faceStopPromiseRef.current;
        }
        setStepIndex((i) => i + 1);
        return;
      }

      if (stepIndex < steps.length - 1) {
        setStepIndex((i) => i + 1);
        return;
      }

      setStage("submitting");
      await submitSession();
    } finally {
      isAdvancingRef.current = false;
    }
  }

  async function submitSession() {
    try {
      const sessionId = sessionIdRef.current;
      const face = faceResultRef.current || { summary: {}, flag: null, videoBlob: null };
      const flag = face.flag || { level: "Needs repeat", severity: "medium", reasons: ["Facial tracking did not complete."] };
      const pictureStep = steps.find((s) => s.type === "picture");

      // Only the picture-description audio (+ optional video) is uploaded.
      // Game answers are plain clicks, scored client-side.
      const filesToPresign = [];
      if (pictureStep && answers[pictureStep.id]) {
        filesToPresign.push({ key: pictureStep.id, contentType: "audio/webm" });
      }
      if (videoConsent && face.videoBlob) {
        filesToPresign.push({ key: "sessionVideo", contentType: face.videoBlob.type || "video/webm" });
      }

      let presignedFiles = {};
      if (filesToPresign.length > 0) {
        const presignRes = await fetch("/api/culture-sessions/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, files: filesToPresign }),
        });
        if (!presignRes.ok) throw new Error("Failed to get upload URLs.");
        presignedFiles = (await presignRes.json()).files;
      }

      let pictureAudioUrl = "";
      if (pictureStep && answers[pictureStep.id] && presignedFiles[pictureStep.id]) {
        const blob = dataURLtoBlob(answers[pictureStep.id]);
        const uploadRes = await fetch(presignedFiles[pictureStep.id].uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "audio/webm" },
          body: blob,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload the picture-description audio.");
        pictureAudioUrl = presignedFiles[pictureStep.id].publicUrl;
      }

      let sessionVideoUrl = null;
      if (videoConsent && face.videoBlob && presignedFiles.sessionVideo) {
        const videoUploadRes = await fetch(presignedFiles.sessionVideo.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": face.videoBlob.type || "video/webm" },
          body: face.videoBlob,
        });
        if (!videoUploadRes.ok) throw new Error("Failed to upload the session video.");
        sessionVideoUrl = presignedFiles.sessionVideo.publicUrl;
      }

      const scenarios = steps.map((step) => {
        if (step.type === "picture") {
          return { id: step.id, type: "picture", prompt: step.text, imageUrl: step.imageUrl || null, audioUrl: pictureAudioUrl };
        }
        const selected = answers[step.id] || null;
        return {
          id: step.id,
          type: "game",
          question: step.text,
          imageUrl: step.imageUrl || null,
          options: step.options,
          expectedAnswer: step.expectedAnswer,
          selectedAnswer: selected,
          correct: selected === step.expectedAnswer,
        };
      });

      const gameSteps = steps.filter((s) => s.type === "game");
      const gameScore = {
        correct: gameSteps.filter((s) => answers[s.id] === s.expectedAnswer).length,
        total: gameSteps.length,
      };

      const payload = {
        sessionId,
        language,
        scenarios,
        faceTracking: { ...face.summary, flag },
        gameScore,
        videoConsent,
        sessionVideoUrl,
      };

      const res = await fetch("/api/culture-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save the session.");
      }

      setResult({ flag, gameScore, summary: face.summary });
      setStage("results");
    } catch (err) {
      console.error("Culture session submit error:", err);
      setErrorMsg(t.saveError);
      setStage("error");
    }
  }

  const isPictureStep = currentStep?.type === "picture";
  const nextEnabled = currentStep ? !!answers[currentStep.id] : false;

  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f6f7f4" }}>
      <header
        style={{
          background: "#10251f",
          color: "#fff",
          padding: "20px clamp(18px, 4vw, 44px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "none",
              color: "#91d6cd",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.9rem",
              fontWeight: 500,
              padding: 0,
            }}
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ScanFace size={22} style={{ color: "#91d6cd" }} />
            <h1 style={{ margin: 0, fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)", fontWeight: 700 }}>
              Cultural Face Screen
            </h1>
          </div>
        </div>
      </header>

      <div dir={dir} style={{ flex: 1, padding: "40px clamp(18px, 4vw, 44px)", maxWidth: "760px", width: "100%", margin: "0 auto" }}>
        {stage === "setup" && (
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t.setupTitle}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.5 }}>{t.setupDescription}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>{t.languageLabel}</span>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {supportedCultureLanguages.map((code) => {
                  const isSel = language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      style={{
                        ...cultureCardStyle,
                        cursor: "pointer",
                        font: "inherit",
                        borderColor: isSel ? "var(--teal)" : "var(--line)",
                        background: isSel ? "rgba(15,118,110,0.08)" : "#ffffff",
                      }}
                    >
                      <strong style={{ color: isSel ? "var(--teal-dark)" : "var(--ink)" }}>
                        {cultureTests[code].nativeLabel}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t.available}</span>
                    </button>
                  );
                })}
                {COMING_SOON.map((l) => (
                  <div key={l.code} style={{ ...cultureCardStyle, opacity: 0.5 }}>
                    <strong>{l.label}</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t.comingSoon}</span>
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && <p style={{ color: "var(--red)", fontSize: "0.85rem" }}>{errorMsg}</p>}

            <button onClick={handleSetupContinue} style={primaryButtonStyle}>
              {t.continue}
            </button>
          </div>
        )}

        {stage === "consent" && sessionContent && (
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t.consentTitle}</h2>

            <div style={disclaimerStyle}>
              <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
              <p style={{ margin: 0, fontSize: "0.88rem", color: "#92400e", lineHeight: 1.5 }}>{t.consentDisclaimer}</p>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>{t.consentDescription}</p>

            <label style={toggleRowStyle}>
              <input
                type="checkbox"
                checked={videoConsent}
                onChange={(e) => setVideoConsent(e.target.checked)}
                style={{ minHeight: "auto", width: "18px", height: "18px" }}
              />
              {t.videoConsent}
            </label>

            {modelStatus === "error" && <p style={{ color: "var(--red)", fontSize: "0.85rem" }}>{modelError}</p>}
            {errorMsg && <p style={{ color: "var(--red)", fontSize: "0.85rem" }}>{errorMsg}</p>}

            <button
              onClick={handleStartSession}
              disabled={modelStatus !== "ready"}
              style={{ ...primaryButtonStyle, opacity: modelStatus === "ready" ? 1 : 0.6 }}
            >
              {modelStatus === "ready" ? (
                t.start
              ) : (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t.preparing}
                </>
              )}
            </button>
          </div>
        )}

        {stage === "session" && currentStep && (
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--teal-dark)", textTransform: "uppercase" }}>
                {t.stepOf(stepIndex + 1, steps.length)}
              </span>
              {isPictureStep && isTracking && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--muted)" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--red)" }} />
                  {t.recording}
                </span>
              )}
            </div>

            {/* The webcam box is mounted for the whole picture step (its ref
                must exist before recording so startTracking can attach the
                stream), but it stays black until the patient starts recording —
                the camera only turns on then. The canvas is a purely visual
                overlay for the live preview; MediaRecorder (in useFaceTracking)
                records the raw camera MediaStream directly, so nothing drawn
                here ever reaches the saved video file. */}
            {isPictureStep && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                {/* The border lives on this wrapper, not on the video/canvas
                    themselves — if only the video had a border, its content-box
                    (where object-fit:cover actually renders) would be a few
                    pixels smaller than the canvas's, and the drawn landmark
                    dots would be systematically offset from the real features
                    they're tracking. Giving video and canvas identical,
                    border-free 100%-of-wrapper boxes keeps them in registration. */}
                <div style={{ position: "relative", width: "220px", height: "165px", border: "2px solid var(--teal)", borderRadius: "12px" }}>
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "12px", objectFit: "cover", background: "#000" }}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "12px",
                      objectFit: "cover",
                      pointerEvents: "none",
                      visibility: overlayEnabled ? "visible" : "hidden",
                    }}
                  />
                </div>
                <label style={{ ...toggleRowStyle, width: "auto", padding: "6px 12px", fontSize: "0.78rem" }}>
                  <input
                    type="checkbox"
                    checked={overlayEnabled}
                    onChange={(e) => setOverlayEnabled(e.target.checked)}
                    style={{ minHeight: "auto", width: "16px", height: "16px" }}
                  />
                  {t.trackingMarkers}
                </label>
              </div>
            )}

            {currentStep.imageUrl && (
              <img
                src={currentStep.imageUrl}
                alt=""
                style={{ width: "100%", maxWidth: "520px", borderRadius: "12px", alignSelf: "center", border: "1px solid var(--line)" }}
              />
            )}

            <p style={{ fontSize: "1rem", color: "var(--ink)", fontWeight: 600, textAlign: "center" }}>{currentStep.text}</p>

            <button
              onClick={() => handleSpeak(currentStep.text, sessionContent.voiceLocale)}
              style={{ ...secondaryButtonStyle, alignSelf: "center" }}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isSpeaking ? t.stopVoice : t.listen}
            </button>

            {isPictureStep ? (
              <AudioRecorder
                key={currentStep.id}
                lang={language}
                maxDurationSeconds={60}
                instruction={t.audioInstruction}
                onConfirm={handleAudioConfirm}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
              />
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
                {currentStep.options.map((option) => {
                  const selected = answers[currentStep.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleSelectOption(option)}
                      style={{
                        minWidth: "64px",
                        padding: "14px 22px",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: selected ? "2px solid var(--teal)" : "1px solid var(--line)",
                        background: selected ? "var(--teal)" : "#ffffff",
                        color: selected ? "#ffffff" : "var(--ink)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {errorMsg && <p style={{ color: "var(--red)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>{errorMsg}</p>}

            <button
              onClick={handleNextStep}
              disabled={!nextEnabled}
              style={{ ...primaryButtonStyle, opacity: nextEnabled ? 1 : 0.5 }}
            >
              {stepIndex < steps.length - 1 ? t.next : t.finish}
            </button>
          </div>
        )}

        {stage === "submitting" && (
          <div style={{ ...cardStyle, alignItems: "center", textAlign: "center" }}>
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--teal)" }} />
            <p style={{ color: "var(--muted)" }}>{t.saving}</p>
          </div>
        )}

        {stage === "results" && result && (
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t.resultsTitle}</h2>

            <div
              style={{
                background: FLAG_COLORS[result.flag.severity]?.bg || "#f1f5f9",
                border: `1px solid ${FLAG_COLORS[result.flag.severity]?.border || "#cbd5e1"}`,
                color: FLAG_COLORS[result.flag.severity]?.text || "var(--ink)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>{result.flag.level}</strong>
              <ul style={{ margin: 0, paddingInlineStart: "18px", fontSize: "0.85rem" }}>
                {result.flag.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--ink)", fontSize: "0.95rem", fontWeight: 600 }}>
              <CheckCircle size={18} style={{ color: "var(--teal)" }} />
              {t.correctAnswers(result.gameScore.correct, result.gameScore.total)}
            </div>

            {/* Supporting measurements behind the flag above — only shown if
                tracking actually produced data (not, e.g., a denied-camera
                session). Secondary/muted styling on purpose: heuristic
                numbers, not a diagnostic score. */}
            {result.summary && typeof result.summary.trackingQuality === "number" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)" }}>Session measurements</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
                  {FACE_METRICS.map((m) => (
                    <div key={m.key} style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "8px 10px", background: "#f9fafa" }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>{m.format(result.summary[m.key])}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "2px" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>{t.transcriptNote}</p>

            <button onClick={() => router.push("/")} style={primaryButtonStyle}>
              {t.back}
            </button>
          </div>
        )}

        {stage === "error" && (
          <div style={cardStyle}>
            <h2 style={titleStyle}>{t.errorTitle}</h2>
            <p style={{ color: "var(--red)", fontSize: "0.9rem" }}>{errorMsg}</p>
            <button onClick={() => router.push("/")} style={primaryButtonStyle}>
              {t.back}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: "16px",
  padding: "32px",
  boxShadow: "var(--shadow)",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const titleStyle = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--teal-dark)",
  margin: 0,
};

const cultureCardStyle = {
  border: "1px solid var(--line)",
  borderRadius: "10px",
  padding: "14px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: "120px",
};

const disclaimerStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: "12px",
  padding: "14px 18px",
};

const toggleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#f7f9f8",
  border: "1px solid var(--line)",
  borderRadius: "8px",
  padding: "12px 14px",
  fontSize: "0.88rem",
  color: "var(--ink)",
  fontWeight: 500,
};

const primaryButtonStyle = {
  background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 24px",
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const secondaryButtonStyle = {
  background: "transparent",
  color: "var(--teal)",
  border: "1px solid var(--teal)",
  borderRadius: "8px",
  padding: "10px 18px",
  fontSize: "0.88rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
