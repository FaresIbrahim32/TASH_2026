import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  SYSTEM_INSTRUCTION,
  CLOCK_SCHEMA,
  RECALL_SCHEMA,
  TEMPORAL_SCHEMA,
  SPATIAL_SCHEMA,
  ATTENTION_SCHEMA,
  REPETITION_SCHEMA,
  WRITING_SCHEMA,
  PENTAGON_SCHEMA,
  prompts
} from "./prompts.mjs";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2"
});

// Parse standard S3 URLs to extract Bucket and Key
export function parseS3Url(url) {
  if (!url || typeof url !== "string" || !url.startsWith("https://")) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const bucket = parsed.hostname.split(".s3.")[0];
    const key = decodeURIComponent(parsed.pathname.slice(1));
    return { bucket, key };
  } catch (error) {
    console.error("Error parsing S3 URL:", url, error);
    return null;
  }
}

// Convert S3 object stream to a Buffer
async function downloadS3Buffer(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);

  return new Promise((resolve, reject) => {
    const chunks = [];
    response.Body.on("data", (chunk) => chunks.push(chunk));
    response.Body.on("error", reject);
    response.Body.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Resolve correct MIME types for Gemini ingestion
function getMimeType(key) {
  const ext = key.split(".").pop().toLowerCase();
  const mimeMap = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    webm: "audio/webm",
    ogg: "audio/ogg",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/m4a"
  };
  return mimeMap[ext] || "application/octet-stream";
}

// Helper to prepare file parts for Gemini
// Exported so ai-evaluator/cultureGrader.mjs can reuse it unchanged.
export async function prepareMediaPart(url) {
  const parsed = parseS3Url(url);
  if (!parsed) return null;

  try {
    const buffer = await downloadS3Buffer(parsed.bucket, parsed.key);
    const mimeType = getMimeType(parsed.key);
    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      }
    };
  } catch (error) {
    console.error(`Failed to download media asset from S3 (${url}):`, error);
    return null;
  }
}

