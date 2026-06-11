"use client";

import { useState, useEffect } from "react";
import {
  Check,
  ClipboardList,
  Languages,
  Square,
  Volume2,
} from "lucide-react";
import { languageTests, supportedFirstLanguages } from "../lib/tests";

const emptyForm = {
  patient: {
    identifier: "",
    age: "",
    gender: "",
    countryOrRegion: "",
    firstLanguage: "",
    interpreterUsed: false,
    educationYears: "",
    culturalContext: "",
  },
  answers: {
    wordRecallEnglish: "",
    wordRecallFirstLanguage: "",
    clockNotesEnglish: "",
    clockNotesFirstLanguage: "",
    clockDrawingDataUrl: "",
    recallScore: "",
    clockScore: "",
  },
};

function speakInstruction(text, locale) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function VoiceButton({ text, locale, label = "Play instruction" }) {
  return (
    <button
      className="voiceButton"
      type="button"
      onClick={() => speakInstruction(text, locale)}
      title={label}
    >
      <Volume2 size={17} />
      {label}
    </button>
  );
}

function formatWords(words, language) {
  if (language === "ar") {
    return words.join("، ");
  }

  if (language === "zh-TW") {
    return words.join("、");
  }

  return words.join(", ");
}

function hydrateRegistration(text, words, language) {
  return text.replace("{words}", formatWords(words, language));
}

function PatientTaskPanel({ test, title }) {
  const ui = test.ui ?? languageTests.en.ui;
  const wordList = test.wordLists?.[0] ?? [];
  const registrationText = hydrateRegistration(test.tasks?.registration ?? "", wordList, test.code);

  if (!test.tasks) {
    return (
      <section className="taskPanel">
        <div className="panelHeader">
          <div>
            <p>{title}</p>
            <h2>{test.nativeLabel}</h2>
          </div>
        </div>
        <div className="notice">This language is not ready yet.</div>
      </section>
    );
  }

  return (
    <section className="taskPanel" dir={test.direction}>
      <div className="panelHeader">
        <div>
          <p>{title}</p>
          <h2>{test.nativeLabel}</h2>
        </div>
        <button className="stopButton" type="button" onClick={stopSpeech} title={ui.stopVoice} aria-label={ui.stopVoice}>
          <Square size={16} />
        </button>
      </div>

      <div className="taskList">
        <article className="taskCard focusTask">
          <span>{ui.stepLabel} 1</span>
          <h3>{ui.taskTitles.registration}</h3>
          <p>{registrationText}</p>
          <div className="wordChips">
            {wordList.map((word) => (
              <strong key={word}>{word}</strong>
            ))}
          </div>
          <VoiceButton text={registrationText} locale={test.voiceLocale} label={ui.listen} />
        </article>

        <article className="taskCard focusTask">
          <span>{ui.stepLabel} 2</span>
          <h3>{ui.taskTitles.clock}</h3>
          <p>{test.tasks.clock}</p>
          <VoiceButton text={test.tasks.clock} locale={test.voiceLocale} label={ui.listen} />
        </article>

        <article className="taskCard focusTask">
          <span>{ui.stepLabel} 3</span>
          <h3>{ui.taskTitles.recall}</h3>
          <p>{test.tasks.recall}</p>
          <VoiceButton text={test.tasks.recall} locale={test.voiceLocale} label={ui.listen} />
        </article>
      </div>
    </section>
  );
}

