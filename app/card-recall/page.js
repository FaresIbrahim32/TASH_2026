"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Volume2, VolumeX, Layers } from "lucide-react";
import {
  BOARD_SIZE,
  STAGES,
  MAX_ATTEMPTS_PER_STAGE,
  ENCODE_REVEAL_MS,
  ENCODE_GAP_MS,
  FEEDBACK_MS,
  buildStage,
  cardRecallUI,
  CARD_RECALL_LANGUAGES,
} from "../lib/cardRecallContent";

const ROUND_RESULT_MS = 1800;

/** Abstract shape glyphs. Shape carries identity; colour is a secondary cue. */
function SymbolGlyph({ id, color, size = 56 }) {
  const common = { fill: color };
  let shape = null;

  if (id === "circle") shape = <circle cx="50" cy="50" r="32" {...common} />;
  else if (id === "square") shape = <rect x="20" y="20" width="60" height="60" rx="6" {...common} />;
  else if (id === "triangle") shape = <polygon points="50,18 84,78 16,78" {...common} />;
  else if (id === "diamond") shape = <polygon points="50,14 86,50 50,86 14,50" {...common} />;
  else if (id === "star")
    shape = <polygon points="50,14 59,39 86,39 64,55 73,81 50,65 27,81 36,55 14,39 41,39" {...common} />;
  else if (id === "hexagon") shape = <polygon points="50,14 81,32 81,68 50,86 19,68 19,32" {...common} />;
  else if (id === "plus")
    shape = (
      <g {...common}>
        <rect x="38" y="16" width="24" height="68" rx="4" />
        <rect x="16" y="38" width="68" height="24" rx="4" />
      </g>
    );
  else if (id === "chevron") shape = <polygon points="50,16 86,50 72,64 50,42 28,64 14,50" {...common} />;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {shape}
    </svg>
  );
}

const shell = {
  minHeight: "100vh",
  background: "#f6f7f4",
  display: "flex",
  flexDirection: "column",
};

const panel = {
  background: "#fff",
  border: "1px solid var(--line, #e5e7eb)",
  borderRadius: "14px",
  padding: "clamp(18px, 3vw, 30px)",
  width: "100%",
};

