"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Volume2, VolumeX, Layers } from "lucide-react";
import {
  BOARD_SIZE,
  STAGES,
  PRACTICE_PAIRS,
  MAX_ATTEMPTS_PER_STAGE,
  ENCODE_REVEAL_MS,
  ENCODE_GAP_MS,
  FEEDBACK_MS,
  buildStage,
  cardRecallUI,
  CARD_RECALL_LANGUAGES,
} from "../lib/cardRecallContent";

const ROUND_RESULT_MS = 1800;

/**
 * Abstract shape glyphs. Shape carries identity; colour is a secondary cue.
 *
 * Each path fills roughly 90% of the 100x100 viewBox. The shapes were
 * originally inset to about 64% of it, so a 52px glyph drew barely 33px of
 * visible ink — too small to read comfortably at the arm's length an older
 * patient holds a tablet.
 */
function SymbolGlyph({ id, color, size = 56 }) {
  // A number means pixels; a string is passed through, so callers can size a
  // glyph as a percentage of its card and have it track every breakpoint.
  const width = typeof size === "number" ? `${size}px` : size;
  const common = { fill: color };
  let shape = null;

  if (id === "circle") shape = <circle cx="50" cy="50" r="44" {...common} />;
  else if (id === "square") shape = <rect x="8" y="8" width="84" height="84" rx="8" {...common} />;
  else if (id === "triangle") shape = <polygon points="50,8 94,88 6,88" {...common} />;
  else if (id === "star")
    shape = (
      <polygon
        points="50,6 60.9,35 91.8,36.4 67.6,55.7 75.9,85.6 50,68.5 24.1,85.6 32.4,55.7 8.2,36.4 39.1,35"
        {...common}
      />
    );
  else if (id === "hexagon") shape = <polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5" {...common} />;
  else if (id === "plus")
    shape = (
      <g {...common}>
        <rect x="36" y="6" width="28" height="88" rx="5" />
        <rect x="6" y="36" width="88" height="28" rx="5" />
      </g>
    );
  else if (id === "droplet")
    shape = <path d="M50 6 C64 30 86 46 86 61 A36 36 0 0 1 14 61 C14 46 36 30 50 6 Z" {...common} />;
  else if (id === "arch") shape = <path d="M8 90 L8 50 A42 42 0 0 1 92 50 L92 90 Z" {...common} />;
  // Retired from SYMBOLS — `diamond` was a rotated square and `chevron` read as
  // a triangle — but still drawn so sessions recorded before the swap render
  // correctly in the results table and on the dashboard.
  else if (id === "diamond") shape = <polygon points="50,8 92,50 50,92 8,50" {...common} />;
  else if (id === "chevron") shape = <polygon points="50,12 92,50 74,68 50,45 26,68 8,50" {...common} />;

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width, height: "auto", aspectRatio: "1 / 1", display: "block" }}
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}

/**
 * A static three-panel illustration of the mechanic, shown on the instructions
 * screen. Patients who are elderly, tired, or not confident readers get far
 * more from seeing the task once than from a paragraph describing it, and a
 * static illustration costs nothing at run time.
 *
 * The flex rows mirror themselves under `dir="rtl"`, so the Arabic session
 * reads its three steps right-to-left without any extra handling.
 */
