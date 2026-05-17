export const languageTests = {
  en: {
    label: "English",
    nativeLabel: "English",
    direction: "ltr",
    pdf: "/tests/mini-cog-en.pdf",
    pages: ["/tests/pages/mini-cog-en-1.png", "/tests/pages/mini-cog-en-2.png"],
    voiceLocale: "en-US",
    wordLists: [
      ["Banana", "Sunrise", "Chair"],
      ["Leader", "Season", "Table"],
      ["Village", "Kitchen", "Baby"],
      ["River", "Nation", "Finger"],
      ["Captain", "Garden", "Picture"],
      ["Daughter", "Heaven", "Mountain"],
    ],
    ui: {
      instructionsTitle: "English instructions",
      stepLabel: "Step",
      stopVoice: "Stop voice",
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
        "Please listen carefully. I am going to say three words that I want you to repeat back to me now and try to remember. The words are {words}. Please say them for me now.",
      clock:
        "Next, I want you to draw a clock for me. First, put in all of the numbers where they go. Now, set the hands to 10 past 11.",
      recall: "What were the three words I asked you to remember?",
      scoring:
        "Score one point for each word recalled without cueing. A normal clock has all numbers in the correct order and position, with the hands pointing to 11 and 2.",
    },
    imported: true,
  },
  ar: {
    label: "Arabic",
    nativeLabel: "العربية",
    direction: "rtl",
    pdf: "/tests/mini-cog-ar.pdf",
    pages: ["/tests/pages/mini-cog-ar-1.png", "/tests/pages/mini-cog-ar-2.png"],
    voiceLocale: "ar-SA",
    wordLists: [["بيت", "قطة", "أخضر"]],
    ui: {
      instructionsTitle: "تعليمات العربية",
      stepLabel: "الخطوة",
      stopVoice: "إيقاف الصوت",
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
        "سوف أقول ثلاث كلمات وأريدك أن تتذكرها الآن وفيما بعد. الكلمات هي: {words}. قلها لي الآن.",
      clock:
        "أريدك أن ترسم ساعة. ابدأ برسم دائرة كبيرة. ضع كل الأرقام في الدائرة، وارسم الساعة بحيث يظهر الوقت الساعة الحادية عشرة وعشر دقائق.",
      recall: "ما هي الكلمات الثلاث التي طلبت منك أن تتذكرها؟",
      scoring:
        "نقطة لكل كلمة صحيحة. الساعة الصحيحة تحتوي على كل الأرقام مرة واحدة وبالترتيب الصحيح، وبها عقربان يشيران إلى 11 و 2.",
    },
    imported: true,
  },
  "zh-TW": {
    label: "Chinese",
    nativeLabel: "中文",
    direction: "ltr",
    pdf: "/tests/mini-cog-zh-TW.pdf",
    pages: ["/tests/pages/mini-cog-zh-TW-1.png", "/tests/pages/mini-cog-zh-TW-2.png"],
    voiceLocale: "zh-TW",
    wordLists: [
      ["香蕉", "朝陽", "椅子"],
      ["領袖", "季節", "桌子"],
      ["村莊", "廚房", "嬰兒"],
      ["河流", "國家", "手指"],
      ["船長", "花園", "照片"],
      ["女兒", "天堂", "高山"],
    ],
    ui: {
      instructionsTitle: "中文說明",
      stepLabel: "步驟",
      stopVoice: "停止語音",
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
        "請仔細聽清楚，我等一下會說出三個名詞，請馬上複誦給我聽，然後儘量背下來。這三個名詞是：{words}。請馬上複誦。",
      clock:
        "接下來我要請你畫時鐘。首先把時鐘上該有的數字全都寫下來。現在把指針設在十一點十分。",
      recall: "我要你背下來的三個名詞是什麼？",
      scoring:
        "不需提示就能自動記起一個名詞者得一分。正常的時鐘必須畫上所有數字、順序正確，而且指針必須指向十一和二。",
    },
    imported: true,
  },
  es: {
    label: "Spanish",
    nativeLabel: "Español",
    direction: "ltr",
    pdf: "/tests/mini-cog-es.pdf",
    pages: [],
    voiceLocale: "es-US",
    wordLists: [
      ["Plátano", "Amanecer", "Silla"],
      ["Líder", "Temporada", "Mesa"],
      ["Pueblo", "Cocina", "Bebé"],
      ["Río", "Nación", "Dedo"],
      ["Capitán", "Jardín", "Retrato"],
      ["Hija", "Cielo", "Montaña"],
    ],
    ui: {
      instructionsTitle: "Instrucciones en español",
      stepLabel: "Paso",
      stopVoice: "Detener voz",
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
        "Escuche con cuidado. Voy a decir tres palabras que quiero que usted repita ahora y trate de recordar. Las palabras son: {words}. Ahora repita las palabras.",
      clock:
        "Ahora, quiero que me dibuje un reloj. Primero, coloque los números donde van. Ahora, ponga las manecillas del reloj en la posición que indiquen las once y diez.",
      recall: "¿Cuáles fueron las tres palabras que le pedí que recordara?",
      scoring:
        "Un punto por cada palabra que recuerde espontáneamente sin pistas. Un reloj normal tiene todos los números colocados en la secuencia y posición aproximadamente correctas.",
    },
    imported: true,
  },
  fr: {
    label: "French",
    nativeLabel: "Français",
    direction: "ltr",
    pdf: "",
    pages: [],
    voiceLocale: "fr-FR",
    wordLists: [],
    tasks: null,
    imported: false,
  },
};

export const supportedFirstLanguages = Object.entries(languageTests).map(([code, test]) => ({
  code,
  ...test,
}));

export function calculateMiniCogFlag({ recallScore, clockScore }) {
  if (recallScore === "" || recallScore === undefined || clockScore === "" || clockScore === undefined) {
    return "incomplete";
  }

  const recall = Number(recallScore);
  const clock = Number(clockScore);

  if (!Number.isFinite(recall) || !Number.isFinite(clock)) {
    return "incomplete";
  }

  if (recall === 0 || (recall > 0 && recall < 3 && clock === 0)) {
    return "positive-screen";
  }

  return "negative-screen";
}
