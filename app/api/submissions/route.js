import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, isAwsConfigured } from "../../lib/dynamodb";
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

    return Response.json({ submissions: result.Items || [], storageMode: "dynamodb" });
  } catch (error) {
    console.error("Fetch submissions error:", error);
    return Response.json({ message: "Failed to fetch submissions." }, { status: 500 });
  }
}
