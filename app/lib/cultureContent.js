// Content + UI strings for the Cultural Face Screen feature.
// Structured per-language so new languages can be added without touching
// page/hook code. Picture images are per-language (culturally themed); the
// Ludo/Domino board images are language-neutral and shared from
// /culture-content/games/. `direction` ("ltr"/"rtl") mirrors the schema
// already used in app/lib/tests.js — culture-connect/page.js reads it to set
// `dir` on the session wrapper for Arabic.
export const cultureTests = {
  en: {
    label: "English",
    nativeLabel: "English",
    voiceLocale: "en-US",
    direction: "ltr",
    // Same spoken instruction for every picture-description prompt; only the image changes.
    pictureInstruction:
      "Look at this picture carefully. Describe everything you see: the people, the colors, the objects, and what is happening. Keep talking until the time runs out.",
    // Pool of 3 — one is sampled at random per session. Not graded.
    pictures: [
      { id: "picture_thanksgiving", imageUrl: "/culture-content/en/picture-thanksgiving.jpg" },
      { id: "picture_farmers_market", imageUrl: "/culture-content/en/picture-farmers-market.jpg" },
      { id: "picture_cookout", imageUrl: "/culture-content/en/picture-cookout.jpg" },
    ],
    // Pool of 6 — 3 sampled per session. Multiple-choice: the patient clicks an
    // option and it is scored instantly client-side (no audio, no Gemini).
    games: [
      {
        id: "ludo_capture_a",
        question: "How many spaces does yellow need to capture the blue piece?",
        expectedAnswer: "5",
        options: ["3", "5", "6", "8"],
        imageUrl: "/culture-content/games/ludo-board-a.svg",
      },
      {
        id: "ludo_home_a",
        question: "How many spaces does blue need to reach the home square?",
        expectedAnswer: "5",
        options: ["3", "4", "5", "6"],
        imageUrl: "/culture-content/games/ludo-board-a.svg",
      },
      {
        id: "domino_match_a",
        question: "Select the tile that matches the pink tile (outlined at the top).",
        expectedAnswer: "D",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/games/domino-board-a.svg",
      },
      {
        id: "ludo_capture_b",
        question: "How many spaces does green need to capture the red piece?",
        expectedAnswer: "3",
        options: ["2", "3", "4", "6"],
        imageUrl: "/culture-content/games/ludo-board-b.svg",
      },
      {
        id: "ludo_home_b",
        question: "How many spaces does red need to reach the home square?",
        expectedAnswer: "4",
        options: ["2", "4", "5", "7"],
        imageUrl: "/culture-content/games/ludo-board-b.svg",
      },
      {
        id: "domino_match_b",
        question: "Select the tile that has a side with the value 4.",
        expectedAnswer: "B",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/games/domino-board-b.svg",
      },
    ],
  },
  es: {
    label: "Spanish",
    nativeLabel: "Español",
    voiceLocale: "es-ES",
    direction: "ltr",
    pictureInstruction:
      "Mira esta imagen con atención. Descríbeme todo lo que ves: las personas, los colores, los objetos y lo que está pasando. Sigue hablando hasta que se acabe el tiempo.",
    pictures: [
      { id: "picture_dia_de_los_muertos", imageUrl: "/culture-content/es/picture-dia-de-los-muertos.jpg" },
      { id: "picture_mercado", imageUrl: "/culture-content/es/picture-mercado.jpg" },
      { id: "picture_comida_familiar", imageUrl: "/culture-content/es/picture-comida-familiar.jpg" },
    ],
    // #1-#3 verified from cultural-games-prototypes/Spanish/{ludo_board.py,domino_game.py}.
    // #4-#6 newly designed in the same style (the prototypes only contain 3 game-mechanic questions total).
    games: [
      {
        id: "ludo_capture_a",
        question: "¿Cuántos espacios necesita amarillo para comer la ficha azul?",
        expectedAnswer: "5",
        options: ["3", "5", "6", "8"],
        imageUrl: "/culture-content/games/ludo-board-a.svg",
      },
      {
        id: "ludo_home_a",
        question: "¿Cuántos espacios necesita azul para llegar a la casilla de casa?",
        expectedAnswer: "5",
        options: ["3", "4", "5", "6"],
        imageUrl: "/culture-content/games/ludo-board-a.svg",
      },
      {
        id: "domino_match_a",
        question: "Selecciona la ficha que coincide con la ficha rosa (marcada arriba).",
        expectedAnswer: "D",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/games/domino-board-a.svg",
      },
      {
        id: "ludo_capture_b",
        question: "¿Cuántos espacios necesita verde para comer la ficha roja?",
        expectedAnswer: "3",
        options: ["2", "3", "4", "6"],
        imageUrl: "/culture-content/games/ludo-board-b.svg",
      },
      {
        id: "ludo_home_b",
        question: "¿Cuántos espacios necesita roja para llegar a la casilla de casa?",
        expectedAnswer: "4",
        options: ["2", "4", "5", "7"],
        imageUrl: "/culture-content/games/ludo-board-b.svg",
      },
      {
        id: "domino_match_b",
        question: "Selecciona la ficha con un lado que tenga el valor 4.",
        expectedAnswer: "B",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/games/domino-board-b.svg",
      },
    ],
  },
  "zh-TW": {
    label: "Chinese",
    nativeLabel: "中文",
    voiceLocale: "zh-TW",
    direction: "ltr",
    pictureInstruction:
      "請仔細看這張圖片。描述你所看到的一切：人物、顏色、物品，以及正在發生的事情。請持續說話，直到時間結束。",
    pictures: [
      { id: "picture_lunar_new_year", imageUrl: "/culture-content/zh-TW/picture-lunar-new-year.jpg" },
      { id: "picture_market", imageUrl: "/culture-content/zh-TW/picture-market.jpg" },
      { id: "picture_dim_sum", imageUrl: "/culture-content/zh-TW/picture-dim-sum.jpg" },
    ],
    // Culturally-specific games — verified from cultural-games-prototypes/Chinese/
    // {chinese_checkers_game.py, go.py, mahjong.py}. Boards live under
    // /culture-content/zh-TW/games/ (not shared with en/es, unlike the Ludo/Domino
    // set) since these mechanics are themselves the cultural content, not a
    // reskin of a neutral board. The trivia file in the same prototype folder
    // (geopolitical current-events questions) was deliberately not adapted — not
    // a simple game-mechanic task, same call as dropping the Spanish riddles.
    games: [
      {
        id: "checkers_capture_a",
        question: "紅色棋子跳過藍色棋子後，會落在哪一個字母的洞？只有空的洞才能作為落點。",
        expectedAnswer: "A",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/zh-TW/games/checkers-board-a.svg",
      },
      {
        id: "checkers_capture_b",
        question: "綠色棋子跳過黃色棋子後，會落在哪一個字母的洞？只有空的洞才能作為落點。",
        expectedAnswer: "C",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/zh-TW/games/checkers-board-b.svg",
      },
      {
        id: "go_capture_a",
        question: "黑棋下在哪一個字母的位置，可以吃掉白棋？",
        expectedAnswer: "A",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/zh-TW/games/go-board-a.svg",
      },
      {
        id: "go_capture_b",
        question: "黑棋下在哪一個字母的位置，可以吃掉白棋？",
        expectedAnswer: "C",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/zh-TW/games/go-board-b.svg",
      },
      {
        id: "mahjong_complete_a",
        question: "你的牌型只差一張「紅中」就能胡牌，請選出棄牌中的紅中。",
        expectedAnswer: "C",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/zh-TW/games/mahjong-board-a.svg",
      },
      {
        id: "mahjong_complete_b",
        question: "你的牌型只差一張「三索」（三根竹子）就能組成刻子，請選出棄牌中正確的那張牌。",
        expectedAnswer: "D",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/zh-TW/games/mahjong-board-b.svg",
      },
    ],
  },
  ar: {
    label: "Arabic",
    nativeLabel: "العربية",
    voiceLocale: "ar-SA",
    direction: "rtl",
    pictureInstruction:
      "انظر إلى هذه الصورة بعناية. صف كل ما تراه: الأشخاص، الألوان، الأشياء، وما يحدث. استمر في الحديث حتى ينتهي الوقت.",
    pictures: [
      { id: "picture_souk", imageUrl: "/culture-content/ar/picture-souk.jpg" },
      { id: "picture_coffee_hospitality", imageUrl: "/culture-content/ar/picture-coffee-hospitality.jpg" },
      { id: "picture_ramadan_iftar", imageUrl: "/culture-content/ar/picture-ramadan-iftar.jpg" },
    ],
    games: [
      {
        id: "mancala_sow_a",
        question: "خذ الخرز من الحفرة 8. في أي حفرة ستنتهي؟",
        expectedAnswer: "C",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/ar/games/mancala-board-a.svg",
      },
      {
        id: "mancala_sow_b",
        question: "خذ الخرز من الحفرة 3. في أي حفرة ستنتهي؟",
        expectedAnswer: "B",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/ar/games/mancala-board-b.svg",
      },
      {
        id: "mancala_sow_c",
        question: "خذ الخرز من الحفرة 11. في أي حفرة ستنتهي؟",
        expectedAnswer: "D",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/ar/games/mancala-board-c.svg",
      },
      {
        id: "mancala_sow_d",
        question: "خذ الخرز من الحفرة 5. في أي حفرة ستنتهي؟",
        expectedAnswer: "E",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/ar/games/mancala-board-d.svg",
      },
      {
        id: "mancala_sow_e",
        question: "خذ الخرز من الحفرة 10. في أي حفرة ستنتهي؟",
        expectedAnswer: "A",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/ar/games/mancala-board-e.svg",
      },
      {
        id: "mancala_sow_f",
        question: "خذ الخرز من الحفرة 1. في أي حفرة ستنتهي؟",
        expectedAnswer: "C",
        options: ["A", "B", "C", "D", "E"],
        imageUrl: "/culture-content/ar/games/mancala-board-f.svg",
      },
    ],
  },
};

