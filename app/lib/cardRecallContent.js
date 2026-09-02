// Content + configuration for the Card Recall activity (app/card-recall/).
//
// A paired-associates visual memory task modelled on the CANTAB Paired
// Associates Learning (PAL) mechanic: symbols are shown in fixed card
// positions during an encoding phase, then each symbol is presented alone and
// the patient indicates which card it occupied.
//
// Deliberately language-neutral in its stimuli — the symbols are abstract
// shapes, never letters, digits, or playing-card suits — so the same task runs
// identically across en/es/ar/zh-TW with only the surrounding UI translated.
// (Playing-card suits are avoided on purpose: they carry gambling
// connotations that are inappropriate in a clinical setting and specifically
// so for the Arabic-speaking patients this app serves.)
//
// This is NOT a validated clinical instrument. It records descriptive metrics
// for clinician review and produces no screening flag — same posture as the
// Facial Behavior & Engagement Screen.

// Total card positions on the board; a round hides `pairs` symbols among them.
//
// Fixed at 8 to stay aligned with CANTAB PAL, which displays 6 boxes for its
// 2/4/6-pattern stages and 8 boxes for the 8-pattern stage. Holding 8 for every
// round makes the earlier rounds *more* distractor-rich than the reference task
// (2/8, 4/8, 6/8 here versus 2/6, 4/6, 6/6 there) while matching it exactly at
// the hardest round. Widening the board further would depart from the validated
// design without evidence, and would shrink the tap targets for elderly users.
export const BOARD_SIZE = 8;

/** Symbol count per round. Escalates until the patient fails a round. */
export const STAGES = [2, 4, 6, 8];

// Re-presentations allowed per round before the activity ends.
//
// 4 matches the unsupervised/online CANTAB PAL variant, which is the closest
// analogue to this task: self-administered, in a browser, without an examiner
// pacing it. (The clinic-administered version allows 6.) Keeping the reference
// value means trials-to-criterion here is comparable to published PAL data
// rather than being an arbitrary local parameter.
export const MAX_ATTEMPTS_PER_STAGE = 4;

/** Milliseconds each card stays open during encoding. */
export const ENCODE_REVEAL_MS = 2200;

/** Milliseconds between one card closing and the next opening. */
export const ENCODE_GAP_MS = 450;

/** Milliseconds the correct/incorrect highlight stays on screen. */
export const FEEDBACK_MS = 900;

// Abstract, culturally neutral shapes. Shape carries the identity and colour is
// secondary, so the set stays distinguishable for colour-vision deficiency.
//
// Every silhouette differs from every other by more than a rotation. An earlier
// set paired a square with a diamond (the same square turned 45 degrees) and a
// triangle with a chevron (near-identical upward outlines); confusable stimuli
// inflate the error count for reasons unrelated to memory, so those two were
// replaced with a droplet and an arch. `diamond` and `chevron` are still
// rendered by SymbolGlyph so sessions recorded before the swap display
// correctly on the dashboard.
export const SYMBOLS = [
  { id: "circle", color: "#0f766e" },
  { id: "square", color: "#b45309" },
  { id: "triangle", color: "#6d28d9" },
  { id: "droplet", color: "#be123c" },
  { id: "star", color: "#a16207" },
  { id: "hexagon", color: "#1d4ed8" },
  { id: "plus", color: "#15803d" },
  { id: "arch", color: "#7c2d12" },
];

// Symbols shown in the unrecorded warm-up round. CANTAB PAL runs a practice
// trial before the scored stages; without one, a patient who has not yet
// grasped the mechanic spends real attempts learning it, and round 1 stops
// measuring memory.
export const PRACTICE_PAIRS = 2;

/** Fisher-Yates shuffle over a copy of the input. */
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Builds one round: picks `pairs` symbols and assigns each to a distinct card
 * position, then returns the order in which they are revealed during encoding
 * and the (separately shuffled) order in which they are tested during recall.
 */
export function buildStage(pairs) {
  const chosenSymbols = shuffle(SYMBOLS).slice(0, pairs);
  const chosenPositions = shuffle([...Array(BOARD_SIZE).keys()]).slice(0, pairs);

  const placements = chosenSymbols.map((symbol, i) => ({
    symbolId: symbol.id,
    color: symbol.color,
    position: chosenPositions[i],
  }));

  return {
    pairs,
    placements,
    encodeOrder: shuffle(placements),
    recallOrder: shuffle(placements),
  };
}

