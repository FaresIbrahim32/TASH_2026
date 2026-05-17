const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const importedLanguages = new Set(["en", "ar", "es", "zh-TW"]);
const languageVoiceEnv = {
  en: "ELEVENLABS_VOICE_ID_EN",
  ar: "ELEVENLABS_VOICE_ID_AR",
  es: "ELEVENLABS_VOICE_ID_ES",
  "zh-TW": "ELEVENLABS_VOICE_ID_ZH",
};

function getVoiceId(language) {
  const envKey = languageVoiceEnv[language];
  return (envKey && process.env[envKey]) || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function validatePayload({ text, language }) {
  if (!text || typeof text !== "string") {
    return "Text is required.";
  }

  if (text.length > 1200) {
    return "Text is too long.";
  }

  if (!importedLanguages.has(language)) {
    return "Unsupported language.";
  }

  return null;
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  const payload =
    req.method === "GET"
      ? { text: req.query.text, language: req.query.language || "en" }
      : req.body;
  const validationError = validatePayload(payload);

  if (validationError) {
    res.status(400).json({ message: validationError });
    return;
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    res.status(500).json({ message: "ElevenLabs API key is not configured." });
    return;
  }

  const voiceId = getVoiceId(payload.language);
  const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: payload.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!elevenLabsResponse.ok) {
    res.status(elevenLabsResponse.status).json({
      message: "Could not synthesize speech.",
      details: await elevenLabsResponse.text(),
    });
    return;
  }

  const audio = Buffer.from(await elevenLabsResponse.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(audio);
}
