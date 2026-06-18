import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, isAwsConfigured } from "../../lib/dynamodb";
import { deleteS3ObjectByUrl, getPresignedReadUrl } from "../../lib/s3";
import { z } from "zod";
import { calculateMiniCogFlag, languageTests } from "../../lib/tests";
import { cookies } from "next/headers";
import { verifyToken } from "../../lib/auth";
import crypto from "crypto";

const optionalNumber = (min, max) =>
  z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    z.coerce.number().min(min).max(max).optional(),
  );

// S3 presigning helpers (used only by the GET handler)

/**
 * Returns true if the value is a raw S3 object URL belonging to our bucket.
 * Non-string values (objects, arrays, numbers) always return false.
 */
function isS3Url(val) {
  return (
    typeof val === "string" &&
    val.includes(".s3.") &&
    val.includes(".amazonaws.com/")
  );
}

/**
 * Extracts the S3 key (the object path) from a full S3 HTTPS URL.
 * e.g. "https://bucket.s3.us-east-2.amazonaws.com/usr_a/sub_b/file.webm"
 *      → "usr_a/sub_b/file.webm"
 */
function extractS3Key(url) {
  try {
    const parsed = new URL(url);
    // pathname starts with '/', strip it
    return decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    return null;
  }
}

/**
 * Iterates the flat top-level entries of an `answers` object and replaces any
 * raw S3 URL string with a 1-hour presigned GET URL. Non-URL values (strings
 * like screeningFlag, nested objects like gradingResults) are left untouched.
 * Errors for individual keys are caught and fall back to the original value.
 */
async function presignAnswers(answers) {
  if (!answers || typeof answers !== "object") return answers;

  const entries = Object.entries(answers);
  const presigned = await Promise.all(
    entries.map(async ([k, v]) => {
      if (!isS3Url(v)) return [k, v];
      const key = extractS3Key(v);
      if (!key) return [k, v];
      try {
        const signedUrl = await getPresignedReadUrl(key, 3600);
        return [k, signedUrl];
      } catch (err) {
        console.error(`[presignAnswers] Failed to sign key "${key}":`, err.message);
        return [k, v]; // fall back to original URL
      }
    })
  );

  return Object.fromEntries(presigned);
}

