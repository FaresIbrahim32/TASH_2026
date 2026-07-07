// Grading for the "Cultural Connection" feature — isolated from the
// Mini-Cog/MMSE grading in grader.mjs/prompts.mjs/index.mjs. Reuses the
// shared Gemini/S3 plumbing (prepareMediaPart, callGemini) unchanged.
//
// The game questions are multiple-choice and scored on the client (each game
// scenario already carries `selectedAnswer` + `correct`), so the Lambda's only
// job here is to transcribe the one spoken picture-description clip. Nothing is
// scored by AI in this feature.
import { prepareMediaPart, callGemini } from "./grader.mjs";

// Deliberately not the clinical-neurologist framing used for Mini-Cog/MMSE —
// this is an unscored engagement activity, not a clinical instrument.
const SYSTEM_INSTRUCTION =
  "You are transcribing audio from a short, non-clinical cultural engagement activity. Transcribe faithfully; do not assess, score, or diagnose.";

const TRANSCRIPT_ONLY_SCHEMA = {
  type: "OBJECT",
  properties: {
    transcript: { type: "STRING", description: "Verbatim transcription of what the patient said in the audio clip." }
  },
  required: ["transcript"]
};

function transcriptOnlyPrompt() {
  return `The patient was asked to describe a picture out loud for about a minute. This response is NOT scored or graded in any way — only return a verbatim transcript of what they said.`;
}

// For the picture-description scenario — transcript only, no score.
export async function transcribeOnly(ai, audioUrl) {
  if (!audioUrl) {
    return { transcript: "" };
  }

  try {
    const mediaPart = await prepareMediaPart(audioUrl);
    if (!mediaPart) {
      return { transcript: "" };
    }
    return await callGemini(ai, transcriptOnlyPrompt(), mediaPart, TRANSCRIPT_ONLY_SCHEMA, 3, 2000, SYSTEM_INSTRUCTION);
  } catch (error) {
    return { transcript: "" };
  }
}

/**
 * Grades an entire Cultural Connection submission and writes the result back
 * to DynamoDB. Called from an early-exit branch in index.mjs's handler,
 * before the existing Mini-Cog/MMSE if/else-if chain.
 *
 * Games are already scored client-side, so this only transcribes the spoken
 * picture-description scenario and writes { pictureTranscript } into `grading`.
 */
export async function gradeCultureSession(ai, docClient, UpdateCommand, PK, SK, submission) {
  const scenarios = submission.scenarios || [];
  const picture = scenarios.find((s) => s.type === "picture");

  try {
    const { transcript } = picture ? await transcribeOnly(ai, picture.audioUrl) : { transcript: "" };

    await docClient.send(
      new UpdateCommand({
        TableName: "tash-core",
        Key: { PK, SK },
        UpdateExpression: "SET grading = :g, gradedAt = :ga",
        ExpressionAttributeValues: {
          ":g": { pictureTranscript: transcript },
          ":ga": new Date().toISOString()
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Cultural Connection transcript completed.", pictureTranscript: transcript })
    };
  } catch (error) {
    console.error("Cultural Connection grading failed:", error);
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: "tash-core",
          Key: { PK, SK },
          UpdateExpression: "SET gradingError = :e, gradedAt = :ga",
          ExpressionAttributeValues: {
            ":e": true,
            ":ga": new Date().toISOString()
          }
        })
      );
    } catch (dbErr) {
      console.error("Failed to write Cultural Connection error state to DynamoDB:", dbErr);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Cultural Connection grading failed.", error: error.message })
    };
  }
}
