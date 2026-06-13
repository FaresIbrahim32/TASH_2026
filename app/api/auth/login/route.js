import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";
import { docClient, isAwsConfigured } from "../../../lib/dynamodb";
import { verifyPassword, signToken } from "../../../lib/auth";

export async function POST(request) {
  if (!isAwsConfigured()) {
    return Response.json(
      { message: "AWS Credentials are not configured. Please set them in your .env file." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const tableName = "tash-core";
    const emailPK = `EMAIL#${trimmedEmail}`;
    const emailSK = "LOOKUP";

    // 1. Get userId from email lookup
    const lookupResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: emailPK,
          SK: emailSK,
        },
      })
    );

    const lookupItem = lookupResult.Item;
    if (!lookupItem || !lookupItem.userId) {
      return Response.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const userId = lookupItem.userId;
    const userPK = `USER#${userId}`;
    const userSK = "METADATA";

    // 2. Fetch user metadata item from DynamoDB
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
      return Response.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 3. Verify hashed password
    const isPasswordCorrect = verifyPassword(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return Response.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 4. Create session token
    const sessionPayload = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
    const token = signToken(sessionPayload);


    // 4. Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "tash_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return Response.json(
      {
        message: "Login successful.",
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          gender: user.gender,
          age: user.age,
          educationYears: user.educationYears,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login API error:", error);
    return Response.json(
      { message: "An error occurred while logging in." },
      { status: 500 }
    );
  }
}
