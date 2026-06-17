import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, isAwsConfigured } from "../../../lib/dynamodb";
import { cookies } from "next/headers";
import { verifyToken } from "../../../lib/auth";

export async function POST(request) {
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
    const PK = `USER#${payload.userId}`;

    // 1. Fetch submission first to verify ownership
    const getRes = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK, SK }
      })
    );

    if (!getRes.Item) {
      return Response.json({ message: "Submission not found or unauthorized access." }, { status: 404 });
    }

    // 2. Reset the grading status fields in DynamoDB
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK, SK },
        UpdateExpression: "REMOVE answers.screeningFlag, answers.totalScore, answers.maxScore, answers.gradedAt, answers.gradingExplanation, answers.gradingResults",
      })
    );

    // 3. Trigger the AWS Lambda Grader asynchronously
    const evaluatorUrl = process.env.AI_EVALUATOR_URL || process.env.AWS_GRADER_URL;
    if (evaluatorUrl) {
      const graderToken = process.env.GRADER_SECRET_TOKEN || "";
      fetch(evaluatorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${graderToken}`
        },
        body: JSON.stringify({ PK, SK })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          console.error(`AI Evaluator Regrade Webhook failed with status ${res.status}:`, errText);
        }
      })
      .catch(err => {
        console.error("Failed to trigger AI Evaluator Regrade Webhook due to network error:", err);
      });
    }

    return Response.json({ message: "Regrade triggered successfully." }, { status: 200 });
  } catch (error) {
    console.error("Regrade POST error:", error);
    return Response.json({ message: "Failed to trigger regrade." }, { status: 500 });
  }
}