const primaryBtn = {
  background: "var(--teal, #0f766e)",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "14px 28px",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtn = {
  background: "#fff",
  color: "var(--teal, #0f766e)",
  border: "1px solid var(--teal, #0f766e)",
  borderRadius: "10px",
  padding: "12px 22px",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * The card grid. Defined at module scope on purpose: a component declared
 * inside the page body gets a fresh identity on every render, which makes React
 * unmount and remount the whole board each time a card opens or feedback
 * changes — killing the CSS transitions and thrashing the DOM.
 */
function Board({ currentStage, revealedPosition, feedback, recallIndex, ui, interactive, onCardClick }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "clamp(8px, 2vw, 16px)",
        maxWidth: "560px",
        margin: "0 auto",
      }}
    >
      {Array.from({ length: BOARD_SIZE }).map((_, position) => {
        const placement = currentStage?.placements.find((p) => p.position === position);
        const isOpen = revealedPosition === position && placement;
        const isFeedbackTarget = feedback && feedback.chosen === position;
        const isCorrectSlot = feedback && !feedback.correct && feedback.correctPosition === position;

        let border = "2px solid #d8dcd6";
        let background = "#fff";
        if (isFeedbackTarget) {
          border = feedback.correct ? "3px solid #16a34a" : "3px solid #dc2626";
          background = feedback.correct ? "#f0fdf4" : "#fef2f2";
        } else if (isCorrectSlot) {
          border = "3px dashed #16a34a";
          background = "#f0fdf4";
        }

        return (
          <button
            key={position}
            type="button"
            onClick={() => onCardClick(position)}
            disabled={!interactive}
            aria-label={`${ui.cardLabel} ${position + 1}`}
            style={{
              aspectRatio: "3 / 4",
              borderRadius: "12px",
              border,
              background,
              cursor: interactive ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border 120ms ease, background 120ms ease",
              padding: 0,
            }}
          >
            {isOpen ? (
              <SymbolGlyph id={placement.symbolId} color={placement.color} size={52} />
            ) : isCorrectSlot ? (
              <SymbolGlyph id={currentStage.recallOrder[recallIndex]?.symbolId} color="#16a34a" size={40} />
            ) : (
              <span style={{ fontSize: "1.6rem", color: "#cbd5cb", fontWeight: 700 }}>?</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MetricTile({ label, value, sub, primary }) {
  return (
    <div
      style={{
        border: primary ? "1px solid var(--teal, #0f766e)" : "1px solid var(--line, #e5e7eb)",
        borderRadius: "10px",
        padding: primary ? "16px 18px" : "10px 14px",
        background: primary ? "#f0fdfa" : "#fff",
        minWidth: primary ? "230px" : "140px",
        flex: primary ? "1 1 230px" : "1 1 140px",
      }}
    >
      <div
        style={{
          fontSize: primary ? "1.85rem" : "1.15rem",
          fontWeight: 700,
          color: primary ? "var(--teal, #0f766e)" : "var(--ink, #10251f)",
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: primary ? "0.85rem" : "0.76rem", fontWeight: primary ? 600 : 400, color: "var(--ink, #10251f)", marginTop: "2px" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: "0.72rem", color: "var(--muted, #6b7280)", marginTop: "3px" }}>{sub}</div>
      )}
    </div>
  );
}

export default function CardRecallPage() {
  const router = useRouter();

  const [stage, setStage] = useState("setup"); // setup | instructions | playing | submitting | results | error
  const [language, setLanguage] = useState("en");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Round state
  const [stageIndex, setStageIndex] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [currentStage, setCurrentStage] = useState(null);
  const [phase, setPhase] = useState("encoding"); // encoding | recall | feedback | roundResult
  const [revealedPosition, setRevealedPosition] = useState(null);
  const [recallIndex, setRecallIndex] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, chosen, correctPosition }
  const [roundMessage, setRoundMessage] = useState("");

  // Accumulators
  const [responses, setResponses] = useState([]);
  const [stageStats, setStageStats] = useState([]);
  const [result, setResult] = useState(null);

  const responseStartRef = useRef(0);
  const attemptErrorsRef = useRef(0);
  const activeAudioRef = useRef(null);
  const sessionIdRef = useRef("");
  const startedAtRef = useRef(0);

  const ui = cardRecallUI[language] || cardRecallUI.en;
  const dir = ui.direction;

  const stopAllSpeech = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => () => stopAllSpeech(), [stopAllSpeech]);

  // Mirrors app/culture-connect/page.js: ElevenLabs via /api/tts, falling back
  // to the browser's SpeechSynthesis when the key is absent or the call fails.
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
        const prefix = locale.split("-")[0].toLowerCase();
        const matched = voices.find(
          (v) => v.lang.toLowerCase() === locale.toLowerCase() || v.lang.toLowerCase().startsWith(prefix)
        );
        if (matched) utterance.voice = matched;
      } catch {
        /* voice matching is best-effort */
      }
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    };

    try {
      let langPrefix = locale.split("-")[0];
      if (langPrefix === "zh") langPrefix = "zh-TW";
      const res = await fetch(
        `/api/tts?language=${encodeURIComponent(langPrefix)}&text=${encodeURIComponent(text)}`
      );
      if (!res.ok) return playNativeSpeech();
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
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
    } catch {
      playNativeSpeech();
    }
  }

  function handleBegin() {
    stopAllSpeech();
    sessionIdRef.current = `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    startedAtRef.current = Date.now();
    setResponses([]);
    setStageStats([]);
    setStageIndex(0);
    setAttempt(1);
    attemptErrorsRef.current = 0;
    setCurrentStage(buildStage(STAGES[0]));
    setPhase("encoding");
    setRecallIndex(0);
    setFeedback(null);
    setStage("playing");
  }

  // Encoding: open each card in turn, then hand over to the recall phase.
  useEffect(() => {
    if (stage !== "playing" || phase !== "encoding" || !currentStage) return;

    const timers = [];
    let t = 0;
    currentStage.encodeOrder.forEach((placement) => {
      timers.push(setTimeout(() => setRevealedPosition(placement.position), t));
      t += ENCODE_REVEAL_MS;
      timers.push(setTimeout(() => setRevealedPosition(null), t));
      t += ENCODE_GAP_MS;
    });
    timers.push(
      setTimeout(() => {
        setRevealedPosition(null);
        setRecallIndex(0);
        setFeedback(null);
        setPhase("recall");
        responseStartRef.current = Date.now();
      }, t)
    );

    return () => timers.forEach(clearTimeout);
  }, [stage, phase, currentStage, attempt]);

  const finishAttempt = useCallback(() => {
    const errors = attemptErrorsRef.current;
    const pairs = currentStage.pairs;

    if (errors === 0) {
      // Round cleared — bank the stat and advance.
      setStageStats((prev) => [
        ...prev,
        // firstAttemptErrors/totalErrors are recomputed from `responses` at
        // submit time; the values here are placeholders.
        { stage: stageIndex, pairs, attempts: attempt, firstAttemptErrors: 0, totalErrors: 0, completed: true },
      ]);
      setRoundMessage(ui.roundComplete);
      setPhase("roundResult");
      return;
    }

    if (attempt < MAX_ATTEMPTS_PER_STAGE) {
      setRoundMessage(ui.retryRound);
      setPhase("roundResult");
      return;
    }

    // Out of attempts — the activity ends here.
    setStageStats((prev) => [
      ...prev,
      { stage: stageIndex, pairs, attempts: attempt, firstAttemptErrors: 0, totalErrors: errors, completed: false },
    ]);
    setRoundMessage(ui.sessionComplete);
    setPhase("roundResult");
  }, [attempt, currentStage, stageIndex, ui]);

  // Brief pause after each attempt, then either re-present, advance, or finish.
  useEffect(() => {
    if (stage !== "playing" || phase !== "roundResult") return;

    const timer = setTimeout(() => {
      const cleared = attemptErrorsRef.current === 0;
      const outOfAttempts = attempt >= MAX_ATTEMPTS_PER_STAGE;

      if (cleared) {
        const nextIndex = stageIndex + 1;
        if (nextIndex < STAGES.length) {
          setStageIndex(nextIndex);
          setAttempt(1);
          attemptErrorsRef.current = 0;
          setCurrentStage(buildStage(STAGES[nextIndex]));
          setPhase("encoding");
        } else {
          setStage("submitting");
        }
      } else if (!outOfAttempts) {
        setAttempt((a) => a + 1);
        attemptErrorsRef.current = 0;
        setPhase("encoding");
      } else {
        setStage("submitting");
      }
    }, ROUND_RESULT_MS);

    return () => clearTimeout(timer);
  }, [stage, phase, attempt, stageIndex]);

  // Advance through the recall queue after each answer's feedback.
  useEffect(() => {
    if (stage !== "playing" || phase !== "feedback" || !currentStage) return;

    const timer = setTimeout(() => {
      const next = recallIndex + 1;
      if (next < currentStage.recallOrder.length) {
        setRecallIndex(next);
        setFeedback(null);
        setPhase("recall");
        responseStartRef.current = Date.now();
      } else {
        setFeedback(null);
        finishAttempt();
      }
    }, FEEDBACK_MS);

    return () => clearTimeout(timer);
  }, [stage, phase, recallIndex, currentStage, finishAttempt]);

  function handleCardClick(position) {
    if (stage !== "playing" || phase !== "recall" || !currentStage) return;

    const target = currentStage.recallOrder[recallIndex];
    const correct = position === target.position;
    const latencyMs = Math.max(0, Date.now() - responseStartRef.current);

    if (!correct) attemptErrorsRef.current += 1;

    setResponses((prev) => [
      ...prev,
      {
        stage: stageIndex,
        pairs: currentStage.pairs,
        attempt,
        symbolId: target.symbolId,
        correctPosition: target.position,
        chosenPosition: position,
        correct,
        latencyMs,
      },
    ]);

    setFeedback({ correct, chosen: position, correctPosition: target.position });
    setPhase("feedback");
  }

  // Compute the summary and persist the session.
  useEffect(() => {
    if (stage !== "submitting") return;

    const totalResponses = responses.length;
    const correctResponses = responses.filter((r) => r.correct).length;
    const completedStages = stageStats.filter((s) => s.completed);
    const firstAttemptErrors = responses.filter((r) => r.attempt === 1 && !r.correct).length;
    // First Attempt Memory Score: correct placements made on a round's first
    // presentation. This is CANTAB PAL's headline outcome measure, so it is
    // recorded explicitly rather than left to be inferred from the error count.
    const firstAttemptMemoryScore = responses.filter((r) => r.attempt === 1 && r.correct).length;
    const meanLatencyMs =
      totalResponses > 0 ? responses.reduce((sum, r) => sum + r.latencyMs, 0) / totalResponses : 0;

    const summary = {
      highestPairsReached: completedStages.length ? Math.max(...completedStages.map((s) => s.pairs)) : 0,
      stagesCompleted: completedStages.length,
      totalResponses,
      correctResponses,
      accuracyPct: totalResponses ? Math.round((correctResponses / totalResponses) * 100) : 0,
      totalErrors: totalResponses - correctResponses,
      firstAttemptErrors,
      firstAttemptMemoryScore,
      trialsToCriterion: stageStats.reduce((sum, s) => sum + s.attempts, 0),
      meanLatencyMs: Math.round(meanLatencyMs),
    };

    // Normalise the per-round stats the reducer above left partially filled.
    const cleanStats = stageStats.map((s) => ({
      stage: s.stage,
      pairs: s.pairs,
      attempts: s.attempts,
      firstAttemptErrors: responses.filter((r) => r.stage === s.stage && r.attempt === 1 && !r.correct).length,
      totalErrors: responses.filter((r) => r.stage === s.stage && !r.correct).length,
      completed: s.completed,
    }));

    const payload = {
      sessionId: sessionIdRef.current,
      language,
      responses,
      stageStats: cleanStats,
      summary,
      durationMs: Date.now() - startedAtRef.current,
    };

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/card-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.message || ui.saveFailed);
        }
        setResult({ summary, stageStats: cleanStats, responses });
        setStage("results");
      } catch {
        if (cancelled) return;
        setErrorMsg(ui.saveFailed);
        setResult({ summary, stageStats: cleanStats, responses });
        setStage("results");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stage, responses, stageStats, language, ui]);


  const target = currentStage?.recallOrder?.[recallIndex];

  // Denominator for the first-attempt memory score: every round that was
  // started contributes one first presentation of each of its symbols.
  const famsMax = (result?.stageStats || []).reduce((sum, s) => sum + s.pairs, 0);

  // Responses bucketed by round + attempt, preserving answer order.
  const answerGroups = [];
  for (const r of result?.responses || []) {
    const last = answerGroups[answerGroups.length - 1];
    if (last && last.stage === r.stage && last.attempt === r.attempt) {
      last.items.push(r);
      if (r.correct) last.correct += 1;
    } else {
      answerGroups.push({ stage: r.stage, attempt: r.attempt, items: [r], correct: r.correct ? 1 : 0 });
    }
  }

  return (
    <main style={shell}>
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
            <Layers size={22} style={{ color: "#91d6cd" }} />
            <h1 style={{ margin: 0, fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)", fontWeight: 700 }}>
              Card Recall
            </h1>
          </div>
        </div>
      </header>

      <div
        dir={dir}
        style={{
          flex: 1,
          padding: "40px clamp(18px, 4vw, 44px)",
          maxWidth: "760px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* SETUP */}
        {stage === "setup" && (
          <div style={panel}>
            <h1 style={{ fontSize: "1.4rem", marginBottom: "6px", color: "var(--ink, #10251f)" }}>{ui.setupTitle}</h1>
            <p style={{ color: "var(--muted, #6b7280)", marginBottom: "22px" }}>{ui.tagline}</p>

            <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>{ui.languageLabel}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "26px" }}>
              {CARD_RECALL_LANGUAGES.map((code) => {
                const entry = cardRecallUI[code];
                const active = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    style={{
                      ...ghostBtn,
                      background: active ? "var(--teal, #0f766e)" : "#fff",
                      color: active ? "#fff" : "var(--teal, #0f766e)",
                    }}
                  >
                    {entry.nativeLabel}
                  </button>
                );
              })}
            </div>

            <button type="button" style={primaryBtn} onClick={() => setStage("instructions")}>
              {ui.startSetup}
            </button>
          </div>
        )}

        {/* INSTRUCTIONS */}
        {stage === "instructions" && (
          <div style={panel}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "12px", color: "var(--ink, #10251f)" }}>
              {ui.instructionsTitle}
            </h2>
            <p style={{ lineHeight: 1.7, marginBottom: "18px" }}>{ui.instructions}</p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
              <button
                type="button"
                style={ghostBtn}
                onClick={() => handleSpeak(ui.instructions, ui.voiceLocale)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />} {ui.listen}
                </span>
              </button>
            </div>

            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--muted, #6b7280)",
                background: "#f6f7f4",
                border: "1px solid var(--line, #e5e7eb)",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "22px",
              }}
            >
              {ui.unscoredNote}
            </p>

            <button type="button" style={primaryBtn} onClick={handleBegin}>
              {ui.begin}
            </button>
          </div>
        )}

        {/* PLAYING */}
        {stage === "playing" && currentStage && (
          <div style={panel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "18px",
                fontSize: "0.85rem",
                color: "var(--muted, #6b7280)",
              }}
            >
              <span>
                {ui.roundLabel} {stageIndex + 1} {ui.ofLabel} {STAGES.length}
              </span>
              <span>
                {ui.attemptLabel} {attempt} / {MAX_ATTEMPTS_PER_STAGE}
              </span>
            </div>

            {phase === "encoding" && (
              <h2 style={{ textAlign: "center", fontSize: "1.15rem", marginBottom: "20px", color: "var(--ink, #10251f)" }}>
                {ui.watchTitle}
              </h2>
            )}

            {(phase === "recall" || phase === "feedback") && target && (
              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <p style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "10px", color: "var(--ink, #10251f)" }}>
                  {ui.recallPrompt}
                </p>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "10px",
                    border: "2px solid var(--line, #e5e7eb)",
                    borderRadius: "12px",
                    background: "#fff",
                  }}
                >
                  <SymbolGlyph id={target.symbolId} color={target.color} size={56} />
                </div>
                {feedback && (
                  <p
                    style={{
                      marginTop: "10px",
                      fontWeight: 700,
                      color: feedback.correct ? "#16a34a" : "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {feedback.correct ? <CheckCircle size={17} /> : <XCircle size={17} />}
                    {feedback.correct ? ui.correct : ui.incorrect}
                  </p>
                )}
              </div>
            )}

            {phase === "roundResult" && (
              <h2 style={{ textAlign: "center", fontSize: "1.15rem", marginBottom: "20px", color: "var(--ink, #10251f)" }}>
                {roundMessage}
              </h2>
            )}

            <Board
              currentStage={currentStage}
              revealedPosition={revealedPosition}
              feedback={feedback}
              recallIndex={recallIndex}
              ui={ui}
              interactive={phase === "recall"}
              onCardClick={handleCardClick}
            />
          </div>
        )}

        {/* SUBMITTING */}
        {stage === "submitting" && (
          <div style={{ ...panel, textAlign: "center" }}>
            <Loader2 className="animate-spin" size={30} style={{ color: "var(--teal, #0f766e)" }} />
            <p style={{ marginTop: "12px" }}>{ui.saving}</p>
          </div>
        )}

        {/* RESULTS */}
        {stage === "results" && result && (
          <div style={panel}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "18px", color: "var(--ink, #10251f)" }}>
              {ui.resultsTitle}
            </h2>
            {errorMsg && (
              <p
                style={{
                  color: "#991b1b",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  padding: "10px 12px",
                  marginBottom: "18px",
                }}
              >
                {errorMsg}
              </p>
            )}

            {/* Headline pair first, then the supporting numbers at half weight. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
              <MetricTile
                primary
                label={ui.mFams}
                value={`${result.summary.firstAttemptMemoryScore} / ${famsMax}`}
              />
              <MetricTile
                primary
                label={ui.mHighestRound}
                value={`${result.summary.stagesCompleted} / ${STAGES.length}`}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "26px" }}>
              <MetricTile
                label={ui.mAccuracy}
                value={`${result.summary.accuracyPct}%`}
                sub={`${result.summary.correctResponses} / ${result.summary.totalResponses} ${ui.mAccuracySub}`}
              />
              <MetricTile
                label={ui.mTotalErrors}
                value={`${result.summary.totalErrors}`}
                sub={ui.mTotalErrorsSub}
              />
              <MetricTile
                label={ui.mAvgResponse}
                value={`${(result.summary.meanLatencyMs / 1000).toFixed(1)}${ui.seconds}`}
              />
            </div>

            <h3 style={{ fontSize: "1rem", marginBottom: "10px", color: "var(--teal, #0f766e)" }}>{ui.perRoundTitle}</h3>
            <div style={{ overflowX: "auto", marginBottom: "26px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                <thead>
                  <tr style={{ background: "#f6f7f4" }}>
                    <th style={{ textAlign: "start", padding: "8px" }}>{ui.colRound}</th>
                    <th style={{ textAlign: "start", padding: "8px" }}>{ui.colSymbol}</th>
                    <th style={{ textAlign: "start", padding: "8px" }}>{ui.colAttemptsUsed}</th>
                    <th style={{ textAlign: "start", padding: "8px" }}>{ui.colErrors}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stageStats.map((s) => (
                    <tr key={s.stage} style={{ borderTop: "1px solid var(--line, #e5e7eb)" }}>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        {s.completed ? (
                          <CheckCircle size={15} style={{ color: "#16a34a", verticalAlign: "middle" }} />
                        ) : (
                          <XCircle size={15} style={{ color: "#dc2626", verticalAlign: "middle" }} />
                        )}{" "}
                        {ui.roundLabel} {s.stage + 1}
                        <span style={{ color: "var(--muted, #6b7280)", fontWeight: 600, marginInlineStart: "6px" }}>
                          {s.completed ? ui.resCleared : ui.resFailed}
                        </span>
                      </td>
                      <td style={{ padding: "8px" }}>{s.pairs}</td>
                      <td style={{ padding: "8px" }}>
                        {s.attempts} / {MAX_ATTEMPTS_PER_STAGE}
                      </td>
                      <td style={{ padding: "8px" }}>{s.totalErrors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: "1rem", marginBottom: "4px", color: "var(--teal, #0f766e)" }}>
              {ui.responsesTitle}
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--muted, #6b7280)", marginBottom: "12px" }}>
              {ui.legendMiss}
            </p>

            {/* Grouped by round then attempt: the per-attempt tallies are the
                learning curve, which a flat list of 30 chips hides entirely. */}
            <div style={{ marginBottom: "26px" }}>
              {answerGroups.map((group) => (
                <div key={`${group.stage}-${group.attempt}`} style={{ marginBottom: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      fontSize: "0.8rem",
                      marginBottom: "6px",
                    }}
                  >
                    <strong style={{ color: "var(--ink, #10251f)" }}>
                      {ui.roundLabel} {group.stage + 1} · {ui.attemptLabel} {group.attempt}
                    </strong>
                    <span style={{ color: group.correct === group.items.length ? "#16a34a" : "var(--muted, #6b7280)" }}>
                      {group.correct} / {group.items.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {group.items.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          border: `1px solid ${r.correct ? "#a7f3d0" : "#fecaca"}`,
                          background: r.correct ? "#f0fdf4" : "#fef2f2",
                          borderRadius: "8px",
                          padding: "5px 9px",
                          fontSize: "0.76rem",
                        }}
                      >
                        <SymbolGlyph id={r.symbolId} color={r.correct ? "#16a34a" : "#dc2626"} size={18} />
                        {r.correct ? (
                          <CheckCircle size={13} style={{ color: "#16a34a" }} />
                        ) : (
                          <span style={{ color: "#991b1b", fontWeight: 600 }}>
                            {r.chosenPosition + 1} &rarr; {r.correctPosition + 1}
                          </span>
                        )}
                        <span style={{ color: "var(--muted, #6b7280)" }}>
                          {(r.latencyMs / 1000).toFixed(1)}
                          {ui.seconds}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--muted, #6b7280)",
                background: "#f6f7f4",
                border: "1px solid var(--line, #e5e7eb)",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "22px",
              }}
            >
              {ui.unscoredNote}
            </p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" style={primaryBtn} onClick={() => setStage("setup")}>
                {ui.playAgain}
              </button>
              <button type="button" style={ghostBtn} onClick={() => router.push("/")}>
                {ui.backToDashboard}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
