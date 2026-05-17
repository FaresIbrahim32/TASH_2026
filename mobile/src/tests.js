export const languageTests = {
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    direction: "ltr",
    voiceLocale: "en-US",
    wordList: ["Banana", "Sunrise", "Chair"],
    ui: {
      instructionsTitle: "English instructions",
      stepLabel: "Step",
      listen: "Listen",
      taskTitles: {
        registration: "Listen and repeat",
        clock: "Draw the clock",
        recall: "Remember the words",
      },
      answerLabel: "Words you remember in English",
      answerPlaceholder: "Type the words you remember",
    },
    tasks: {
      registration:
        "Please listen carefully. I am going to say three words that I want you to repeat back to me now and try to remember. The words are Banana, Sunrise, Chair. Please say them for me now.",
      clock:
        "Next, I want you to draw a clock for me. First, put in all of the numbers where they go. Now, set the hands to 10 past 11.",
      recall: "What were the three words I asked you to remember?",
    },
    imported: true,
  },
  ar: {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    direction: "rtl",
    voiceLocale: "ar-SA",
    wordList: ["بيت", "قطة", "أخضر"],
    ui: {
      instructionsTitle: "تعليمات العربية",
      stepLabel: "الخطوة",
      listen: "استمع",
      taskTitles: {
        registration: "استمع وكرر",
        clock: "ارسم الساعة",
        recall: "تذكر الكلمات",
      },
      answerLabel: "الكلمات التي تتذكرها بالعربية",
      answerPlaceholder: "اكتب الكلمات التي تتذكرها",
    },
    tasks: {
      registration:
        "سوف أقول ثلاث كلمات وأريدك أن تتذكرها الآن وفيما بعد. الكلمات هي: بيت، قطة، أخضر. قلها لي الآن.",
      clock:
        "أريدك أن ترسم ساعة. ابدأ برسم دائرة كبيرة. ضع كل الأرقام في الدائرة، وارسم الساعة بحيث يظهر الوقت الساعة الحادية عشرة وعشر دقائق.",
      recall: "ما هي الكلمات الثلاث التي طلبت منك أن تتذكرها؟",
    },
    imported: true,
  },
  "zh-TW": {
    code: "zh-TW",
    label: "Chinese",
    nativeLabel: "中文",
    direction: "ltr",
    voiceLocale: "zh-TW",
    wordList: ["香蕉", "朝陽", "椅子"],
    ui: {
      instructionsTitle: "中文說明",
      stepLabel: "步驟",
      listen: "聆聽",
      taskTitles: {
        registration: "聽並複誦",
        clock: "畫時鐘",
        recall: "回想名詞",
      },
      answerLabel: "你記得的中文名詞",
      answerPlaceholder: "請輸入你記得的名詞",
    },
    tasks: {
      registration:
        "請仔細聽清楚，我等一下會說出三個名詞，請馬上複誦給我聽，然後儘量背下來。這三個名詞是：香蕉、朝陽、椅子。請馬上複誦。",
      clock:
        "接下來我要請你畫時鐘。首先把時鐘上該有的數字全都寫下來。現在把指針設在十一點十分。",
      recall: "我要你背下來的三個名詞是什麼？",
    },
    imported: true,
  },
  es: {
    code: "es",
    label: "Spanish",
    nativeLabel: "Español",
    direction: "ltr",
    voiceLocale: "es-US",
    wordList: ["Plátano", "Amanecer", "Silla"],
    ui: {
      instructionsTitle: "Instrucciones en español",
      stepLabel: "Paso",
      listen: "Escuchar",
      taskTitles: {
        registration: "Escuche y repita",
        clock: "Dibuje el reloj",
        recall: "Recuerde las palabras",
      },
      answerLabel: "Palabras que recuerda en español",
      answerPlaceholder: "Escriba las palabras que recuerda",
    },
    tasks: {
      registration:
        "Escuche con cuidado. Voy a decir tres palabras que quiero que usted repita ahora y trate de recordar. Las palabras son: Plátano, Amanecer, Silla. Ahora repita las palabras.",
      clock:
        "Ahora, quiero que me dibuje un reloj. Primero, coloque los números donde van. Ahora, ponga las manecillas del reloj en la posición que indiquen las once y diez.",
      recall: "¿Cuáles fueron las tres palabras que le pedí que recordara?",
    },
    imported: true,
  },
  fr: {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    direction: "ltr",
    voiceLocale: "fr-FR",
    wordList: [],
    ui: null,
    tasks: null,
    imported: false,
  },
};

export const supportedFirstLanguages = Object.entries(languageTests).map(([code, test]) => ({
  code,
  ...test,
}));
