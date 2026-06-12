import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";
import { docClient, isAwsConfigured } from "../../../lib/dynamodb";
import { verifyToken } from "../../../lib/auth";

export async function GET() {
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
    const userSK = "METADATA";

    // Fetch fresh user data from DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: userPK,
          SK: userSK,
        },
      })
    );

    const user = result.Item;
    if (!user) {
      return Response.json({ message: "User not found." }, { status: 404 });
    }

    return Response.json(
      {
        authenticated: true,
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          gender: user.gender,
          age: user.age,
          educationYears: user.educationYears,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth-Me API error:", error);
    return Response.json(
      { message: "An error occurred while fetching user profile." },
      { status: 500 }
    );
  }
}
