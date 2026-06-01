# Early Review Screener

A lightweight browser prototype for measuring facial behavior during short cognitive tasks.

This is not a diagnostic tool. It is an early-review screener that may flag facial-behavior patterns for clinician or researcher review.

## Run

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## What It Tracks

- Face tracking quality
- Blink rate
- Head motion
- Gaze motion proxy
- Mouth motion
- Facial expression variability
- Difference from the patient's local baseline

## How The Flag Works

The app uses simple rules, not a medical model:

- Low review flag: no major pattern was flagged.
- Medium review flag: one or more facial behavior signals are unusual.
- High review flag: multiple signals are unusual or the session differs strongly from baseline.
- Needs repeat: tracking quality was too low.

The first completed session for a patient ID becomes the baseline in browser local storage.

## Privacy

The prototype does not upload data. Session summaries stay in the browser unless you export JSON.
