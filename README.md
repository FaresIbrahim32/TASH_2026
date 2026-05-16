# TASH

Multilingual cognitive screening capture app for Mini-Cog workflows.

## What is built

- English Mini-Cog tasks rendered as native app questions and activities.
- First-language task set rendered beside English when an imported standardized test exists.
- Voice buttons for each instruction using browser text-to-speech.
- Two-phase patient flow: English first, then an optional selected language.
- Second-language questions only appear after the patient selects that language.
- Clock drawing is instructed as a paper-based activity, not an in-app canvas.
- Imported PDFs: English, Arabic, and Chinese Traditional.
- Patient context capture, bilingual response fields, score fields, and clinician notes.
- Server-side submission endpoint with MongoDB storage when `MONGODB_URI` is set.
- Local JSON fallback at `data/submissions.json` for development without MongoDB.

This app supports screening documentation and clinician review. It should not be used as an automated diagnosis tool.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## MongoDB

Copy `.env.example` to `.env` and set:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/tash
```

Then restart the dev server. Without `MONGODB_URI`, submissions are saved locally for development only.

## Add more languages

1. Put the standardized source PDF in `public/tests` for audit/reference.
2. Add its app-native task text, word list, direction, and voice locale to `app/lib/tests.js`.
3. Use the language code as the `firstLanguage` value.
