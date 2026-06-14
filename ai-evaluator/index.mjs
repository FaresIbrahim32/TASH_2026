import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { GoogleGenAI } from "@google/genai";
import {
  gradeClockDrawing,
  gradeWordRecall,
  gradeTemporalOrientation,
  gradeSpatialOrientation,
  gradeRegistration,
  gradeAttentionCalculation,
  gradeRepetition,
  gradeWritingSentence,
  gradePentagonCopy
} from "./grader.mjs";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2"
});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true }
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Translation tables for repetition target phrases
const REPETITION_PHRASES = {
  en: "No ifs, ands, or buts",
  es: "Ni síes, ni noes, ni peros",
  ar: "لا إف ولا أند ولا بوت",
  "zh-TW": "沒有如果、但是、或可是"
};

// Local translation matching list for object naming tasks
const PENCIL_NAMES = [
  "pencil", "pen", "crayon",
  "lápiz", "lapiz", "bolígrafo", "pluma", "lapicero",
  "鉛筆", "铅笔", "筆", "笔",
  "قلم", "قلم رصاص"
];
const WATCH_NAMES = [
  "watch", "wristwatch", "wrist-watch", "smartwatch", "smart-watch", "timepiece", "time-piece",
  "reloj", "pulsera", "reloj de pulsera",
  "手錶", "手表", "表",
  "ساعة", "ساعه", "ساعة يد"
];

function getSeason(date) {
  const month = date.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 8) return "Summer";
  if (month >= 9 && month <= 10) return "Autumn (or Fall)";
  return "Winter";
}

function calculateMiniCogFlag({ recallScore, clockScore }) {
  const recall = Number(recallScore);
  const clock = Number(clockScore);
  if (recall === 0 || (recall > 0 && recall < 3 && clock === 0)) {
    return "positive-screen";
  }
  return "negative-screen";
}

