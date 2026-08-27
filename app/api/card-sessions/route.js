import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, isAwsConfigured } from "../../lib/dynamodb";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifyToken } from "../../lib/auth";

const TABLE_NAME = "tash-core";

// Card Recall sessions live under their own SK prefix (CARDGAME#), isolated
// from the Mini-Cog/MMSE submissions and from the culture sessions. There is
// no media and no AI: every response is scored in the browser at click time,
// so this route never touches S3 and never fires the grading webhook.

const ResponseSchema = z.object({
  stage: z.number().int().nonnegative(),
  pairs: z.number().int().positive(),
  attempt: z.number().int().positive(),
  symbolId: z.string().min(1),
  correctPosition: z.number().int().nonnegative(),
  chosenPosition: z.number().int().nonnegative(),
  correct: z.boolean(),
  latencyMs: z.number().nonnegative(),
});

const StageStatSchema = z.object({
  stage: z.number().int().nonnegative(),
  pairs: z.number().int().positive(),
  attempts: z.number().int().positive(),
  firstAttemptErrors: z.number().int().nonnegative(),
  totalErrors: z.number().int().nonnegative(),
  completed: z.boolean(),
});

const CardSessionSchema = z.object({
  sessionId: z.string().min(1),
  language: z.string().min(1),
  responses: z.array(ResponseSchema).min(1),
  stageStats: z.array(StageStatSchema).min(1),
  summary: z.object({
    highestPairsReached: z.number().int().nonnegative(),
    stagesCompleted: z.number().int().nonnegative(),
    totalResponses: z.number().int().nonnegative(),
    correctResponses: z.number().int().nonnegative(),
    accuracyPct: z.number().min(0).max(100),
    totalErrors: z.number().int().nonnegative(),
    firstAttemptErrors: z.number().int().nonnegative(),
    // CANTAB PAL's headline outcome: correct placements on a round's first try.
    firstAttemptMemoryScore: z.number().int().nonnegative().optional(),
    trialsToCriterion: z.number().int().nonnegative(),
    meanLatencyMs: z.number().nonnegative(),
  }),
  durationMs: z.number().nonnegative().optional(),
});

async function requireSession() {
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
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = CardSessionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { message: "Card session is missing required fields.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const timestamp = new Date().toISOString();

    const dbItem = {
      PK: `USER#${auth.userId}`,
      SK: `CARDGAME#${timestamp}`,
      sessionId: data.sessionId,
      userId: auth.userId,
      language: data.language,
      responses: data.responses,
      stageStats: data.stageStats,
      summary: data.summary,
      durationMs: data.durationMs ?? null,
      createdAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: dbItem }));

    return Response.json({ record: dbItem }, { status: 201 });
  } catch (error) {
    console.error("Card session POST error:", error);
    return Response.json({ message: "Failed to save card session." }, { status: 500 });
  }
}

export async function GET() {
  if (!isAwsConfigured()) {
    return Response.json({ message: "AWS Credentials are not configured." }, { status: 500 });
  }

  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `USER#${auth.userId}`, ":sk": "CARDGAME#" },
        ScanIndexForward: false,
      })
    );

    return Response.json({ sessions: result.Items || [] });
  } catch (error) {
    console.error("Card session GET error:", error);
    return Response.json({ message: "Failed to fetch card sessions." }, { status: 500 });
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
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const sk = searchParams.get("sk");
    if (!sk || !sk.startsWith("CARDGAME#")) {
      return Response.json({ message: "A valid card session key is required." }, { status: 400 });
    }

    const PK = `USER#${auth.userId}`;

    // Confirm the record belongs to the caller before deleting it.
    const existing = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { PK, SK: sk } })
    );
    if (!existing.Item) {
      return Response.json({ message: "Card session not found." }, { status: 404 });
    }

    await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK, SK: sk } }));

    return Response.json({ message: "Card session deleted." });
  } catch (error) {
    console.error("Card session DELETE error:", error);
    return Response.json({ message: "Failed to delete card session." }, { status: 500 });
  }
}