// Patient-facing UI chrome, keyed by language so the whole flow can run in the
// selected language. Templated strings are functions.
export const cultureUI = {
  en: {
    setupTitle: "Start a session",
    setupDescription:
      "The patient describes a themed picture out loud and answers a few cultural game questions while their facial behavior is reviewed. Takes about 2 minutes.",
    languageLabel: "Choose a language",
    available: "Available",
    comingSoon: "Coming soon",
    continue: "Continue",
    consentTitle: "Before you begin",
    consentDisclaimer:
      "This activity is not a clinical diagnosis.",
    consentDescription:
      "First you will describe a picture out loud for one minute (with the camera on). Then you will answer 3 short questions by tapping an option.",
    videoConsent: "Save this session's video (with sound) so the clinician can review it",
    start: "Start session",
    preparing: "Preparing the facial analyzer…",
    stepOf: (a, b) => `Step ${a} of ${b}`,
    recording: "Recording facial behavior",
    trackingMarkers: "Show tracking markers",
    listen: "Listen",
    stopVoice: "Stop",
    next: "Next",
    finish: "Finish session",
    audioInstruction: "Speak for 60 seconds about everything you see in the picture.",
    saving: "Saving the session…",
    resultsTitle: "Session complete",
    correctAnswers: (a, b) => `Correct answers: ${a} of ${b}`,
    transcriptNote:
      "The picture description is being transcribed. It will be available in the dashboard in a few moments.",
    back: "Back to dashboard",
    errorTitle: "Could not save the session",
    cameraError:
      "Could not access the camera or microphone. Check your browser permissions and try again.",
    saveError: "Could not save the session. Check your connection and try again.",
  },
  es: {
    setupTitle: "Empezar una sesión",
    setupDescription:
      "El paciente describe una imagen temática en voz alta y responde algunas preguntas de juegos culturales mientras se revisa su comportamiento facial. Toma unos 2 minutos.",
    languageLabel: "Elige un idioma",
    available: "Disponible",
    comingSoon: "Próximamente",
    continue: "Continuar",
    consentTitle: "Antes de comenzar",
    consentDisclaimer:
      "Esta actividad no es un diagnóstico clínico.",
    consentDescription:
      "Primero describirás una imagen en voz alta durante un minuto (con la cámara encendida). Después responderás 3 preguntas cortas tocando una opción.",
    videoConsent: "Guardar el video de esta sesión (con sonido) para que el clínico pueda revisarlo",
    start: "Comenzar sesión",
    preparing: "Preparando el analizador facial…",
    stepOf: (a, b) => `Paso ${a} de ${b}`,
    recording: "Grabando comportamiento facial",
    trackingMarkers: "Mostrar marcadores de seguimiento",
    listen: "Escuchar",
    stopVoice: "Detener voz",
    next: "Siguiente",
    finish: "Finalizar sesión",
    audioInstruction: "Habla durante 60 segundos sobre todo lo que ves en la imagen.",
    saving: "Guardando la sesión…",
    resultsTitle: "Sesión completada",
    correctAnswers: (a, b) => `Respuestas correctas: ${a} de ${b}`,
    transcriptNote:
      "La descripción de la imagen se está transcribiendo. Estará disponible en el panel de control en unos momentos.",
    back: "Volver al panel",
    errorTitle: "No se pudo guardar la sesión",
    cameraError:
      "No se pudo acceder a la cámara o al micrófono. Verifica los permisos del navegador e inténtalo de nuevo.",
    saveError: "No se pudo guardar la sesión. Verifica tu conexión e inténtalo de nuevo.",
  },
  "zh-TW": {
    setupTitle: "開始場次",
    setupDescription:
      "患者朗讀描述一張主題圖片，並回答幾個文化遊戲問題，同時系統會檢視其臉部表情變化。大約需要2分鐘。",
    languageLabel: "選擇語言",
    available: "可使用",
    comingSoon: "即將推出",
    continue: "繼續",
    consentTitle: "開始之前",
    consentDisclaimer:
      "此活動並非臨床診斷。",
    consentDescription:
      "首先，請在鏡頭開啟的狀態下，用一分鐘的時間描述一張圖片。接著，您將以點選方式回答3個簡短問題。",
    videoConsent: "儲存此場次的錄影（含聲音），以便臨床人員查看",
    start: "開始場次",
    preparing: "正在準備臉部分析工具…",
    stepOf: (a, b) => `第 ${a} 步，共 ${b} 步`,
    recording: "正在記錄臉部表情",
    trackingMarkers: "顯示追蹤標記",
    listen: "聆聽",
    stopVoice: "停止",
    next: "下一步",
    finish: "結束場次",
    audioInstruction: "請用60秒的時間，說出你在圖片中看到的一切。",
    saving: "正在儲存場次…",
    resultsTitle: "場次已完成",
    correctAnswers: (a, b) => `答對題數：${a} / ${b}`,
    transcriptNote:
      "圖片描述正在轉錄中，稍後將顯示在儀表板上。",
    back: "返回儀表板",
    errorTitle: "無法儲存場次",
    cameraError:
      "無法存取攝影機或麥克風。請檢查瀏覽器權限後再試一次。",
    saveError: "無法儲存場次。請檢查網路連線後再試一次。",
  },
  ar: {
    setupTitle: "بدء جلسة",
    setupDescription:
      "يصف المريض صورة ذات طابع ثقافي بصوت مسموع ويجيب عن بضعة أسئلة من ألعاب ثقافية، بينما تُراجَع تعابير وجهه. تستغرق العملية نحو دقيقتين.",
    languageLabel: "اختر اللغة",
    available: "متاح",
    comingSoon: "قريبًا",
    continue: "متابعة",
    consentTitle: "قبل أن تبدأ",
    consentDisclaimer: "هذا النشاط ليس تشخيصًا سريريًا.",
    consentDescription:
      "أولًا، ستصف صورة بصوت مسموع لمدة دقيقة واحدة (مع تشغيل الكاميرا). بعد ذلك، ستجيب عن 3 أسئلة قصيرة بالنقر على أحد الخيارات.",
    videoConsent: "حفظ فيديو هذه الجلسة (مع الصوت) ليتمكن الطبيب المعالج من مراجعته",
    start: "بدء الجلسة",
    preparing: "جارٍ تجهيز أداة تحليل الوجه…",
    stepOf: (a, b) => `الخطوة ${a} من ${b}`,
    recording: "جارٍ تسجيل سلوك الوجه",
    trackingMarkers: "إظهار علامات التتبع",
    listen: "استماع",
    stopVoice: "إيقاف",
    next: "التالي",
    finish: "إنهاء الجلسة",
    audioInstruction: "تحدث لمدة 60 ثانية عن كل ما تراه في الصورة.",
    saving: "جارٍ حفظ الجلسة…",
    resultsTitle: "اكتملت الجلسة",
    correctAnswers: (a, b) => `الإجابات الصحيحة: ${a} من ${b}`,
    transcriptNote:
      "يجري حاليًا تفريغ وصف الصورة نصيًا. سيكون متاحًا في لوحة التحكم خلال لحظات.",
    back: "العودة إلى لوحة التحكم",
    errorTitle: "تعذّر حفظ الجلسة",
    cameraError:
      "تعذّر الوصول إلى الكاميرا أو الميكروفون. يرجى التحقق من أذونات المتصفح والمحاولة مرة أخرى.",
    saveError: "تعذّر حفظ الجلسة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.",
  },
};

// Languages the patient can actually run a session in today.
export const supportedCultureLanguages = Object.keys(cultureTests);

/**
 * Builds one session's content: 1 random picture (spoken, unscored) + 3 random
 * games (multiple-choice, scored instantly on click), no repeats within the
 * session. Mirrors the rotation approach already used for Mini-Cog word lists
 * (see app/lib/tests.js wordLists / wordListIndex).
 */
export function pickCultureSession(lang) {
  const content = cultureTests[lang];
  if (!content) return null;

  const picture = content.pictures[Math.floor(Math.random() * content.pictures.length)];
  const games = [...content.games].sort(() => Math.random() - 0.5).slice(0, 3);

  return {
    label: content.label,
    voiceLocale: content.voiceLocale,
    instruction: content.pictureInstruction,
    picture,
    games,
  };
}
