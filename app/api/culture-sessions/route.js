import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, isAwsConfigured } from "../../lib/dynamodb";
import { deleteS3ObjectByUrl, getPresignedReadUrl } from "../../lib/s3";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifyToken } from "../../lib/auth";

const TABLE_NAME = "tash-core";

// Picture scenario carries an uploaded audio clip (transcribed by the Lambda).
// Game scenarios are multiple-choice, scored client-side on click — no audio.
const ScenarioSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["picture", "game"]),
  question: z.string().optional(),
  prompt: z.string().optional(),
  expectedAnswer: z.string().optional(),
  options: z.array(z.string()).optional(),
  selectedAnswer: z.string().nullable().optional(),
  correct: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().optional(),
});

const CultureSessionSchema = z.object({
  sessionId: z.string().min(1),
  language: z.string().min(1),
  scenarios: z.array(ScenarioSchema).min(1),
  faceTracking: z.object({
    trackingQuality: z.number().optional(),
    blinkRatePerMin: z.number().optional(),
    headMotionScore: z.number().optional(),
    gazeMotionScore: z.number().optional(),
    mouthMotionScore: z.number().optional(),
    expressionVariability: z.number().optional(),
    sampleCount: z.number().optional(),
    flag: z.object({
      level: z.string(),
      severity: z.string(),
      reasons: z.array(z.string()),
    }),
  }),
  gameScore: z.object({
    correct: z.number(),
    total: z.number(),
  }).optional(),
  videoConsent: z.boolean().default(true),
  sessionVideoUrl: z.string().nullable().optional(),
});

/** Returns true if the value is a raw S3 object URL belonging to our bucket. */
function isS3Url(val) {
  return typeof val === "string" && val.includes(".s3.") && val.includes(".amazonaws.com/");
}

function extractS3Key(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return null;
  }
}

/** Replaces a raw S3 URL with a 1-hour presigned GET URL; leaves anything else untouched. */
async function presignIfS3(url) {
  if (!isS3Url(url)) return url;
  const key = extractS3Key(url);
  if (!key) return url;
  try {
    return await getPresignedReadUrl(key, 3600);
  } catch (err) {
    console.error(`[culture-sessions] Failed to presign key "${key}":`, err.message);
    return url;
  }
}

async function requireSession(request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tash_session");
  if (!sessionCookie || !sessionCookie.value) {
    return { error: Response.json({ message: "Not authenticated." }, { status: 401 }) };
  }
  const payload = verifyToken(sessionCookie.value);
  if (!payload || !payload.userId) {
    return { error: Response.json({ message: "Invalid or expired session." }, { status: 401 }) };
  }
  return { userId: payload.userId };
}

export async function POST(request) {
  if (!isAwsConfigured()) {
    return Response.json({ message: "AWS Credentials are not configured." }, { status: 500 });
  }

  try {
    const auth = await requireSession(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = CultureSessionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { message: "Culture session is missing required fields.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const timestamp = new Date().toISOString();
    const PK = `USER#${auth.userId}`;

    const dbItem = {
      PK,
      SK: `CULTURE#${timestamp}`,
      sessionId: data.sessionId,
      userId: auth.userId,
      language: data.language,
      scenarios: data.scenarios,
      faceTracking: data.faceTracking,
      gameScore: data.gameScore || null,
      videoConsent: data.videoConsent,
      sessionVideoUrl: data.sessionVideoUrl || null,
      grading: null,
      gradedAt: null,
      createdAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: dbItem }));

    // Fire-and-forget grading webhook — same target/auth as app/api/submissions/route.js;
    // the Lambda branches on the SK prefix to route this to the culture grader.
    const evaluatorUrl = process.env.AI_EVALUATOR_URL || process.env.AWS_GRADER_URL;
    if (evaluatorUrl) {
      const graderToken = process.env.GRADER_SECRET_TOKEN || "";
      fetch(evaluatorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${graderToken}` },
        body: JSON.stringify({ PK: dbItem.PK, SK: dbItem.SK }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errText = await res.text();
            console.error(`AI Evaluator Webhook failed with status ${res.status}:`, errText);
          }
        })
        .catch((err) => {
          console.error("Failed to trigger AI Evaluator Webhook due to network error:", err);
        });
    }

    return Response.json({ record: dbItem }, { status: 201 });
  } catch (error) {
    console.error("Culture session POST error:", error);
    return Response.json({ message: "Failed to save culture session." }, { status: 500 });
  }
}

export async function GET(request) {
  if (!isAwsConfigured()) {
    return Response.json({ message: "AWS Credentials are not configured." }, { status: 500 });
  }

  try {
    const auth = await requireSession(request);
    if (auth.error) return auth.error;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `USER#${auth.userId}`, ":sk": "CULTURE#" },
        ScanIndexForward: false,
      })
    );

    const rawItems = result.Items || [];
    const signedItems = await Promise.all(
      rawItems.map(async (item) => {
        // Only the picture scenario carries audio; games have none.
        const scenarios = await Promise.all(
          (item.scenarios || []).map(async (s) => (s.audioUrl ? { ...s, audioUrl: await presignIfS3(s.audioUrl) } : s))
        );
        const sessionVideoUrl = item.sessionVideoUrl ? await presignIfS3(item.sessionVideoUrl) : null;
        return { ...item, scenarios, sessionVideoUrl };
      })
    );

    return Response.json({ sessions: signedItems });
  } catch (error) {
    console.error("Culture session GET error:", error);
    return Response.json({ message: "Failed to fetch culture sessions." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const allowDeletion = process.env.NEXT_PUBLIC_ALLOW_RECORD_DELETION === "true";
  if (!allowDeletion) {
    return Response.json({ message: "Record deletion is disabled." }, { status: 403 });
  }

  if (!isAwsConfigured()) {
    return Response.json({ message: "AWS Credentials are not configured." }, { status: 500 });
  }

  try {
    const auth = await requireSession(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { SK } = body;
    if (!SK) {
      return Response.json({ message: "Missing SK in request body." }, { status: 400 });
    }

    const PK = `USER#${auth.userId}`;

    const getResult = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));
    const session = getResult.Item;
    if (!session) {
      return Response.json({ message: "Culture session not found." }, { status: 404 });
    }

    const s3Urls = [];
    (session.scenarios || []).forEach((s) => {
      if (isS3Url(s.audioUrl)) s3Urls.push(s.audioUrl);
    });
    if (isS3Url(session.sessionVideoUrl)) s3Urls.push(session.sessionVideoUrl);

    await Promise.all(s3Urls.map((url) => deleteS3ObjectByUrl(url)));
    await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));

    return Response.json({ success: true, message: "Culture session and its media were deleted." });
  } catch (error) {
    console.error("Culture session DELETE error:", error);
    return Response.json({ message: "Failed to delete culture session.", error: error.message }, { status: 500 });
  }
}