export const cardRecallUI = {
  en: {
    aboutTitle: "About this activity",
    aboutText:
      "A short visuospatial memory activity modelled on the CANTAB Paired Associates Learning (PAL) task. A practice round is followed by rounds of 2, 4, 6 and 8 symbols, roughly five minutes in all. It is unscored: descriptive measures only, and not a validated instrument.",
    demoStep1: "A card opens and shows a symbol.",
    demoStep2: "Then that symbol appears on its own.",
    demoStep3: "Tap the card where you saw it.",
    practiceLabel: "Practice round",
    practiceNote: "This round is practice. It is not recorded.",
    practiceComplete: "Practice complete \u2014 let's begin.",
    label: "English",
    nativeLabel: "English",
    direction: "ltr",
    voiceLocale: "en-US",
    title: "Card Recall",
    tagline: "A short visual memory activity",
    setupTitle: "Card Recall Setup",
    languageLabel: "Session language",
    startSetup: "Continue",
    instructionsTitle: "How it works",
    instructions:
      "You will see a row of cards. One at a time, a card opens and shows you a symbol. Try to remember which card each symbol was in. Then a symbol appears on its own, and you tap the card where you saw it.",
    begin: "Begin",
    listen: "Listen",
    watchTitle: "Watch carefully",
    recallPrompt: "Where was this symbol?",
    correct: "Correct",
    incorrect: "Not quite",
    roundLabel: "Round",
    ofLabel: "of",
    attemptLabel: "Attempt",
    retryRound: "Let's try that round once more.",
    roundComplete: "Round complete",
    sessionComplete: "Activity complete",
    resultsTitle: "Results",
    saving: "Saving results...",
    saveFailed: "Could not save the results.",
    backToDashboard: "Back to Dashboard",
    playAgain: "Run again",
    unscoredNote:
      "This activity is not a diagnostic test. It records descriptive memory measures for clinician review only.",
    mHighestRound: "Rounds cleared",
    mFams: "First-attempt memory score",
    mAccuracySub: "taps correct",
    mTotalErrorsSub: "wrong taps across all attempts",
    colErrors: "Wrong taps",
    legendMiss: "Misses show the card tapped → where the symbol actually was.",
    colAttemptsUsed: "Attempts used",
    resCleared: "Cleared",
    resFailed: "Not cleared",
    mAccuracy: "Overall accuracy",
    mTotalErrors: "Total errors",
    mAvgResponse: "Average response time",
    perRoundTitle: "Round by round",
    responsesTitle: "Every answer",
    colRound: "Round",
    colAttempt: "Attempt",
    colSymbol: "Symbols",
    cardLabel: "Card",
    seconds: "s",
  },

  es: {
    aboutTitle: "Acerca de esta actividad",
    aboutText:
      "Una breve actividad de memoria visoespacial basada en la prueba Paired Associates Learning (PAL) de CANTAB. Tras una ronda de práctica siguen rondas de 2, 4, 6 y 8 símbolos, unos cinco minutos en total. No se puntúa: solo registra medidas descriptivas y no es un instrumento validado.",
    demoStep1: "Una carta se abre y muestra un s\u00edmbolo.",
    demoStep2: "Despu\u00e9s ese s\u00edmbolo aparece solo.",
    demoStep3: "Toque la carta donde lo vio.",
    practiceLabel: "Ronda de pr\u00e1ctica",
    practiceNote: "Esta ronda es de pr\u00e1ctica. No se registra.",
    practiceComplete: "Pr\u00e1ctica completada: empecemos.",
    label: "Spanish",
    nativeLabel: "Español",
    direction: "ltr",
    voiceLocale: "es-US",
    title: "Recuerdo de Cartas",
    tagline: "Una breve actividad de memoria visual",
    setupTitle: "Configuración de Recuerdo de Cartas",
    languageLabel: "Idioma de la sesión",
    startSetup: "Continuar",
    instructionsTitle: "Cómo funciona",
    instructions:
      "Verá una fila de cartas. Una por una, cada carta se abrirá y le mostrará un símbolo. Trate de recordar en qué carta estaba cada símbolo. Después aparecerá un símbolo solo, y usted debe tocar la carta donde lo vio.",
    begin: "Comenzar",
    listen: "Escuchar",
    watchTitle: "Observe con atención",
    recallPrompt: "¿Dónde estaba este símbolo?",
    correct: "Correcto",
    incorrect: "No exactamente",
    roundLabel: "Ronda",
    ofLabel: "de",
    attemptLabel: "Intento",
    retryRound: "Intentemos esa ronda una vez más.",
    roundComplete: "Ronda completada",
    sessionComplete: "Actividad completada",
    resultsTitle: "Resultados",
    saving: "Guardando resultados...",
    saveFailed: "No se pudieron guardar los resultados.",
    backToDashboard: "Volver al panel",
    playAgain: "Repetir",
    unscoredNote:
      "Esta actividad no es una prueba diagnóstica. Solo registra medidas descriptivas de memoria para revisión clínica.",
    mHighestRound: "Rondas superadas",
    mFams: "Puntuación de memoria en el primer intento",
    mAccuracySub: "toques correctos",
    mTotalErrorsSub: "toques incorrectos en todos los intentos",
    colErrors: "Toques incorrectos",
    legendMiss: "Los fallos muestran la carta tocada → dónde estaba realmente el símbolo.",
    colAttemptsUsed: "Intentos usados",
    resCleared: "Superada",
    resFailed: "No superada",
    mAccuracy: "Precisión general",
    mTotalErrors: "Errores totales",
    mAvgResponse: "Tiempo promedio de respuesta",
    perRoundTitle: "Ronda por ronda",
    responsesTitle: "Cada respuesta",
    colRound: "Ronda",
    colAttempt: "Intento",
    colSymbol: "Símbolos",
    cardLabel: "Carta",
    seconds: "s",
  },

  "zh-TW": {
    aboutTitle: "關於此活動",
    aboutText:
      "一項簡短的視覺空間記憶活動，設計依據為 CANTAB 配對聯想學習測驗（PAL）。先進行一回合練習，接著依序為 2、4、6、8 個圖形的回合，全程約五分鐘。本活動不計分，僅記錄描述性指標，並非經過驗證的臨床工具。",
    demoStep1: "一張紙牌翻開，顯示一個圖形。",
    demoStep2: "接著該圖形會單獨出現。",
    demoStep3: "請點選您看到它的那張紙牌。",
    practiceLabel: "練習回合",
    practiceNote: "本回合為練習，不會記錄。",
    practiceComplete: "練習完成——現在開始。",
    label: "Chinese",
    nativeLabel: "中文",
    direction: "ltr",
    voiceLocale: "zh-TW",
    title: "紙牌記憶",
    tagline: "簡短的視覺記憶活動",
    setupTitle: "紙牌記憶設定",
    languageLabel: "測驗語言",
    startSetup: "繼續",
    instructionsTitle: "進行方式",
    instructions:
      "您會看到一排卡片。卡片會一張一張打開，並顯示一個圖形。請記住每個圖形出現在哪一張卡片上。接著會單獨顯示一個圖形，請點選您看到它的那張卡片。",
    begin: "開始",
    listen: "聆聽",
    watchTitle: "請仔細觀看",
    recallPrompt: "這個圖形在哪一張卡片上？",
    correct: "正確",
    incorrect: "不正確",
    roundLabel: "回合",
    ofLabel: "／共",
    attemptLabel: "第幾次嘗試",
    retryRound: "我們再試一次這個回合。",
    roundComplete: "回合完成",
    sessionComplete: "活動完成",
    resultsTitle: "結果",
    saving: "正在儲存結果...",
    saveFailed: "無法儲存結果。",
    backToDashboard: "返回儀表板",
    playAgain: "再做一次",
    unscoredNote: "此活動不是診斷測驗，僅記錄描述性的記憶指標供臨床人員參考。",
    mHighestRound: "通過的回合數",
    mFams: "首次嘗試記憶分數",
    mAccuracySub: "次作答正確",
    mTotalErrorsSub: "所有嘗試中點錯的次數",
    colErrors: "點錯次數",
    legendMiss: "答錯時顯示：點選的卡片 → 圖形實際所在的卡片。",
    colAttemptsUsed: "使用的嘗試次數",
    resCleared: "通過",
    resFailed: "未通過",
    mAccuracy: "整體正確率",
    mTotalErrors: "總錯誤次數",
    mAvgResponse: "平均反應時間",
    perRoundTitle: "各回合結果",
    responsesTitle: "每題作答",
    colRound: "回合",
    colAttempt: "嘗試",
    colSymbol: "圖形數",
    cardLabel: "卡片",
    seconds: "秒",
  },

  ar: {
    aboutTitle: "عن هذا النشاط",
    aboutText:
      "نشاط قصير للذاكرة البصرية المكانية مبني على اختبار التعلّم بالاقتران (PAL) من منظومة CANTAB. تبدأ الجلسة بجولة تدريبية ثم جولات من 2 و4 و6 و8 رموز، وتستغرق نحو خمس دقائق. النشاط غير مُقيَّم: مقاييس وصفية فقط، وليس أداة سريرية معتمدة.",
    demoStep1: "تُفتح بطاقة وتُظهر رمزًا.",
    demoStep2: "ثم يظهر ذلك الرمز بمفرده.",
    demoStep3: "اضغط على البطاقة التي رأيته فيها.",
    practiceLabel: "جولة تدريبية",
    practiceNote: "هذه الجولة للتدريب ولا يتم تسجيلها.",
    practiceComplete: "انتهى التدريب — لنبدأ.",
    label: "Arabic",
    nativeLabel: "العربية",
    direction: "rtl",
    voiceLocale: "ar-SA",
    title: "تذكّر البطاقات",
    tagline: "نشاط قصير للذاكرة البصرية",
    setupTitle: "إعداد تذكّر البطاقات",
    languageLabel: "لغة الجلسة",
    startSetup: "متابعة",
    instructionsTitle: "طريقة الأداء",
    instructions:
      "سترى صفًا من البطاقات. ستُفتح كل بطاقة على حدة وتعرض لك شكلًا. حاول أن تتذكر البطاقة التي ظهر فيها كل شكل. بعد ذلك سيظهر شكل بمفرده، والمطلوب أن تلمس البطاقة التي رأيته فيها.",
    begin: "ابدأ",
    listen: "استماع",
    watchTitle: "انظر بتركيز",
    recallPrompt: "أين كان هذا الشكل؟",
    correct: "صحيح",
    incorrect: "غير صحيح",
    roundLabel: "الجولة",
    ofLabel: "من",
    attemptLabel: "المحاولة",
    retryRound: "لنعد هذه الجولة مرة أخرى.",
    roundComplete: "اكتملت الجولة",
    sessionComplete: "اكتمل النشاط",
    resultsTitle: "النتائج",
    saving: "جارٍ حفظ النتائج...",
    saveFailed: "تعذّر حفظ النتائج.",
    backToDashboard: "العودة إلى اللوحة",
    playAgain: "إعادة",
    unscoredNote: "هذا النشاط ليس اختبارًا تشخيصيًا. يسجّل مقاييس وصفية للذاكرة لمراجعة الطبيب فقط.",
    mHighestRound: "الجولات المجتازة",
    mFams: "درجة الذاكرة في المحاولة الأولى",
    mAccuracySub: "إجابة صحيحة",
    mTotalErrorsSub: "اللمسات الخاطئة في كل المحاولات",
    colErrors: "لمسات خاطئة",
    legendMiss: "تُظهر الإجابات الخاطئة: البطاقة الملموسة ← موضع الشكل الفعلي.",
    colAttemptsUsed: "عدد المحاولات",
    resCleared: "مجتازة",
    resFailed: "غير مجتازة",
    mAccuracy: "الدقة الإجمالية",
    mTotalErrors: "إجمالي الأخطاء",
    mAvgResponse: "متوسط زمن الاستجابة",
    perRoundTitle: "تفصيل الجولات",
    responsesTitle: "كل إجابة",
    colRound: "الجولة",
    colAttempt: "المحاولة",
    colSymbol: "عدد الأشكال",
    cardLabel: "بطاقة",
    seconds: "ث",
  },
};

/** Language codes offered on the setup screen, in display order. */
export const CARD_RECALL_LANGUAGES = ["en", "es", "zh-TW", "ar"];
