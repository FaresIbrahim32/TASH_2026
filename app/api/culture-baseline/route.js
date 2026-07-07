import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, isAwsConfigured } from "../../lib/dynamodb";
import { cookies } from "next/headers";
import { verifyToken } from "../../lib/auth";

// Fetches this login account's saved facial-behavior baseline (if one exists),
// so the client can feed it into useFaceTracking's scoreSession() before a
// Cultural Face Screen session starts. This is a per-user tool (one baseline
// per login, no patient identifier). Returns { baseline: null } for the first
// session — that session goes on to become the baseline once submitted (see
// app/api/culture-sessions/route.js POST).
export async function GET(request) {
  if (!isAwsConfigured()) {
    return Response.json({ message: "AWS Credentials are not configured." }, { status: 500 });
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

    const result = await docClient.send(
      new GetCommand({
        TableName: "tash-core",
        Key: { PK: `USER#${payload.userId}`, SK: "FACE_BASELINE" },
      })
    );

    return Response.json({ baseline: result.Item?.summary || null });
  } catch (error) {
    console.error("Culture baseline GET error:", error);
    return Response.json({ message: "Failed to fetch baseline." }, { status: 500 });
  }
}
