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

// Languages that exist as content but aren't wired up for a session yet.
const COMING_SOON = [
  { code: "ar", label: "العربية" },
  { code: "zh-TW", label: "中文" },
];

export default function CultureConnectPage() {
  const router = useRouter();
  const { modelStatus, modelError, isTracking, startTracking, stopTracking } = useFaceTracking();

  const [stage, setStage] = useState("setup"); // setup | consent | session | submitting | results | error
  const [language, setLanguage] = useState("en");
  const [videoConsent, setVideoConsent] = useState(true);
  const [sessionContent, setSessionContent] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // picture -> audio dataURL, game -> selected option
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef(null);
  const activeAudioRef = useRef(null);
  const sessionIdRef = useRef(null);
  const faceResultRef = useRef(null); // { summary, flag, videoBlob } captured when the picture step ends

  const t = cultureUI[language] || cultureUI.en;

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

  // Start webcam + face tracking when the session begins (step 0 is always the
  // picture-description). Tracking is stopped the moment that step ends (see
  // handleNextStep) — the game steps that follow are a silent click quiz.
  useEffect(() => {
    if (stage !== "session" || !videoRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await startTracking(videoRef.current, { durationSec: 60, recordVideo: videoConsent });
      } catch (err) {
        console.error("Camera/mic access error:", err);
        if (!cancelled) {
          setErrorMsg(t.cameraError);
          setStage("consent");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

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
      const langPrefix = locale.split("-")[0];
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

  async function handleSetupContinue() {
    setErrorMsg("");

    // One facial-behavior baseline per login account (this is a per-user tool —
    // no patient identifier). The first session ever run becomes the baseline;
    // later sessions compare against it.
    try {
      const res = await fetch("/api/culture-baseline");
      const data = await res.json();
      setBaseline(data.baseline || null);
    } catch (err) {
      console.warn("Could not fetch existing baseline, proceeding without one:", err);
      setBaseline(null);
    }

    setSessionContent(pickCultureSession(language));
    setStage("consent");
  }

  function handleStartSession() {
    setErrorMsg("");
    setStepIndex(0);
    setAnswers({});
    faceResultRef.current = null;
    sessionIdRef.current = `culture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setStage("session");
  }

  // Picture step: store the recorded audio dataURL.
  function handleAudioConfirm(base64) {
    if (!currentStep) return;
    setAnswers((prev) => ({ ...prev, [currentStep.id]: base64 }));
  }

  // Game step: store the clicked option.
  function handleSelectOption(option) {
    if (!currentStep) return;
    setAnswers((prev) => ({ ...prev, [currentStep.id]: option }));
  }

  async function handleNextStep() {
    stopAllSpeech();

    // Picture step ends -> stop the webcam + face tracking and capture the
    // flag/video now. Everything after this is a silent, untracked click quiz.
    if (currentStep.type === "picture") {
      faceResultRef.current = await stopTracking(baseline);
      setStepIndex((i) => i + 1);
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }

    setStage("submitting");
    await submitSession();
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

      setResult({ flag, gameScore });
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

      <div style={{ flex: 1, padding: "40px clamp(18px, 4vw, 44px)", maxWidth: "760px", width: "100%", margin: "0 auto" }}>
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
                        textAlign: "left",
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

            {/* The webcam preview only exists during the (tracked) picture step. */}
            {isPictureStep && (
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: "220px", height: "165px", borderRadius: "12px", objectFit: "cover", border: "2px solid var(--teal)", alignSelf: "center", background: "#000" }}
              />
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
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.85rem" }}>
                {result.flag.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--ink)", fontSize: "0.95rem", fontWeight: 600 }}>
              <CheckCircle size={18} style={{ color: "var(--teal)" }} />
              {t.correctAnswers(result.gameScore.correct, result.gameScore.total)}
            </div>

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
