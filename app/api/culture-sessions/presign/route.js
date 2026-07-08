import { cookies } from "next/headers";
import { verifyToken } from "../../../lib/auth";
import { getPresignedUploadUrl } from "../../../lib/s3";
import { isAwsConfigured } from "../../../lib/dynamodb";

// Same shape as app/api/submissions/presign/route.js — presigns one PUT URL
// per file (the 4 answer clips, plus the session video when present).
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
    const { sessionId, files } = body;

    if (!sessionId || !Array.isArray(files) || files.length === 0) {
      return Response.json(
        { message: "Missing required fields: sessionId and files array." },
        { status: 400 }
      );
    }

    const urlMap = {};
    const promises = files.map(async (file) => {
      const { key, contentType } = file;
      if (!key || !contentType) {
        throw new Error("Invalid file details in request.");
      }
      const result = await getPresignedUploadUrl(payload.userId, sessionId, key, contentType);
      urlMap[key] = result;
    });

    await Promise.all(promises);

    return Response.json({ files: urlMap }, { status: 200 });
  } catch (error) {
    console.error("Culture session presigned URL generator error:", error);
    return Response.json(
      { message: "Failed to generate presigned upload URLs.", error: error.message },
      { status: 500 }
    );
  }
}