export default function AssessmentApp() {
  const [form, setForm] = useState(emptyForm);
  const [activityDone, setActivityDone] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // Auto-fill demographic profile details
          setForm((current) => ({
            ...current,
            patient: {
              ...current.patient,
              identifier: data.user.email,
              age: data.user.age.toString(),
              gender: data.user.gender,
              educationYears: data.user.educationYears.toString(),
            },
          }));
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    }
    fetchUser();
  }, []);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  }

  const secondLanguage = form.patient.firstLanguage
    ? languageTests[form.patient.firstLanguage]
    : null;
  const secondLanguageNeedsImport = secondLanguage && !secondLanguage.imported;
  const showSecondLanguageTasks = secondLanguage && secondLanguage.imported;

  function updatePatient(field, value) {
    setForm((current) => ({
      ...current,
      patient: {
        ...current.patient,
        [field]: value,
      },
    }));
  }

  function updateAnswer(field, value) {
    setForm((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [field]: value,
      },
    }));
  }

  function finishActivity(event) {
    event.preventDefault();
    setActivityDone(true);
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <h1>Memory and clock activity</h1>
          {user && (
            <p style={{ color: "#91d6cd", fontWeight: "bold", fontSize: "0.92rem", marginTop: "4px" }}>
              Welcome, {user.firstName} {user.lastName}!
            </p>
          )}
          <p className="headerCopy">
            First complete the English version. Then choose another language if you speak one, and the same activity will appear in that language.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "transparent",
              color: "#fda29b",
              border: "1px solid #fda29b",
              fontSize: "0.85rem",
              minHeight: "34px",
              padding: "6px 12px",
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <form className="patientWorkspace" onSubmit={finishActivity}>
        <section className="demographicsPanel">
          <div className="sectionTitle">
            <ClipboardList size={21} />
            <h2>About you</h2>
          </div>

          <div className="twoCol">
            <label>
              Age
              <input
                type="number"
                min="1"
                max="125"
                value={form.patient.age}
                onChange={(event) => updatePatient("age", event.target.value)}
                placeholder="Age"
              />
            </label>

            <label>
              Gender
              <select
                value={form.patient.gender}
                onChange={(event) => updatePatient("gender", event.target.value)}
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer-not">Prefer not to say</option>
              </select>
            </label>

          </div>

          <div className="twoCol">
            <label>
              Education years
              <input
                type="number"
                min="0"
                max="40"
                value={form.patient.educationYears}
                onChange={(event) => updatePatient("educationYears", event.target.value)}
                placeholder="Years"
              />
            </label>

            <label>
              Country or region
              <input
                value={form.patient.countryOrRegion}
                onChange={(event) => updatePatient("countryOrRegion", event.target.value)}
                placeholder="Country or region"
              />
            </label>
          </div>
        </section>

        <section className="phaseIntro">
          <div className="sectionTitle">
            <ClipboardList size={21} />
            <h2>Phase 1: English</h2>
          </div>
          <p>Listen to the English instructions first. When asked to draw the clock, use the sheet provided by the clinician.</p>
        </section>

        <section className="patientTasks englishPhase">
          <PatientTaskPanel test={languageTests.en} title={languageTests.en.ui.instructionsTitle} />
        </section>

        <section className="responsePanel englishAnswers">
          <div className="sectionTitle">
            <ClipboardList size={21} />
            <h2>English answer</h2>
          </div>

          <label>
            Words you remember in English
            <textarea
              value={form.answers.wordRecallEnglish}
              onChange={(event) => updateAnswer("wordRecallEnglish", event.target.value)}
              placeholder="Type the words you remember"
            />
          </label>
        </section>

        <section className="languagePanel">
          <div className="sectionTitle">
            <Languages size={21} />
            <h2>Phase 2: Another language</h2>
          </div>

          <label>
            Do you speak another language best?
            <select
              value={form.patient.firstLanguage}
              onChange={(event) => updatePatient("firstLanguage", event.target.value)}
            >
              <option value="">No additional language selected</option>
              {supportedFirstLanguages
                .filter((language) => language.code !== "en")
                .map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label} {language.imported ? "" : "(coming soon)"}
                  </option>
                ))}
            </select>
          </label>

          {secondLanguageNeedsImport && (
            <div className="notice">
              <Languages size={17} />
              This language is not ready yet. Only English will be shown.
            </div>
          )}

          {!form.patient.firstLanguage && (
            <div className="softNotice">Choose a language only if the patient speaks one. Otherwise continue with English only.</div>
          )}
        </section>

        {showSecondLanguageTasks && (
          <section className="patientTasks secondLanguagePhase">
            <PatientTaskPanel
              test={secondLanguage}
              title={secondLanguage.ui?.instructionsTitle ?? `${secondLanguage.label} instructions`}
            />
          </section>
        )}

        {showSecondLanguageTasks && (
          <section className="responsePanel secondLanguageAnswers">
            <label dir={secondLanguage.direction}>
              {secondLanguage.ui?.answerLabel ?? `Words you remember in ${secondLanguage.label}`}
              <textarea
                value={form.answers.wordRecallFirstLanguage}
                onChange={(event) => updateAnswer("wordRecallFirstLanguage", event.target.value)}
                placeholder={secondLanguage.ui?.answerPlaceholder ?? "Type the words you remember"}
              />
            </label>
          </section>
        )}

        <section className="finishPanel">
          <div className="actions">
            <button type="submit">
              <Check size={18} />
              Finish activity
            </button>
            {activityDone && (
              <span className="saveStatus saved">
                <Check size={17} />
                Your responses are ready.
              </span>
            )}
          </div>
        </section>
      </form>
    </main>
  );
}
