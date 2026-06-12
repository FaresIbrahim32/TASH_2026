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
  patient: z.object({
    identifier: z.string().min(1),
    age: optionalNumber(0, 125),
    firstLanguage: z.string().min(1),
    interpreterUsed: z.boolean().default(false),
    educationYears: optionalNumber(0, 40),
    culturalContext: z.string().optional().default(""),
  }),
  answers: z.object({
    wordRecallEnglish: z.string().optional().default(""),
    wordRecallFirstLanguage: z.string().optional().default(""),
    clockNotesEnglish: z.string().optional().default(""),
    clockNotesFirstLanguage: z.string().optional().default(""),
    clockDrawingDataUrl: z.string().optional().default(""),
    clinicianNotes: z.string().optional().default(""),
    recallScore: optionalNumber(0, 3),
    clockScore: optionalNumber(0, 2),
  }),
});

function normalizeOptionalNumber(value) {
  return value === "" || value === undefined ? undefined : Number(value);
}

function normalizeSubmission(payload) {
  const firstLanguage = payload.patient.firstLanguage;
  const rendered = ["en"];

  if (firstLanguage !== "en" && languageTests[firstLanguage]?.imported) {
    rendered.push(firstLanguage);
  }

  const recallScore = normalizeOptionalNumber(payload.answers.recallScore);
  const clockScore = normalizeOptionalNumber(payload.answers.clockScore);

  return {
    patient: {
      ...payload.patient,
      age: normalizeOptionalNumber(payload.patient.age),
      educationYears: normalizeOptionalNumber(payload.patient.educationYears),
    },
    testsRendered: rendered,
    answers: {
      ...payload.answers,
      recallScore,
      clockScore,
      screeningFlag: calculateMiniCogFlag({ recallScore, clockScore }),
    },
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
    const submissionId = "sub_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    const timestamp = new Date().toISOString();
    const tableName = "tash-core";

    const dbItem = {
      PK: `USER#${payload.userId}`,
      SK: `SUBMISSION#${timestamp}`,
      submissionId,
      userId: payload.userId,
      testType: "mini-cog",
      testsRendered: submission.testsRendered,
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