const SubmissionSchema = z.object({
  submissionId: z.string().min(1),
  testType: z.enum(["mini-cog", "mmse"]).default("mini-cog"),
  secondaryLanguage: z.string().optional().default(""),
  targetWordsEnglish: z.array(z.string()).min(3).max(3),
  targetWordsSecondary: z.array(z.string()).min(3).max(3).optional(),
  clientTimeZone: z.string().min(1),
  locationGroundTruth: z.object({
    state: z.string().optional().default(""),
    county: z.string().optional().default(""),
    town: z.string().optional().default(""),
    display_name: z.string().optional(),
    address: z.any().optional(),
  }).optional(),
  patient: z.object({
    identifier: z.string().min(1),
    age: optionalNumber(0, 125),
    gender: z.string().optional().default(""),
    educationYears: optionalNumber(0, 40),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  answers: z.record(z.any()),
});

function normalizeSubmission(payload) {
  return {
    submissionId: payload.submissionId,
    patient: {
      ...payload.patient,
      age: payload.patient.age !== undefined ? Number(payload.patient.age) : undefined,
      educationYears: payload.patient.educationYears !== undefined ? Number(payload.patient.educationYears) : undefined,
      latitude: payload.patient.latitude !== undefined ? Number(payload.patient.latitude) : undefined,
      longitude: payload.patient.longitude !== undefined ? Number(payload.patient.longitude) : undefined,
    },
    testType: payload.testType,
    secondaryLanguage: payload.secondaryLanguage,
    targetWordsEnglish: payload.targetWordsEnglish,
    targetWordsSecondary: payload.targetWordsSecondary,
    clientTimeZone: payload.clientTimeZone,
    locationGroundTruth: payload.locationGroundTruth,
    answers: payload.answers,
  };
}

export async function POST(request) {
  if (!isAwsConfigured()) {
    return Response.json(
      { message: "AWS Credentials are not configured. Please set them in your .env file." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tash_session");
    
    if (!sessionCookie || !sessionCookie.value) {
      return Response.json({ message: "Not authenticated." }, { status: 401 });
    }

    const payload = verifyToken(sessionCookie.value);
    if (!payload || !payload.userId) {
      return Response.json({ message: "Invalid or expired session." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { message: "Submission is missing required fields.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const submission = normalizeSubmission(parsed.data);
    const timestamp = new Date().toISOString();
    const tableName = "tash-core";

    const dbItem = {
      PK: `USER#${payload.userId}`,
      SK: `SUBMISSION#${timestamp}`,
      submissionId: submission.submissionId,
      userId: payload.userId,
      testType: submission.testType,
      secondaryLanguage: submission.secondaryLanguage,
      targetWordsEnglish: submission.targetWordsEnglish,
      targetWordsSecondary: submission.targetWordsSecondary,
      clientTimeZone: submission.clientTimeZone,
      locationGroundTruth: submission.locationGroundTruth,
      patient: submission.patient,
      answers: submission.answers,
      createdAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: dbItem,
      })
    );

    // Asynchronous, non-blocking webhook trigger for AI Evaluator Lambda
    const evaluatorUrl = process.env.AI_EVALUATOR_URL || process.env.AWS_GRADER_URL;
    if (evaluatorUrl) {
      const graderToken = process.env.GRADER_SECRET_TOKEN || "";
      fetch(evaluatorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${graderToken}`
        },
        body: JSON.stringify({
          PK: dbItem.PK,
          SK: dbItem.SK
        })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          console.error(`AI Evaluator Webhook failed with status ${res.status}:`, errText);
        }
      })
      .catch(err => {
        console.error("Failed to trigger AI Evaluator Webhook due to network error:", err);
      });
    }

    return Response.json({ record: dbItem, storageMode: "dynamodb" }, { status: 201 });
  } catch (error) {
    console.error("Submission POST error:", error);
    return Response.json({ message: "Failed to save submission." }, { status: 500 });
  }
}

export async function GET(request) {
  if (!isAwsConfigured()) {
    return Response.json(
      { message: "AWS Credentials are not configured." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tash_session");
    
    if (!sessionCookie || !sessionCookie.value) {
      return Response.json({ message: "Not authenticated." }, { status: 401 });
    }

    const payload = verifyToken(sessionCookie.value);
    if (!payload || !payload.userId) {
      return Response.json({ message: "Invalid or expired session." }, { status: 401 });
    }

    const tableName = "tash-core";
    const userPK = `USER#${payload.userId}`;

    // Fetch submissions from DynamoDB using QueryCommand
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": userPK,
          ":sk": "SUBMISSION#",
        },
        ScanIndexForward: false, // Descending order (newest first)
      })
    );

    // Replace raw S3 object URLs in each submission's answers with presigned
    // 1-hour GET URLs so the browser can load images and play audio directly.
    const rawItems = result.Items || [];
    const signedItems = await Promise.all(
      rawItems.map(async (item) => {
        if (!item.answers) return item;
        const signedAnswers = await presignAnswers(item.answers);
        return { ...item, answers: signedAnswers };
      })
    );

    return Response.json({ submissions: signedItems, storageMode: "dynamodb" });

  } catch (error) {
    console.error("Fetch submissions error:", error);
    return Response.json({ message: "Failed to fetch submissions." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const allowDeletion = process.env.NEXT_PUBLIC_ALLOW_RECORD_DELETION === "true";
  if (!allowDeletion) {
    return Response.json(
      { message: "Record deletion is disabled." },
      { status: 403 }
    );
  }

  if (!isAwsConfigured()) {
    return Response.json(
      { message: "AWS Credentials are not configured." },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tash_session");
    
    if (!sessionCookie || !sessionCookie.value) {
      return Response.json({ message: "Not authenticated." }, { status: 401 });
    }

    const payload = verifyToken(sessionCookie.value);
    if (!payload || !payload.userId) {
      return Response.json({ message: "Invalid or expired session." }, { status: 401 });
    }

    const body = await request.json();
    const { SK } = body;

    if (!SK) {
      return Response.json({ message: "Missing SK in request body." }, { status: 400 });
    }

    const tableName = "tash-core";
    const userPK = `USER#${payload.userId}`;

    // 1. Fetch the submission first to get S3 media URLs
    const getResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: userPK,
          SK: SK
        }
      })
    );

    const submission = getResult.Item;
    if (!submission) {
      return Response.json({ message: "Submission not found." }, { status: 404 });
    }

    // 2. Identify all S3 URLs stored inside submission.answers
    const s3Urls = [];
    if (submission.answers) {
      Object.values(submission.answers).forEach(val => {
        if (isS3Url(val)) {
          s3Urls.push(val);
        }
      });
    }

    // 3. Delete all S3 objects in parallel
    const deletePromises = s3Urls.map(url => deleteS3ObjectByUrl(url));
    await Promise.all(deletePromises);

    // 4. Delete the DynamoDB record
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: userPK,
          SK: SK
        }
      })
    );

    return Response.json({ success: true, message: "Assessment record and S3 assets successfully deleted." });
  } catch (error) {
    console.error("Delete submission error:", error);
    return Response.json({ message: "Failed to delete submission.", error: error.message }, { status: 500 });
  }
}
