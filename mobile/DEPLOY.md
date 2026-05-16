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

Commit and publish the contents of `mobile/dist`, or use a GitHub Pages action that runs:

```bash
cd mobile
npx expo export --platform web
```

and uploads `mobile/dist` as the Pages artifact.