export async function handler(event) {
  console.log("AI Evaluator Lambda triggered:", JSON.stringify(event));

  // 1. Authenticate Request via Secret Token
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.GRADER_SECRET_TOKEN) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized execution request." })
    };
  }

  let PK, SK;
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    PK = body.PK;
    SK = body.SK;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON request body." })
    };
  }

  if (!PK || !SK) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing PK or SK in request body." })
    };
  }

  try {
    // 2. Fetch Submission Record from DynamoDB
    const getRes = await docClient.send(
      new GetCommand({
        TableName: "tash-core",
        Key: { PK, SK }
      })
    );

    const submission = getRes.Item;
    if (!submission) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Submission record not found." })
      };
    }

    const answers = submission.answers || {};
    const testType = submission.testType || "mini-cog";
    const secLang = submission.secondaryLanguage || "none";
    const gradingResults = {};

    console.log(`Processing screening: type=${testType}, PK=${PK}, SK=${SK}`);

    // --- CASE A: MINI-COG ASSESSMENT (0-5 points) ---
    if (testType === "mini-cog") {
      const targetWords = submission.targetWordsEnglish || ["Banana", "Sunrise", "Chair"];
      
      // Determine language-specific keys present in answers
      const clockKey = `clockDrawing_${secLang}` in answers ? `clockDrawing_${secLang}` : "clockDrawing_en";
      const recallKey = `recallAudio_${secLang}` in answers ? `recallAudio_${secLang}` : "recallAudio_en";

      // Run VLM drawing and audio recall grading tasks in parallel
      const [clockRes, recallRes] = await Promise.all([
        gradeClockDrawing(ai, answers[clockKey]),
        gradeWordRecall(ai, answers[recallKey], targetWords)
      ]);

      const recallScore = Number(recallRes.score) || 0;
      const clockScore = Number(clockRes.score) || 0;
      const totalScore = recallScore + clockScore;
      const screeningFlag = calculateMiniCogFlag({ recallScore, clockScore });

      gradingResults.screeningFlag = screeningFlag;
      gradingResults.recallScore = recallScore;
      gradingResults.clockScore = clockScore;
      gradingResults.totalScore = totalScore;
      gradingResults.maxScore = 5;
      gradingResults.gradedAt = new Date().toISOString();
      gradingResults.gradingExplanation = `Word Recall: ${recallRes.rationale || "No rationale."} Clock Drawing: ${clockRes.rationale || "No rationale."}`;
      gradingResults.itemizedGrading = {
        clockDrawing: {
          score: clockScore,
          max: 2,
          rationale: clockRes.rationale
        },
        wordRecall: {
          score: recallScore,
          max: 3,
          transcript: recallRes.transcript,
          recalledWords: recallRes.recalledWords,
          rationale: recallRes.rationale
        }
      };
    }

    // --- CASE B: MMSE ASSESSMENT (0-30 points) ---
    else if (testType === "mmse") {
      const lang = secLang !== "none" ? secLang : "en";
      
      // 1. Resolve Temporal Targets based on localTimeZone
      const createdDate = new Date(submission.createdAt || new Date().toISOString());
      const localDateStr = createdDate.toLocaleString("en-US", { timeZone: submission.clientTimeZone || "UTC" });
      const localDate = new Date(localDateStr);
      const targetTemporal = {
        year: localDate.getFullYear().toString(),
        month: localDate.toLocaleString("en-US", { month: "long" }),
        date: localDate.getDate().toString(),
        day: localDate.toLocaleString("en-US", { weekday: "long" }),
        season: getSeason(localDate)
      };

      // 2. Resolve Spatial targets
      const targetSpatial = submission.locationGroundTruth || { state: "", county: "", town: "", building: "", floor: "" };

      // 3. Resolve Naming Task (graded in code)
      const nameObj1 = (answers[`naming_object1_${lang}`] || "").trim().toLowerCase();
      const nameObj2 = (answers[`naming_object2_${lang}`] || "").trim().toLowerCase();
      const name1Correct = PENCIL_NAMES.some(name => nameObj1.includes(name));
      const name2Correct = WATCH_NAMES.some(name => nameObj2.includes(name));
      const namingScore = (name1Correct ? 1 : 0) + (name2Correct ? 1 : 0);

      // 4. Resolve 3-Stage Command Tasks (graded in code)
      const cmd1 = answers[`command_step1_${lang}`] === true;
      const cmd2 = answers[`command_step2_${lang}`] === true;
      const cmd3 = answers[`command_step3_${lang}`] === true;
      const commandScore = (cmd1 ? 1 : 0) + (cmd2 ? 1 : 0) + (cmd3 ? 1 : 0);

      // 5. Resolve Reading & Obeying Task (graded in code)
      const readingScore = answers[`readingObeyed_${lang}`] === true ? 1 : 0;

      // 6. Run AI-driven Audio/VLM grading calls concurrently
      const targetWords = submission.targetWordsEnglish || ["Apple", "Table", "Penny"];
      const targetPhrase = REPETITION_PHRASES[lang] || REPETITION_PHRASES.en;

      const [
        temporalRes,
        spatialRes,
        registrationRes,
        attentionRes,
        recallRes,
        repetitionRes,
        writingRes,
        drawingRes
      ] = await Promise.all([
        gradeTemporalOrientation(ai, answers[`temporalAudio_${lang}`], targetTemporal),
        gradeSpatialOrientation(ai, answers[`spatialAudio_${lang}`], targetSpatial),
        gradeRegistration(ai, answers[`registrationAudio_${lang}`], targetWords),
        gradeAttentionCalculation(ai, answers[`attentionAudio_${lang}`]),
        gradeWordRecall(ai, answers[`recallAudio_${lang}`], targetWords),
        gradeRepetition(ai, answers[`repetitionAudio_${lang}`], targetPhrase),
        gradeWritingSentence(ai, answers[`writingSentence_${lang}`]),
        gradePentagonCopy(ai, answers[`pentagonDrawing_${lang}`])
      ]);

      // 7. Aggregate Scores
      const temporalScore = Number(temporalRes.score) || 0;
      const spatialScore = Number(spatialRes.score) || 0;
      const registrationScore = Number(registrationRes.score) || 0;
      const attentionScore = Number(attentionRes.score) || 0;
      const recallScore = Number(recallRes.score) || 0;
      const repetitionScore = Number(repetitionRes.score) || 0;
      const writingScore = Number(writingRes.score) || 0;
      const drawingScore = Number(drawingRes.score) || 0;

      const totalScore = 
        temporalScore + spatialScore + registrationScore + attentionScore + recallScore +
        namingScore + repetitionScore + commandScore + readingScore + writingScore + drawingScore;

      // Clinical Cutoff: >= 24 is Normal, <= 23 is Impaired
      const screeningFlag = totalScore >= 24 ? "negative-screen" : "positive-screen";

      gradingResults.screeningFlag = screeningFlag;
      gradingResults.totalScore = totalScore;
      gradingResults.maxScore = 30;
      gradingResults.gradedAt = new Date().toISOString();
      gradingResults.gradingExplanation = `Temporal: ${temporalRes.rationale || "No rationale."} Spatial: ${spatialRes.rationale || "No rationale."} Pentagon drawing: ${drawingRes.rationale || "No rationale."}`;
      
      gradingResults.itemizedGrading = {
        temporalOrientation: { score: temporalScore, max: 5, transcript: temporalRes.transcript, rationale: temporalRes.rationale },
        spatialOrientation: { score: spatialScore, max: 5, transcript: spatialRes.transcript, rationale: spatialRes.rationale },
        registration: { score: registrationScore, max: 3, transcript: registrationRes.transcript, rationale: registrationRes.rationale },
        attentionCalculation: { score: attentionScore, max: 5, taskPerformed: attentionRes.taskPerformed, transcript: attentionRes.transcript, rationale: attentionRes.rationale },
        wordRecall: { score: recallScore, max: 3, transcript: recallRes.transcript, recalledWords: recallRes.recalledWords, rationale: recallRes.rationale },
        naming: { score: namingScore, max: 2, namingObject1: nameObj1, namingObject2: nameObj2 },
        repetition: { score: repetitionScore, max: 1, transcript: repetitionRes.transcript, rationale: repetitionRes.rationale },
        command: { score: commandScore, max: 3, step1: cmd1, step2: cmd2, step3: cmd3 },
        reading: { score: readingScore, max: 1 },
        writing: { score: writingScore, max: 1, rationale: writingRes.rationale },
        drawing: { score: drawingScore, max: 1, rationale: drawingRes.rationale }
      };
    }

    // 8. Update submission record in DynamoDB
    console.log(`Writing grading results to DynamoDB. Total Score: ${gradingResults.totalScore}/${gradingResults.maxScore}`);

    await docClient.send(
      new UpdateCommand({
        TableName: "tash-core",
        Key: { PK, SK },
        UpdateExpression: "SET answers.screeningFlag = :sf, answers.recallScore = :rs, answers.clockScore = :cs, answers.totalScore = :ts, answers.maxScore = :ms, answers.gradedAt = :ga, answers.gradingExplanation = :ge, answers.itemizedGrading = :ig",
        ExpressionAttributeValues: {
          ":sf": gradingResults.screeningFlag,
          ":rs": gradingResults.recallScore !== undefined ? gradingResults.recallScore : null,
          ":cs": gradingResults.clockScore !== undefined ? gradingResults.clockScore : null,
          ":ts": gradingResults.totalScore,
          ":ms": gradingResults.maxScore,
          ":ga": gradingResults.gradedAt,
          ":ge": gradingResults.gradingExplanation,
          ":ig": gradingResults.itemizedGrading
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Grading successfully completed.", grading: gradingResults })
    };
  } catch (error) {
    console.error("Critical error during grading handler execution:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Grading job execution failed.", error: error.message })
    };
  }
}
