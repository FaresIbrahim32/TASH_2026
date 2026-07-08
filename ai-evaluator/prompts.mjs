// Clinical rubrics, prompt templates, and strict OpenAPI JSON schemas for Gemini evaluation

export const SYSTEM_INSTRUCTION = "You are a senior clinical neurologist with experience in digital cognitive screenings. Grade the patient's performance objectively according to standardized clinical scoring guidelines.";

export const CLOCK_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Score assigned. Must be exactly 2 for normal clock, or 0 for abnormal clock." },
    rationale: { type: "STRING", description: "Visual audit details explaining the presence and ordering of numbers 1-12, the circular shape, and hand placements — including which hand is visibly shorter (hour hand) vs longer (minute hand), and which number each one points to." }
  },
  required: ["score", "rationale"]
};

export const RECALL_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Number of words correctly recalled (0 to 3)." },
    recalledWords: { type: "ARRAY", items: { type: "STRING" }, description: "List of words recalled by the patient." },
    transcript: { type: "STRING", description: "Verbatim transcription of what the patient said in the audio clip." },
    rationale: { type: "STRING", description: "Comparison between patient spoken words and targets, detailing matches and omissions." }
  },
  required: ["score", "recalledWords", "transcript", "rationale"]
};

export const TEMPORAL_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Orientation temporal score (0 to 5)." },
    transcript: { type: "STRING", description: "Verbatim transcription of the spoken answers." },
    rationale: { type: "STRING", description: "Auditing detail explaining matches and errors between spoken text and target orientation values." }
  },
  required: ["score", "transcript", "rationale"]
};

export const SPATIAL_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Orientation spatial score (0 to 3)." },
    transcript: { type: "STRING", description: "Verbatim transcription of the spoken answers." },
    rationale: { type: "STRING", description: "Auditing detail explaining matches and errors between spoken text and ground truth location values." }
  },
  required: ["score", "transcript", "rationale"]
};

export const ATTENTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Attention/calculation score (0 to 5)." },
    taskPerformed: { type: "STRING", description: "Identify which task they performed: 'subtraction' or 'spelling'." },
    transcript: { type: "STRING", description: "Verbatim transcription of the spoken response." },
    rationale: { type: "STRING", description: "Detailing the sequence checks (correct numbers or backward letters) and errors." }
  },
  required: ["score", "taskPerformed", "transcript", "rationale"]
};

export const REPETITION_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Score assigned. Must be exactly 1 if the patient repeated the phrase correctly (minor articulation differences allowed), otherwise 0." },
    transcript: { type: "STRING", description: "Verbatim transcription of what the patient said in the audio clip." },
    rationale: { type: "STRING", description: "Comparison between what the patient said and the target phrase, explaining why the score was assigned." }
  },
  required: ["score", "transcript", "rationale"]
};

export const WRITING_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Score assigned. Must be exactly 1 if sentence has a subject/verb and makes sense, otherwise 0." },
    rationale: { type: "STRING", description: "Grammatical analysis of subject, verb, and semantic coherence." }
  },
  required: ["score", "rationale"]
};

export const PENTAGON_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER", description: "Score assigned. Must be exactly 1 for correct intersecting pentagons copy, otherwise 0." },
    rationale: { type: "STRING", description: "Visual analysis explaining shape identification, sides count, and intersection characteristics." }
  },
  required: ["score", "rationale"]
};

