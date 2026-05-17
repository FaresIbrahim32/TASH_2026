# Deploy the Expo Web Build

The static deploy folder is:

```bash
/Users/Fares/Documents/TASH/mobile/dist
```

Regenerate it with:

```bash
cd /Users/Fares/Documents/TASH/mobile
npx expo export --platform web
```

## Vercel

ElevenLabs voice playback requires a server-side API because `ELEVENLABS_API_KEY` must stay secret.

For a Vercel deployment, set these environment variables:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` optional fallback
- `ELEVENLABS_VOICE_ID_EN` optional
- `ELEVENLABS_VOICE_ID_AR` optional
- `ELEVENLABS_VOICE_ID_ES` optional
- `ELEVENLABS_VOICE_ID_ZH` optional
- `EXPO_PUBLIC_TTS_ENDPOINT=/api/tts` if the TTS API is deployed with the same host

This repo includes `mobile/api/tts.js` for Vercel serverless deployments from the `mobile` root.

Use either:

```bash
cd /Users/Fares/Documents/TASH/mobile
npx vercel dist
```

Or connect a GitHub repo and configure:

- Root directory: `mobile`
- Build command: `npx expo export --platform web`
- Output directory: `dist`

## Netlify

ElevenLabs voice playback also needs a Netlify Function or another deployed TTS API endpoint.
Set `EXPO_PUBLIC_TTS_ENDPOINT` to that HTTPS endpoint before exporting the app.

Use either:

```bash
cd /Users/Fares/Documents/TASH/mobile
npx netlify deploy --dir=dist --prod
```

Or connect a GitHub repo and configure:

- Base directory: `mobile`
- Build command: `npx expo export --platform web`
- Publish directory: `mobile/dist`

## GitHub Pages

GitHub Pages can host the static UI, but it cannot securely store `ELEVENLABS_API_KEY`.
For GitHub Pages, deploy `/api/tts` somewhere else and set:

```bash
EXPO_PUBLIC_TTS_ENDPOINT=https://your-api-host.example.com/api/tts
```

Commit and publish the contents of `mobile/dist`, or use a GitHub Pages action that runs:

```bash
cd mobile
npx expo export --platform web
```

and uploads `mobile/dist` as the Pages artifact.
