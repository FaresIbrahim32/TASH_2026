import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    wordRecallEnglish: { type: String, default: "" },
    wordRecallFirstLanguage: { type: String, default: "" },
    clockNotesEnglish: { type: String, default: "" },
    clockNotesFirstLanguage: { type: String, default: "" },
    clockDrawingDataUrl: { type: String, default: "" },
    clinicianNotes: { type: String, default: "" },
    recallScore: { type: Number, min: 0, max: 3 },
    clockScore: { type: Number, min: 0, max: 2 },
    screeningFlag: {
      type: String,
      enum: ["incomplete", "positive-screen", "negative-screen"],
      default: "incomplete",
    },
  },
  { _id: false },
);

const SubmissionSchema = new mongoose.Schema(
  {
    patient: {
      identifier: { type: String, required: true },
      age: { type: Number, min: 0, max: 125 },
      firstLanguage: { type: String, required: true },
      interpreterUsed: { type: Boolean, default: false },
      educationYears: { type: Number, min: 0, max: 40 },
      culturalContext: { type: String, default: "" },
    },
    testsRendered: [{ type: String }],
    answers: AnswerSchema,
  },
  { timestamps: true },
);

export default mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema);
