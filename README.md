# TASH

A multilingual cognitive screening capture app for **Mini-Cog** and **MMSE** workflows, with AI-assisted grading.

TASH lets a clinician administer a standardized cognitive screen in the patient's own language, capture the responses (audio, images, typed text), and get a structured, itemized grading report back automatically. It supports **English, Arabic, Chinese (Traditional), and Spanish**, and can run a session in two languages at once — English plus one secondary language — grading each independently.

> [!IMPORTANT]
> **This is a screening documentation and clinician-review tool. It is not a diagnostic system.** Nothing it produces is a diagnosis, and no output should be used as one. All flags are intended to prompt clinician review, not to replace it.

---

## Features

**Mini-Cog** — three-word recall plus clock drawing (5 points). The clock is administered on paper and photographed, not drawn in-app.

**MMSE** — 11 domains, 28 points. Building/floor orientation items were intentionally dropped, so the positive-screen threshold is proportionally scaled to ≥22 rather than the standard ≥24/30. Naming, the 3-stage command, and reading/obeying are graded in code; the rest (orientation, registration, attention/calculation, recall, repetition, writing, pentagon copy) are graded by Google Gemini from the captured audio and images.

**Dual-language administration** — when a secondary language is selected, both language runs are graded separately and stored under `answers.gradingResults[lang]`. The secondary-language score is treated as the overall score, since it better reflects actual capacity. If the two runs disagree on the flag, the session is marked `mixed-screen`.

**Text-to-speech instructions** — every instruction can be read aloud in the target language via ElevenLabs, falling back to the browser's Web Speech API.

**MRI dementia screener** — upload MRI slices and get a three-class prediction (`NonDemented`, `MildOrVeryMildDemented`, `ModerateDemented`) from a fine-tuned MobileNetV2 running in a container Lambda. On a held-out evaluation set (n=2875) it reached 0.84 weighted F1, separating Moderate cases perfectly; the residual confusion is between NonDemented and Mild/Very Mild.

**Facial Behavior & Engagement Screen** — an optional, **unscored** engagement activity that is deliberately isolated from the Mini-Cog/MMSE data path. The patient describes a culturally themed picture out loud for 90 seconds while MediaPipe FaceLandmarker measures facial behavior (blink rate, head motion, gaze proxy, mouth motion, expression variability) in the browser, producing a non-diagnostic "review flag" from fixed, research-backed thresholds. A short 3-question culture-game quiz follows, scored instantly client-side. Picture prompts and game boards are per-language and culturally specific — Ludo/Domino for English and Spanish, Chinese Checkers/Go/Mahjong for Chinese, Mancala for Arabic.

The clinician sees the resulting flag alongside the raw measurements it was derived from, so the reasoning behind it is always inspectable.

---

## Repo layout

| Directory | Stack | Purpose |
|---|---|---|
| `/` (root) | Next.js 16, React 19 | Clinician web app — dashboard, assessment flow, MRI, engagement screen |
| `mobile/` | Expo 54, React Native | Mobile patient-facing assessment app |
| `ai-evaluator/` | Node.js ESM, AWS Lambda | AI grading worker (Google Gemini) |
| `mri-inference/` | Python, AWS Lambda (container) | MobileNetV2 MRI classifier |

Supporting material, not deployable services: `dementia-mri-classifier/` (training notebook + model for the MRI Lambda) and `early-face-screener/` (a standalone HTML prototype that preceded the in-app face tracking).

**Note:** `app/test/` is a Next.js page route — the patient assessment flow — not a test directory. This project has no automated test suites.

---

## Architecture

**Storage** — a single DynamoDB table, `tash-core`, holding clinician accounts (`USER#<id>` / `METADATA`), an email uniqueness index (`EMAIL#<email>` / `LOOKUP`), assessments (`USER#<id>` / `SUBMISSION#<ts>`), and engagement sessions (`USER#<id>` / `CULTURE#<ts>`).

**Media** — audio and images go to S3 under `{userId}/{submissionId}/{fieldKey}.{ext}`. The browser uploads directly using presigned PUT URLs (15-min expiry); on read, raw S3 URLs are swapped for presigned GET URLs (1-hour expiry). Objects are never public.

**Auth** — HMAC-SHA256 JWT in a `tash_session` HttpOnly cookie (7-day TTL), implemented from scratch on Node's `crypto`. Passwords are PBKDF2-hashed. `proxy.js` (Next.js middleware) gates the app routes; each API route independently verifies the token.

**Grading flow**

1. The patient completes the assessment at `/test`; media is recorded/captured in the browser.
2. The client uploads media straight to S3 via presigned URLs.
3. The client POSTs submission metadata to `/api/submissions`, which writes it to DynamoDB.
4. That route fires a **non-blocking** webhook to the grading Lambda with just `{PK, SK}`.
5. The Lambda reads the item, streams the media from S3, and calls Gemini for multimodal grading.
6. Results are written back into `answers.gradingResults` on the same item.

Regrading a session is available from the dashboard via `POST /api/submissions/regrade`.

---

## Running locally

```bash
npm install
cp .env.example .env    # then fill in the values
npm run dev             # http://localhost:3000
```

Other root scripts: `npm run build`, `npm start`, `npm run lint`.

### Mobile app

```bash
cd mobile
npm install
npm start               # interactive Expo CLI
npm run ios             # or: npm run android / npm run web
```

Export a web build with `npx expo export --platform web`.

### Configuration

Copy `.env.example` to `.env` at the repo root and fill it in. You will need AWS credentials with DynamoDB + S3 access, a `JWT_SECRET`, a `GEMINI_API_KEY`, and function URLs plus shared bearer tokens for the two Lambdas (`AI_EVALUATOR_URL` / `GRADER_SECRET_TOKEN`, `MRI_INFERENCE_URL` / `MRI_INFERENCE_SECRET`). `ELEVENLABS_API_KEY` is optional — without it, TTS falls back to the browser. Each variable is commented in `.env.example`.

### Deploying the Lambdas

**AI evaluator** — zip the `ai-evaluator/` directory and deploy it to AWS Lambda. Entry point `index.mjs`, handler export `handler`. It needs `AWS_REGION`, `GEMINI_API_KEY`, and `GRADER_SECRET_TOKEN` in its own environment. Optionally set `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL`; the grader switches to the fallback permanently once the primary model reports a rate-limit or quota error.

**MRI inference** — build the container from `mri-inference/Dockerfile` and deploy it as a container-image Lambda. It needs `MRI_INFERENCE_SECRET` to match the web app.

---

## Adding a language

1. Put the standardized source PDF in `public/tests` for audit and reference.
2. Add an entry to `languageTests` in **both** `app/lib/tests.js` and `mobile/src/tests.js` — word lists (6 sets of 3), task instruction strings, UI labels, `direction` (`ltr`/`rtl`), `voiceLocale`, and the PDF path.
3. Optionally add matching content to `app/lib/cultureContent.js` (3 picture prompts, 6 game questions) plus per-language image assets under `public/culture-content/<lang>/`.

French (`fr`) is already declared but marked `imported: false` with no tasks, and serves as the template for a stub entry.

---

## Team

Built by [Harshavardan Yuvaraj](https://www.linkedin.com/in/harsha-yuvaraj/), [Fares Ibrahim](https://www.linkedin.com/in/fares-ibrahim-shehata/), and [Brandon Ugbesia](https://www.linkedin.com/in/brandon-ugbesia/). 