// Prompt templates dynamically generated based on target inputs
export const prompts = {
  clockDrawing: () =>
    `Evaluate this hand-drawn clock image for Mini-Cog screening.
    Determine if it is a normal clock drawing. To be 'normal' (2 points), it must have:
    1. A closed circular boundary.
    2. All numbers 1-12 present in correct order and sequence in their approximate positions.
    3. Exactly two hands meeting at a center, clearly differentiated by length: a visibly SHORTER hour hand and a visibly LONGER minute hand. The shorter hour hand must point to/near 11, and the longer minute hand must point to/near 2 (representing 10 past 11).

    If any criteria are missed, score it 0. Do not assign 1 point. This includes: missing numbers, incorrect sequence, numbers outside the circle, only one hand or more than two hands, hands of equal or indistinguishable length (so hour vs. minute cannot be told apart), or the hour/minute hands reversed (e.g. the longer hand at 11 and the shorter hand at 2) even if both hands point at roughly the right numbers.
    In the rationale, explicitly state which drawn hand is shorter, which is longer, and which number each points to.
    Return the score (0 or 2) and visual audit rationale.`,

  wordRecall: (targetWords) => 
    `The patient was asked to recall three words. The target words are: [${targetWords.join(", ")}].
    Listen to the audio and determine which target words they successfully recalled.
    Score 1 point for each correct target word recalled without prompt assistance (maximum score of 3).
    Minor accents or pronunciation differences should be tolerated.
    Return the verbatim transcript of the audio, the recalled words list, the final score, and rationale.`,

  temporalOrientation: (target) => 
    `The patient was asked orientation questions. 
    Compare what they say in the audio against the target orientation details:
    - Current Year: ${target.year}
    - Current Season: ${target.season}
    - Current Month: ${target.month}
    - Current Date: ${target.date}
    - Current Day of week: ${target.day}
    
    Score 1 point for each correct answer (maximum score of 5).
    Return the transcript of the audio, the final score, and rationale.`,

  spatialOrientation: (target) => 
    `The patient was asked spatial location orientation questions.
    Compare what they say in the audio against the ground truth location details:
    - State: ${target.state || "Unknown"}
    - County: ${target.county || "Unknown"}
    - Town/City: ${target.town || "Unknown"}
    ${target.display_name ? `\n    Full address context (for reference): ${target.display_name}` : ""}
    Score 1 point for each correct answer (maximum score of 3).
    If a ground truth value is listed as "Unknown", use the full address context above to infer it where possible; if still unresolvable, mark that field as not gradeable and do not penalise the patient.
    Return the transcript of the audio, the final score, and rationale.`,

  registration: (targetWords) => 
    `The patient was asked to repeat three target words immediately. The target words are: [${targetWords.join(", ")}].
    Listen to the audio and score 1 point for each target word they successfully repeated (maximum score of 3).
    Return the transcript of the audio, the final score, and rationale.`,

  attentionCalculation: () => 
    `The patient was asked to perform an attention/calculation task:
    - Option A: Subtract 7 from 100 recursively 5 times (resulting in: 93, 86, 79, 72, 65).
    - Option B: Spell the word "WORLD" backwards (D - L - R - O - W).
    
    Score 1 point for each correct subtraction step OR correct letter in sequence (maximum score of 5).
    Important clinical rule for Option A: If the patient makes a mathematical error but subtracts 7 correctly from their new incorrect number on subsequent steps, count those subsequent steps as correct (e.g., if they say 100 - 7 = 92 [error, 0 points], but then say 85, 78, 71, 64 [all correct relative to 92], they receive 4 out of 5 points).
    Listen to the audio, determine which task they did, transcribe their response, score it, and provide your rationale.`,

  repetition: (targetPhrase) => 
    `The patient was asked to repeat a phrase. The target phrase is: "${targetPhrase}".
    Listen to the audio and score 1 point if they repeated it exactly or with negligible articulation differences, otherwise score 0.
    Return the transcript of the audio, the final score, and rationale.`,

  writingSentence: (writtenSentence, lang = "en") => {
    const langNames = { en: "English", es: "Spanish", "zh-TW": "Chinese (Traditional)", ar: "Arabic" };
    const langName = langNames[lang] || "English";
    return `The patient was asked to write a sentence on any topic in ${langName}.
    Evaluate the patient's written sentence: "${writtenSentence}".
    Score 1 point if ALL of the following are true: (1) the sentence contains a subject and a verb, (2) it has a clear semantic meaning, AND (3) it is written in ${langName}. Correct spelling and punctuation are not strictly required.
    If the sentence is empty, incomplete, lacks a subject/verb, or is written in a language other than ${langName}, score 0.
    Return the score (0 or 1) and your rationale.`;
  },

  pentagonCopy: () => 
    `Evaluate this hand-drawn image for the MMSE intersecting pentagon copy task.
    Score 1 point if it is a correct copy of the intersecting pentagons.
    To receive 1 point:
    1. Both shapes must be pentagons (five distinct sides/angles).
    2. The two pentagons must intersect/overlap.
    3. The intersection/overlap must form a four-sided shape (quadrilateral).
    
    If any of these criteria are missed (e.g. wrong number of sides, missing overlap, circles drawn, etc.), score 0.
    Return the score (0 or 1) and your visual rationale.`
};