function DemoStrip({ ui }) {
  const miniBoard = (mode) => (
    <div style={{ display: "flex", gap: "5px" }}>
      {[0, 1, 2, 3].map((i) => {
        const isTarget = i === 1;
        const open = mode === "open" && isTarget;
        const marked = mode === "answer" && isTarget;
        return (
          <div
            key={i}
            style={{
              width: "32px",
              height: "42px",
              borderRadius: "6px",
              border: marked ? "2px solid #16a34a" : "2px solid #d8dcd6",
              background: marked ? "#f0fdf4" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {open || marked ? (
              <SymbolGlyph id="star" color={marked ? "#16a34a" : "#a16207"} size={24} />
            ) : (
              <span style={{ fontSize: "0.85rem", color: "#9aa5a0", fontWeight: 700 }}>?</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const steps = [
    { art: miniBoard("open"), text: ui.demoStep1 },
    {
      art: (
        <div
          style={{
            display: "inline-flex",
            border: "2px solid var(--line, #e5e7eb)",
            borderRadius: "8px",
            padding: "6px",
            background: "#fff",
          }}
        >
          <SymbolGlyph id="star" color="#a16207" size={30} />
        </div>
      ),
      text: ui.demoStep2,
    },
    { art: miniBoard("answer"), text: ui.demoStep3 },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "18px",
        justifyContent: "center",
        background: "#f6f7f4",
        border: "1px solid var(--line, #e5e7eb)",
        borderRadius: "10px",
        padding: "18px 14px",
        marginBottom: "20px",
      }}
    >
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            flex: "1 1 170px",
            maxWidth: "240px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            textAlign: "center",
          }}
        >
          <div style={{ minHeight: "46px", display: "flex", alignItems: "center" }}>{step.art}</div>
          <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.5, color: "var(--ink, #10251f)" }}>
            <strong style={{ color: "var(--teal, #0f766e)" }}>{i + 1}.</strong> {step.text}
          </p>
        </div>
      ))}
    </div>
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
      // Column count lives in globals.css so it can drop to 2 on a phone, where
      // four columns would shrink each card below a comfortable tap target.
      className="card-recall-board"
      style={{
        gap: "clamp(8px, 2vw, 16px)",
        maxWidth: "760px",
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
              borderRadius: "14px",
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
              <SymbolGlyph id={placement.symbolId} color={placement.color} size="58%" />
            ) : isCorrectSlot ? (
              <SymbolGlyph id={currentStage.recallOrder[recallIndex]?.symbolId} color="#16a34a" size="48%" />
            ) : (
              // #cbd5cb sat at roughly 1.6:1 against white — below what a
              // low-vision patient can resolve at all.
              <span style={{ fontSize: "2.2rem", color: "#9aa5a0", fontWeight: 700 }}>?</span>
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
  const [isPractice, setIsPractice] = useState(false);
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
    setIsPractice(true);
    setCurrentStage(buildStage(PRACTICE_PAIRS));
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

    // The warm-up never repeats and banks no stats: it exists so the patient
    // has grasped the mechanic before round 1 starts measuring anything.
    if (isPractice) {
      setRoundMessage(ui.practiceComplete);
      setPhase("roundResult");
      return;
    }

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
  }, [attempt, currentStage, stageIndex, isPractice, ui]);

  // Brief pause after each attempt, then either re-present, advance, or finish.
  useEffect(() => {
    if (stage !== "playing" || phase !== "roundResult") return;

    const timer = setTimeout(() => {
      if (isPractice) {
        setIsPractice(false);
        setStageIndex(0);
        setAttempt(1);
        attemptErrorsRef.current = 0;
        setCurrentStage(buildStage(STAGES[0]));
        setPhase("encoding");
        return;
      }

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
  }, [stage, phase, attempt, stageIndex, isPractice]);

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

    // Practice answers drive the on-screen feedback but never enter the record,
    // so none of the reported measures include them.
    if (!isPractice) {
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
    }

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
          // The board needs the extra room; every other screen is text and
          // reads better at a narrower measure.
          maxWidth: stage === "playing" ? "920px" : "760px",
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

            {/* Clinician-facing. The patient never sees this screen, so it can
                name the reference instrument; the instructions screen that the
                patient does see stays plain and procedural. */}
            <div
              style={{
                border: "1px solid var(--line, #e5e7eb)",
                borderRadius: "10px",
                background: "#f6f7f4",
                padding: "16px 18px",
                marginBottom: "26px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--teal, #0f766e)",
                }}
              >
                {ui.aboutTitle}
              </h2>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--muted, #6b7280)" }}>
                {ui.aboutText}
              </p>
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

            <DemoStrip ui={ui} />

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
              {isPractice ? (
                <span style={{ fontWeight: 600, color: "var(--teal, #0f766e)" }}>{ui.practiceLabel}</span>
              ) : (
                <>
                  <span>
                    {ui.roundLabel} {stageIndex + 1} {ui.ofLabel} {STAGES.length}
                  </span>
                  <span>
                    {ui.attemptLabel} {attempt} / {MAX_ATTEMPTS_PER_STAGE}
                  </span>
                </>
              )}
            </div>

            {isPractice && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "0.82rem",
                  color: "var(--muted, #6b7280)",
                  background: "#f6f7f4",
                  border: "1px solid var(--line, #e5e7eb)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  marginBottom: "16px",
                }}
              >
                {ui.practiceNote}
              </p>
            )}

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
                  <SymbolGlyph id={target.symbolId} color={target.color} size={92} />
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
