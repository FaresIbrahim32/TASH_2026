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
  es: "Es un día agradable y soleado, pero hace demasiado calor.",
  ar: "أن ، لن ، إذن ، كي",
  "zh-TW": "沒有如果、並且、或但是"
};

// Language-keyed name lists for object naming — enforces answers in the test language
const PENCIL_NAMES_BY_LANG = {
  en: ["pencil", "pen", "crayon"],
  es: ["lápiz", "lapiz", "bolígrafo", "pluma", "lapicero"],
  "zh-TW": ["鉛筆", "铅笔", "筆", "笔"],
  ar: ["قلم", "قلم رصاص"]
};
const WATCH_NAMES_BY_LANG = {
  en: ["watch", "wristwatch", "wrist-watch", "smartwatch", "smart-watch", "timepiece", "time-piece"],
  es: ["reloj", "pulsera", "reloj de pulsera"],
  "zh-TW": ["手錶", "手表", "表"],
  ar: ["ساعة", "ساعه", "ساعة يد"]
};

function getSeasonForTimeZone(date, timeZone) {
  // Get month as a 1-indexed number directly in the client timezone
  const monthStr = date.toLocaleString("en-US", { month: "numeric", timeZone: timeZone || "UTC" });
  const month = Number(monthStr); // 1-12
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 9) return "Summer";
  if (month >= 10 && month <= 11) return "Autumn (or Fall)";
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

    console.log(`Processing screening: type=${testType}, PK=${PK}, SK=${SK}`);

    const langsToGrade = ["en"];
    if (secLang && secLang !== "none" && secLang !== "en") {
      langsToGrade.push(secLang);
    }

    const gradingResultsByLang = {};

    for (const lang of langsToGrade) {
      console.log(`Grading language run: ${lang}`);
      
      if (testType === "mini-cog") {
        const targetWords = (lang === "en")
          ? (submission.targetWordsEnglish || ["Banana", "Sunrise", "Chair"])
          : (submission.targetWordsSecondary || submission.targetWordsEnglish || ["Banana", "Sunrise", "Chair"]);
        const clockKey = `clockDrawing_${lang}`;
        const recallKey = `recallAudio_${lang}`;

        const [clockRes, recallRes] = await Promise.all([
          gradeClockDrawing(ai, answers[clockKey]),
          gradeWordRecall(ai, answers[recallKey], targetWords)
        ]);

        const recallScore = Number(recallRes.score) || 0;
        const clockScore = Number(clockRes.score) || 0;
        const totalScore = recallScore + clockScore;
        
        const hasError = clockRes.rationale === "Error while grading. Please try again." ||
                         recallRes.rationale === "Error while grading. Please try again.";

        const screeningFlag = hasError ? "error" : calculateMiniCogFlag({ recallScore, clockScore });

        gradingResultsByLang[lang] = {
          screeningFlag,
          recallScore,
          clockScore,
          totalScore,
          maxScore: 5,
          gradedAt: new Date().toISOString(),
          gradingExplanation: hasError ? "Error while grading. Please try again." : `Word Recall: ${recallRes.rationale || "No rationale."} Clock Drawing: ${clockRes.rationale || "No rationale."}`,
          gradingError: hasError,
          itemizedGrading: {
            clockDrawing: { score: clockScore, max: 2, rationale: clockRes.rationale },
            wordRecall: { score: recallScore, max: 3, transcript: recallRes.transcript, recalledWords: recallRes.recalledWords, rationale: recallRes.rationale }
          }
        };
      } else if (testType === "mmse") {
        // Resolve Temporal Targets based on clientTimeZone using formatting directly
        const createdDate = new Date(submission.createdAt || new Date().toISOString());
        const tz = submission.clientTimeZone || "UTC";
        const formatPart = (options) => createdDate.toLocaleString("en-US", { ...options, timeZone: tz });
        
        const targetTemporal = {
          year: formatPart({ year: "numeric" }),
          month: formatPart({ month: "long" }),
          date: formatPart({ day: "numeric" }),
          day: formatPart({ weekday: "long" }),
          season: getSeasonForTimeZone(createdDate, tz)
        };
        const targetSpatial = submission.locationGroundTruth || { state: "", county: "", town: "", building: "", floor: "" };

        // Resolve Naming Task (graded in code)
        const nameObj1 = (answers[`naming_object1_${lang}`] || "").trim().toLowerCase();
        const nameObj2 = (answers[`naming_object2_${lang}`] || "").trim().toLowerCase();
        const pencilNames = PENCIL_NAMES_BY_LANG[lang] || PENCIL_NAMES_BY_LANG.en;
        const watchNames = WATCH_NAMES_BY_LANG[lang] || WATCH_NAMES_BY_LANG.en;
        const name1Correct = pencilNames.some(name => nameObj1.includes(name));
        const name2Correct = watchNames.some(name => nameObj2.includes(name));
        const namingScore = (name1Correct ? 1 : 0) + (name2Correct ? 1 : 0);

        // Resolve 3-Stage Command Tasks (graded in code)
        const cmd1 = answers[`command_step1_${lang}`] === true;
        const cmd2 = answers[`command_step2_${lang}`] === true;
        const cmd3 = answers[`command_step3_${lang}`] === true;
        const commandScore = (cmd1 ? 1 : 0) + (cmd2 ? 1 : 0) + (cmd3 ? 1 : 0);

        // Resolve Reading & Obeying Task (graded in code)
        const readingScore = answers[`readingObeyed_${lang}`] === true ? 1 : 0;

        const targetWords = (lang === "en")
          ? (submission.targetWordsEnglish || ["Apple", "Table", "Penny"])
          : (submission.targetWordsSecondary || submission.targetWordsEnglish || ["Apple", "Table", "Penny"]);
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
          gradeWritingSentence(ai, answers[`writingSentence_${lang}`], lang),
          gradePentagonCopy(ai, answers[`pentagonDrawing_${lang}`])
        ]);

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

        const hasError = temporalRes.rationale === "Error while grading. Please try again." ||
                         spatialRes.rationale === "Error while grading. Please try again." ||
                         registrationRes.rationale === "Error while grading. Please try again." ||
                         attentionRes.rationale === "Error while grading. Please try again." ||
                         recallRes.rationale === "Error while grading. Please try again." ||
                         repetitionRes.rationale === "Error while grading. Please try again." ||
                         writingRes.rationale === "Error while grading. Please try again." ||
                         drawingRes.rationale === "Error while grading. Please try again.";

        // Standard MMSE positive-screen threshold is ≥24/30. With building/floor removed,
        // max is now 28. Proportional equivalent: floor(24/30 * 28) = 22.
        const screeningFlag = hasError ? "error" : (totalScore >= 22 ? "negative-screen" : "positive-screen");

        gradingResultsByLang[lang] = {
          screeningFlag,
          totalScore,
          maxScore: 28,
          gradedAt: new Date().toISOString(),
          gradingExplanation: hasError ? "Error while grading. Please try again." : `Temporal: ${temporalRes.rationale || "No rationale."} Spatial: ${spatialRes.rationale || "No rationale."} Pentagon drawing: ${drawingRes.rationale || "No rationale."}`,
          gradingError: hasError,
          itemizedGrading: {
            temporalOrientation: { score: temporalScore, max: 5, transcript: temporalRes.transcript, rationale: temporalRes.rationale },
            spatialOrientation: { score: spatialScore, max: 3, transcript: spatialRes.transcript, rationale: spatialRes.rationale },
            registration: { score: registrationScore, max: 3, transcript: registrationRes.transcript, rationale: registrationRes.rationale },
            attentionCalculation: { score: attentionScore, max: 5, taskPerformed: attentionRes.taskPerformed, transcript: attentionRes.transcript, rationale: attentionRes.rationale },
            wordRecall: { score: recallScore, max: 3, transcript: recallRes.transcript, recalledWords: recallRes.recalledWords, rationale: recallRes.rationale },
            naming: { score: namingScore, max: 2, namingObject1: nameObj1, namingObject2: nameObj2 },
            repetition: { score: repetitionScore, max: 1, transcript: repetitionRes.transcript, rationale: repetitionRes.rationale },
            command: { score: commandScore, max: 3, step1: cmd1, step2: cmd2, step3: cmd3 },
            reading: { score: readingScore, max: 1 },
            writing: { score: writingScore, max: 1, rationale: writingRes.rationale },
            drawing: { score: drawingScore, max: 1, rationale: drawingRes.rationale }
          }
        };
      }
    }

    // Resolve overall high-level fields (for simple UI lists)
    let overallScore, overallMax, overallFlag, overallExplanation;
    const runEn = gradingResultsByLang["en"];
    const runSec = secLang !== "none" && secLang !== "en" ? gradingResultsByLang[secLang] : null;

    const anyRunHasError = runEn?.gradingError || runSec?.gradingError;

    if (anyRunHasError) {
      overallFlag = "error";
      overallScore = 0;
      overallMax = runEn.maxScore;
      overallExplanation = "Error while grading. Please try again.";
    } else if (langsToGrade.length === 1) {
      overallScore = runEn.totalScore;
      overallMax = runEn.maxScore;
      overallFlag = runEn.screeningFlag;
      overallExplanation = runEn.gradingExplanation;
    } else {
      overallScore = runSec.totalScore; // secondary/native language score represents actual capacity
      overallMax = runSec.maxScore;
      // Mixed screen categorization: normal in native/secondary but positive/impaired in English (or vice-versa)
      if (runEn.screeningFlag !== runSec.screeningFlag) {
        overallFlag = "mixed-screen";
      } else {
        overallFlag = runSec.screeningFlag;
      }
      overallExplanation = `English Score: ${runEn.totalScore}/${runEn.maxScore} (${runEn.screeningFlag === "positive-screen" ? "Impaired" : "Normal"}). ` +
                           `${secLang.toUpperCase()} Score: ${runSec.totalScore}/${runSec.maxScore} (${runSec.screeningFlag === "positive-screen" ? "Impaired" : "Normal"}).`;
    }

    console.log(`Writing dual grading results to DynamoDB. Overall: ${overallScore}/${overallMax}, Flag: ${overallFlag}`);

    await docClient.send(
      new UpdateCommand({
        TableName: "tash-core",
        Key: { PK, SK },
        UpdateExpression: "SET answers.screeningFlag = :sf, answers.totalScore = :ts, answers.maxScore = :ms, answers.gradedAt = :ga, answers.gradingExplanation = :ge, answers.gradingResults = :gr",
        ExpressionAttributeValues: {
          ":sf": overallFlag,
          ":ts": overallScore,
          ":ms": overallMax,
          ":ga": new Date().toISOString(),
          ":ge": overallExplanation,
          ":gr": gradingResultsByLang
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Grading successfully completed.", grading: gradingResultsByLang })
    };

  } catch (error) {
    console.error("Critical error during grading handler execution:", error);
    if (PK && SK) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: "tash-core",
            Key: { PK, SK },
            UpdateExpression: "SET answers.screeningFlag = :sf, answers.gradingExplanation = :ge, answers.gradingError = :geErr, answers.gradedAt = :ga",
            ExpressionAttributeValues: {
              ":sf": "error",
              ":ge": `Critical execution error: ${error.message}`,
              ":geErr": true,
              ":ga": new Date().toISOString()
            }
          })
        );
      } catch (dbErr) {
        console.error("Failed to write error state to DynamoDB:", dbErr);
      }
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Grading job execution failed.", error: error.message })
    };
  }
}
