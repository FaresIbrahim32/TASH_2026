import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { calculateMiniCogFlag, languageTests } from "../../lib/tests";
import { connectMongo } from "../../lib/mongodb";
import Submission from "../../models/Submission";

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

const dataFile = path.join(process.cwd(), "data", "submissions.json");

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

async function saveLocalFallback(submission) {
  await mkdir(path.dirname(dataFile), { recursive: true });

  let existing = [];
  try {
    existing = JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    existing = [];
  }

  const record = {
    _id: crypto.randomUUID(),
    ...submission,
    createdAt: new Date().toISOString(),
    storageMode: "local-json",
  };

  existing.push(record);
  await writeFile(dataFile, JSON.stringify(existing, null, 2));
  return record;
}

export async function POST(request) {
  const body = await request.json();
  const parsed = SubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { message: "Submission is missing required fields.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const submission = normalizeSubmission(parsed.data);
  const mongo = await connectMongo();

  if (!mongo) {
    const record = await saveLocalFallback(submission);
    return Response.json({ record, storageMode: "local-json" }, { status: 201 });
  }

  const record = await Submission.create(submission);
  return Response.json({ record, storageMode: "mongodb" }, { status: 201 });
}