// Base handler for executing Gemini Content Generation calls.
// Exported so ai-evaluator/cultureGrader.mjs can reuse it unchanged; accepts an
// optional systemInstruction override (defaults to the clinical one below) so
// non-clinical grading tasks aren't framed as a clinical evaluation.
export async function callGemini(ai, prompt, mediaPart, schema, retries = 3, delayMs = 2000, systemInstruction = SYSTEM_INSTRUCTION) {
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const contents = [prompt];

  if (mediaPart) {
    contents.push(mediaPart);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      const errStr = String(error).toLowerCase();
      const errMessage = (error.message || "").toLowerCase();
      const isRetryable = errStr.includes("429") || errMessage.includes("429") || 
                          errStr.includes("503") || errMessage.includes("503") ||
                          errStr.includes("quota") || errMessage.includes("quota") ||
                          errStr.includes("unavailable") || errMessage.includes("unavailable") ||
                          errStr.includes("high demand") || errMessage.includes("high demand") ||
                          errStr.includes("exhausted") || errMessage.includes("exhausted");

      if (isRetryable && attempt < retries) {
        console.warn(`Gemini API transient failure. Retrying attempt ${attempt + 1}/${retries} in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        console.error("Gemini API call execution failed:", error);
        throw error;
      }
    }
  }
}

// --- Task-Specific Evaluator Implementations ---

export async function gradeClockDrawing(ai, imageUrl) {
  if (!imageUrl) {
    return { score: 0, rationale: "Error: No clock drawing image provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(imageUrl);
    if (!mediaPart) {
      return { score: 0, rationale: "Error: Failed to retrieve drawing from storage." };
    }
    return await callGemini(ai, prompts.clockDrawing(), mediaPart, CLOCK_SCHEMA);
  } catch (error) {
    return { score: 0, rationale: "Error while grading. Please try again." };
  }
}

export async function gradeWordRecall(ai, audioUrl, targetWords) {
  if (!audioUrl) {
    return { score: 0, recalledWords: [], transcript: "", rationale: "Error: No recall audio provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { score: 0, recalledWords: [], transcript: "", rationale: "Error: Failed to retrieve recall audio from storage." };
    }
    return await callGemini(ai, prompts.wordRecall(targetWords), mediaPart, RECALL_SCHEMA);
  } catch (error) {
    return { score: 0, recalledWords: [], transcript: "", rationale: "Error while grading. Please try again." };
  }
}

export async function gradeTemporalOrientation(ai, audioUrl, target) {
  if (!audioUrl) {
    return { score: 0, transcript: "", rationale: "Error: No temporal orientation audio provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { score: 0, transcript: "", rationale: "Error: Failed to retrieve temporal orientation audio." };
    }
    return await callGemini(ai, prompts.temporalOrientation(target), mediaPart, TEMPORAL_SCHEMA);
  } catch (error) {
    return { score: 0, transcript: "", rationale: "Error while grading. Please try again." };
  }
}

export async function gradeSpatialOrientation(ai, audioUrl, target) {
  if (!audioUrl) {
    return { score: 0, transcript: "", rationale: "Error: No spatial orientation audio provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { score: 0, transcript: "", rationale: "Error: Failed to retrieve spatial orientation audio." };
    }
    return await callGemini(ai, prompts.spatialOrientation(target), mediaPart, SPATIAL_SCHEMA);
  } catch (error) {
    return { score: 0, transcript: "", rationale: "Error while grading. Please try again." };
  }
}

export async function gradeRegistration(ai, audioUrl, targetWords) {
  if (!audioUrl) {
    return { score: 0, transcript: "", rationale: "Error: No registration audio provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { score: 0, transcript: "", rationale: "Error: Failed to retrieve registration audio." };
    }
    return await callGemini(ai, prompts.registration(targetWords), mediaPart, RECALL_SCHEMA); // RECALL_SCHEMA conforms to registration requirements
  } catch (error) {
    return { score: 0, transcript: "", rationale: "Error while grading. Please try again." };
  }
}

export async function gradeAttentionCalculation(ai, audioUrl) {
  if (!audioUrl) {
    return { score: 0, taskPerformed: "unknown", transcript: "", rationale: "Error: No attention audio response provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { score: 0, taskPerformed: "unknown", transcript: "", rationale: "Error: Failed to retrieve attention audio." };
    }
    return await callGemini(ai, prompts.attentionCalculation(), mediaPart, ATTENTION_SCHEMA);
  } catch (error) {
    return { score: 0, taskPerformed: "unknown", transcript: "", rationale: "Error while grading. Please try again." };
  }
}

export async function gradeRepetition(ai, audioUrl, targetPhrase) {
  if (!audioUrl) {
    return { score: 0, transcript: "", rationale: "Error: No repetition audio response provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { score: 0, transcript: "", rationale: "Error: Failed to retrieve repetition audio." };
    }
    return await callGemini(ai, prompts.repetition(targetPhrase), mediaPart, REPETITION_SCHEMA);
  } catch (error) {
    return { score: 0, transcript: "", rationale: "Error while grading. Please try again." };
  }
}

export async function gradeWritingSentence(ai, writtenSentence, lang = "en") {
  if (!writtenSentence || writtenSentence.trim() === "") {
    return { score: 0, rationale: "Error: No sentence written by the patient." };
  }

  try {
    return await callGemini(ai, prompts.writingSentence(writtenSentence, lang), null, WRITING_SCHEMA);
  } catch (error) {
    return { score: 0, rationale: "Error while grading. Please try again." };
  }
}

export async function gradePentagonCopy(ai, imageUrl) {
  if (!imageUrl) {
    return { score: 0, rationale: "Error: No pentagon drawing image provided." };
  }

  try {
    const mediaPart = await prepareMediaPart(imageUrl);
    if (!mediaPart) {
      return { score: 0, rationale: "Error: Failed to retrieve pentagon drawing from storage." };
    }
    return await callGemini(ai, prompts.pentagonCopy(), mediaPart, PENTAGON_SCHEMA);
  } catch (error) {
    return { score: 0, rationale: "Error while grading. Please try again." };
  }
}
