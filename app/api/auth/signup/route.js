import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { cookies } from "next/headers";
import { docClient, isAwsConfigured } from "../../../lib/dynamodb";
import { hashPassword, signToken } from "../../../lib/auth";

export async function POST(request) {
  if (!isAwsConfigured()) {
    return Response.json(
      { message: "AWS Credentials are not configured. Please set them in your .env file." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, password, gender, age, educationYears } = body;

    // Basic Validation
    if (!firstName || !lastName || !email || !password || !gender || !age || !educationYears) {
      return Response.json(
        { message: "All fields are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const parsedAge = Number(age);
    const parsedEdu = Number(educationYears);

    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 125) {
      return Response.json({ message: "Invalid age." }, { status: 400 });
    }

    if (isNaN(parsedEdu) || parsedEdu < 0 || parsedEdu > 40) {
      return Response.json({ message: "Invalid education years." }, { status: 400 });
    }

    if (!["male", "female", "other"].includes(gender.toLowerCase())) {
      return Response.json({ message: "Invalid gender selection." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }

    const tableName = "tash-core";
    const userPK = `USER#${trimmedEmail}`;
    const userSK = "METADATA";

    // 1. Check if user already exists
    const getResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: userPK,
          SK: userSK,
        },
      })
    );

    if (getResult.Item) {
      return Response.json(
        { message: "Email is already registered." },
        { status: 400 }
      );
    }

    // 2. Hash Password and Create User Item
    const passwordHash = hashPassword(password);
    const userItem = {
      PK: userPK,
      SK: userSK,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: trimmedEmail,
      passwordHash,
      gender: gender.toLowerCase(),
      age: parsedAge,
      educationYears: parsedEdu,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    // 3. Put Item with Condition to prevent race-condition duplicates
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: userItem,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    // 4. Create session token
    const sessionPayload = {
      email: userItem.email,
      firstName: userItem.firstName,
      lastName: userItem.lastName,
      role: userItem.role,
    };
    const token = signToken(sessionPayload);

    // 5. Set HTTP-Only Cookie
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
        message: "User registered successfully.",
        user: {
          firstName: userItem.firstName,
          lastName: userItem.lastName,
          email: userItem.email,
          gender: userItem.gender,
          age: userItem.age,
          educationYears: userItem.educationYears,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up API error:", error);
    if (error.name === "ConditionalCheckFailedException") {
      return Response.json(
        { message: "Email is already registered." },
        { status: 400 }
      );
    }
    return Response.json(
      { message: "An error occurred while creating your account." },
      { status: 500 }
    );
  }
}
