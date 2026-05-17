import { languageTests } from "../../lib/tests";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const languageVoiceEnv = {
  en: "ELEVENLABS_VOICE_ID_EN",
  ar: "ELEVENLABS_VOICE_ID_AR",
  es: "ELEVENLABS_VOICE_ID_ES",
  "zh-TW": "ELEVENLABS_VOICE_ID_ZH",
};

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function getVoiceId(language) {
  const envKey = languageVoiceEnv[language];
  return (envKey && process.env[envKey]) || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
}

function validatePayload({ text, language }) {
  if (!text || typeof text !== "string") {
    return "Text is required.";
  }

  if (text.length > 1200) {
    return "Text is too long.";
  }

  if (!languageTests[language]?.imported) {
    return "Unsupported language.";
  }

  return null;
}

async function synthesizeSpeech({ text, language }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      error: Response.json(
        { message: "ElevenLabs API key is not configured." },
        { status: 500, headers: getCorsHeaders() },
      ),
    };
  }

  const voiceId = getVoiceId(language);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    return {
      error: Response.json(
        { message: "Could not synthesize speech.", details: message },
        { status: response.status, headers: getCorsHeaders() },
      ),
    };
  }

  return { audio: await response.arrayBuffer() };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: getCorsHeaders() });
}

export async function GET(request) {
  const url = new URL(request.url);
  const payload = {
    text: url.searchParams.get("text"),
    language: url.searchParams.get("language") || "en",
  };
  const validationError = validatePayload(payload);

  if (validationError) {
    return Response.json({ message: validationError }, { status: 400, headers: getCorsHeaders() });
  }

  const result = await synthesizeSpeech(payload);

  if (result.error) {
    return result.error;
  }

  return new Response(result.audio, {
    status: 200,
    headers: {
      ...getCorsHeaders(),
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function POST(request) {
  const payload = await request.json();
  const validationError = validatePayload(payload);

  if (validationError) {
    return Response.json({ message: validationError }, { status: 400, headers: getCorsHeaders() });
  }

  const result = await synthesizeSpeech(payload);

  if (result.error) {
    return result.error;
  }

  return new Response(result.audio, {
    status: 200,
    headers: {
      ...getCorsHeaders(),
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
