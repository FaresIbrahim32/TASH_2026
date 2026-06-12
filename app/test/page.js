"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Globe,
  ClipboardList,
  BookOpen,
  Volume2,
  Square,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import WebcamCapture from "../components/WebcamCapture";
import AudioRecorder from "../components/AudioRecorder";
import { languageTests } from "../lib/tests";

// Helper to speak localized text using Browser SpeechSynthesis
function speakInstruction(text, locale) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Generate the array of wizard steps based on test type and selected language
function getStepsForTest(testType, lang) {
  if (testType === "mini-cog") {
    return [
      {
        id: `minicog_registration_${lang}`,
        type: "registration",
        lang,
        title: lang === "en" ? "Word Presentation" : "عرض الكلمات / 顯示詞彙 / Presentación de palabras",
      },
      {
        id: `minicog_clock_${lang}`,
        type: "clock",
        lang,
        title: lang === "en" ? "Clock Drawing" : "رسم الساعة / 畫時鐘 / Dibujar el reloj",
      },
      {
        id: `minicog_recall_${lang}`,
        type: "recall",
        lang,
        title: lang === "en" ? "Word Recall" : "تذكر الكلمات / 回想名詞 / Recordar palabras",
      },
    ];
  } else {
    // MMSE Steps
    return [
      {
        id: `mmse_temporal_${lang}`,
        type: "mmse_temporal",
        lang,
        title: lang === "en" ? "Temporal Orientation" : "الاعتياد الزمني / 時間定向 / Orientación temporal",
      },
      {
        id: `mmse_spatial_${lang}`,
        type: "mmse_spatial",
        lang,
        title: lang === "en" ? "Spatial Orientation" : "الاعتياد المكاني / 空間定向 / Orientación espacial",
      },
      {
        id: `mmse_registration_${lang}`,
        type: "mmse_registration",
        lang,
        title: lang === "en" ? "Registration" : "التسجيل / 詞彙註冊 / Registro de palabras",
      },
      {
        id: `mmse_attention_${lang}`,
        type: "mmse_attention",
        lang,
        title: lang === "en" ? "Attention & Calculation" : "التركيز والحساب / 注意力與計算 / Atención y cálculo",
      },
      {
        id: `mmse_recall_${lang}`,
        type: "mmse_recall",
        lang,
        title: lang === "en" ? "Word Recall" : "تذكر الكلمات / 詞彙回想 / Recordar palabras",
      },
      {
        id: `mmse_naming_${lang}`,
        type: "mmse_naming",
        lang,
        title: lang === "en" ? "Object Naming" : "تسمية الأشياء / 物體命名 / Nominación de objetos",
      },
      {
        id: `mmse_repetition_${lang}`,
        type: "mmse_repetition",
        lang,
        title: lang === "en" ? "Repetition" : "التكرار اللفظي / 語句複誦 / Repetición de frase",
      },
      {
        id: `mmse_command_${lang}`,
        type: "mmse_command",
        lang,
        title: lang === "en" ? "3-Stage Command" : "الأوامر الثلاثية / 三階段指令 / Comando de tres etapas",
      },
      {
        id: `mmse_reading_${lang}`,
        type: "mmse_reading",
        lang,
        title: lang === "en" ? "Reading & Obedience" : "القراءة والتنفيذ / 閱讀理解 / Lectura y ejecución",
      },
      {
        id: `mmse_writing_${lang}`,
        type: "mmse_writing",
        lang,
        title: lang === "en" ? "Sentence Writing" : "كتابة الجملة / 寫一句話 / Escritura de una oración",
      },
      {
        id: `mmse_pentagons_${lang}`,
        type: "mmse_pentagons",
        lang,
        title: lang === "en" ? "Intersecting Pentagons" : "رسم الأشكال الهندسية / 交叉五角形 / Pentágonos intersectados",
      },
    ];
  }
}

// Retreive dynamic texts, words, and locales for each wizard step
function getStepDetails(step, wordListIndex) {
  const lang = step.lang;
  const wordVersionIndex = wordListIndex % 6; // Safety bounds check

  if (step.type === "registration") {
    // Mini-Cog words vary by language version
    let words = [];
    let text = "";
    let voiceText = "";
    let voiceLocale = "en-US";

    if (lang === "en") {
      words = languageTests.en.wordLists[wordVersionIndex];
      voiceLocale = "en-US";
      text = "Please read and try to memorize these three words:";
      voiceText = `Please listen carefully. I am going to say three words that I want you to repeat back to me now and try to remember. The words are: ${words.join(", ")}. Please say them for me now.`;
    } else if (lang === "es") {
      words = languageTests.es.wordLists[wordVersionIndex];
      voiceLocale = "es-US";
      text = "Por favor, lea y trate de memorizar estas tres palabras:";
      voiceText = `Escuche con cuidado. Voy a decir tres palabras que quiero que usted repita ahora y trate de recordar. Las palabras son: ${words.join(", ")}. Ahora repita las palabras.`;
    } else if (lang === "zh-TW") {
      words = languageTests["zh-TW"].wordLists[wordVersionIndex];
      voiceLocale = "zh-TW";
      text = "請仔細閱讀並記住這三個詞彙：";
      voiceText = `請仔細聽清楚，我等一下會說出三個名詞，請馬上複誦給我聽，然後儘量背下來。這三個名詞是：${words.join("、")}。請馬上複誦。`;
    } else if (lang === "ar") {
      words = languageTests.ar.wordLists[wordVersionIndex];
      voiceLocale = "ar-SA";
      text = "يرجى قراءة وحفظ هذه الكلمات الثلاث:";
      voiceText = `سوف أقول ثلاث كلمات وأريدك أن تتذكرها الآن وفيما بعد. الكلمات هي: ${words.join("، ")}. قلها لي الآن.`;
    }

    return { words, text, voiceText, voiceLocale };
  }

  if (step.type === "clock") {
    let text = "";
    let voiceLocale = "en-US";

    if (lang === "en") {
      text = "On a sheet of paper, draw a clock face. Write all numbers (1-12) in correct order, draw hands pointing to 10 past 11, then take a photo of your drawing.";
      voiceLocale = "en-US";
    } else if (lang === "es") {
      text = "En una hoja de papel, dibuje un reloj. Primero, coloque los números donde van. Ahora, ponga las manecillas del reloj en la posición que indiquen las once y diez. Luego capture una foto de su dibujo.";
      voiceLocale = "es-US";
    } else if (lang === "zh-TW") {
      text = "請在空白紙上畫一個時鐘。首先把時鐘上該有的數字全都寫下來，接著將指針指向十一點十分。然後拍下時鐘照片上傳。";
      voiceLocale = "zh-TW";
    } else if (lang === "ar") {
      text = "يرجى رسم ساعة على ورقة. ضع كل الأرقام في الدائرة، وارسم عقربين يشيران إلى الساعة الحادية عشرة وعشر دقائق. ثم التقط صورة للرسمة.";
      voiceLocale = "ar-SA";
    }

    return { text, voiceText: text, voiceLocale };
  }

  if (step.type === "recall") {
    let text = "";
    let voiceLocale = "en-US";

    if (lang === "en") {
      text = "What were the three words I asked you to remember? Click start recording and say them aloud.";
      voiceLocale = "en-US";
    } else if (lang === "es") {
      text = "¿Cuáles fueron las tres palabras que le pedí que recordara? Presione grabar y dígalas en voz alta.";
      voiceLocale = "es-US";
    } else if (lang === "zh-TW") {
      text = "我要你背下來的三個名詞是什麼？請點擊錄音並大聲說出來。";
      voiceLocale = "zh-TW";
    } else if (lang === "ar") {
      text = "ما هي الكلمات الثلاث التي طلبت منك أن تتذكرها؟ انقر على زر التسجيل وتحدث بصوت مسموع.";
      voiceLocale = "ar-SA";
    }

    return { text, voiceText: text, voiceLocale };
  }

  // MMSE Localizations
  if (step.type === "mmse_temporal") {
    let text = "Please answer the following questions regarding today's date:";
    if (lang === "es") text = "Por favor, responda las siguientes preguntas sobre la fecha de hoy:";
    if (lang === "zh-TW") text = "請回答關於今天日期的問題：";
    if (lang === "ar") text = "يرجى الإجابة على الأسئلة التالية المتعلقة بتاريخ اليوم:";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_spatial") {
    let text = "Please enter the details about your current location:";
    if (lang === "es") text = "Por favor, introduzca los detalles sobre su ubicación actual:";
    if (lang === "zh-TW") text = "請輸入您目前所在位置的詳細資訊：";
    if (lang === "ar") text = "يرجى إدخال التفاصيل حول موقعك الحالي:";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_registration") {
    let words = ["Apple", "Table", "Penny"];
    let text = "Listen to these three words and repeat them into your microphone:";
    let voiceText = "Please listen carefully. I am going to say three words that I want you to repeat back to me now. The words are: Apple, Table, Penny. Please repeat them now.";
    
    if (lang === "es") {
      words = ["Leche", "Sensible", "Antes"];
      text = "Escuche estas tres palabras y repítalas en el micrófono:";
      voiceText = "Escuche con cuidado. Voy a decir tres palabras que quiero que repita ahora. Las palabras son: Leche, Sensible, Antes. Repítalas ahora.";
    } else if (lang === "zh-TW") {
      words = ["蘋果", "桌子", "硬幣"];
      text = "請聆聽這三個詞彙，並在麥克風中複誦：";
      voiceText = "請仔細聽，我要說三個名詞，請馬上複誦。這三個詞是：蘋果、桌子、硬幣。請複誦。";
    } else if (lang === "ar") {
      words = ["علم", "مفتاح", "كرسي"];
      text = "استمع إلى هذه الكلمات الثلاث وكررها في الميكروفون:";
      voiceText = "يرجى الاستماع بعناية. سأقول ثلاث كلمات وأريدك أن تكررها لي الآن. الكلمات هي: علم، مفتاح، كرسي. كررها الآن.";
    }

    return { words, text, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_attention") {
    let text = "Starting from 100, subtract 7 serially. Write down the 5 consecutive answers (e.g. 100 - 7 = 93, then 93 - 7, etc.):";
    if (lang === "es") text = "Restar 7 de 100 sucesivamente. Escriba las 5 respuestas consecutivas:";
    if (lang === "zh-TW") text = "從100開始，連續減去7。請依序輸入5個相減的答案：";
    if (lang === "ar") text = "بدءاً من الرقم 100، اطرح 7 بشكل متتالي. اكتب الإجابات الخمس المتتالية:";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_recall") {
    let text = "Speak the three words you memorized earlier (from the registration step). Click record to speak:";
    if (lang === "es") text = "Diga las tres palabras que memorizó anteriormente. Haga clic en grabar para hablar:";
    if (lang === "zh-TW") text = "請大聲說出你剛才記住的三個詞彙。點擊錄音開始：";
    if (lang === "ar") text = "انطق الكلمات الثلاث التي حفظتها سابقاً. انقر على زر التسجيل للتحدث:";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_naming") {
    let text = "Identify the two objects displayed below and write their names:";
    if (lang === "es") text = "Identifique los dos objetos que se muestran a continuación y escriba sus nombres:";
    if (lang === "zh-TW") text = "請辨認下方顯示的兩個物體並輸入名稱：";
    if (lang === "ar") text = "تعرف على الشيئين المعروضين أدناه واكتب اسميهما:";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_repetition") {
    let phrase = "No ifs, ands, or buts.";
    let text = 'Repeat this phrase exactly as written: "No ifs, ands, or buts."';
    
    if (lang === "es") {
      phrase = "Es un día agradable y soleado, pero hace demasiado calor.";
      text = 'Repita esta frase exactamente como está escrita: "Es un día agradable y soleado, pero hace demasiado calor."';
    } else if (lang === "zh-TW") {
      phrase = "沒有如果、並且、或但是";
      text = '請完全按照寫好的句子進行複誦：「沒有如果、並且、或但是」';
    } else if (lang === "ar") {
      phrase = "أن ، لن ، إذن ، كي";
      text = 'كرر هذه العبارة تماماً كما هي مكتوبة: "أن ، لن ، إذن ، كي"';
    }

    return { phrase, text, voiceText: `Please repeat the following phrase: ${phrase}`, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_command") {
    let text = "Follow these three instructions carefully:";
    let commands = [
      "Take a sheet of paper in your right hand.",
      "Fold the sheet of paper in half.",
      "Place the sheet of paper on the floor."
    ];

    if (lang === "es") {
      text = "Siga estas tres instrucciones cuidadosamente:";
      commands = [
        "Tome la hoja de papel con su mano derecha.",
        "Doble la hoja de papel por la mitad.",
        "Coloque la hoja de papel en el suelo."
      ];
    } else if (lang === "zh-TW") {
      text = "請仔細執行以下三個步驟：";
      commands = [
        "用您的右手拿這張紙。",
        "將紙張對折。",
        "將折好的紙放在地板上。"
      ];
    } else if (lang === "ar") {
      text = "اتبع هذه التعليمات الثلاثة بدقة:";
      commands = [
        "خذ ورقة بيدك اليمنى.",
        "اطوِ ورقة من المنتصف.",
        "ضع ورقة على الأرض."
      ];
    }

    return { text, commands, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_reading") {
    let text = "Obey the command written below in bold. Press the confirmation button once completed:";
    let commandText = "CLOSE YOUR EYES";

    if (lang === "es") {
      text = "Obedezca la orden escrita en negrita abajo. Presione confirmar una vez realizado:";
      commandText = "CIERRE LOS OJOS";
    } else if (lang === "zh-TW") {
      text = "遵照下方粗體字顯示的指令動作。完成後請按確認按鈕：";
      commandText = "閉上您的眼睛";
    } else if (lang === "ar") {
      text = "نفذ الأمر المكتوب بالخط العريض أدناه. اضغط على تأكيد بمجرد الانتهاء:";
      commandText = "أغمض عينيك";
    }

    return { text, commandText, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_writing") {
    let text = "Type a complete, grammatically correct sentence of your choice below (must contain a subject, verb, and make sense):";
    if (lang === "es") text = "Escriba una oración completa y gramaticalmente correcta de su elección abajo (debe tener sujeto, verbo y sentido):";
    if (lang === "zh-TW") text = "請在下方輸入一個完整且語法正確的句子（必須包含主詞、動詞且語意完整）：";
    if (lang === "ar") text = "اكتب جملة كاملة وصحيحة نحوياً من اختيارك أدناه (يجب أن تحتوي على فاعل وفعل ومعنى مفيد):";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_pentagons") {
    let text = "Copy the drawing of the two intersecting pentagons on paper, then capture a photo of your copy below:";
    if (lang === "es") text = "Copie el dibujo de los dos pentágonos intersectados en papel, luego capture una foto de su copia abajo:";
    if (lang === "zh-TW") text = "請在紙上描摹畫出這兩個交叉五角形，然後拍照上傳您的作品：";
    if (lang === "ar") text = "انسخ رسم الأشكال الخماسية المتقاطعة على ورقة، ثم التقط صورة لعملك أدناه:";
    return { text, voiceText: text, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  return { text: "" };
}

export default function TestPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configuration States (Setup Panel)
  const [testType, setTestType] = useState("mini-cog"); // "mini-cog" | "mmse"
  const [secondaryLanguage, setSecondaryLanguage] = useState(""); // "" | "es" | "zh-TW" | "ar"
  const [started, setStarted] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Wizard Traversal States
  const [allSteps, setAllSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [wordListIndex, setWordListIndex] = useState(0); // Holds random version 0-5

  // Form Answer State
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Auth context
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Load wizard draft checkpoint if user refreshes
  useEffect(() => {
    if (user) {
      const draft = localStorage.getItem(`tash_draft_${user.userId}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setTestType(parsed.testType);
          setSecondaryLanguage(parsed.secondaryLanguage);
          setAnswers(parsed.answers);
          setStepIndex(parsed.stepIndex);
          setWordListIndex(parsed.wordListIndex || 0);
          
          // Re-generate steps matching config
          const steps = buildWizardSteps(parsed.testType, parsed.secondaryLanguage);
          setAllSteps(steps);
          setStarted(true);
        } catch (e) {
          console.error("Failed to restore wizard state draft", e);
        }
      }
    }
  }, [user]);

  // Save draft status checkpoint to localStorage on change
  useEffect(() => {
    if (started && user) {
      const draftState = {
        testType,
        secondaryLanguage,
        answers,
        stepIndex,
        wordListIndex,
      };
      localStorage.setItem(`tash_draft_${user.userId}`, JSON.stringify(draftState));
    }
  }, [started, answers, stepIndex, testType, secondaryLanguage, wordListIndex, user]);

  function buildWizardSteps(type, lang) {
    const englishPart = getStepsForTest(type, "en");
    if (!lang) {
      return englishPart;
    }
    const nativePart = getStepsForTest(type, lang);
    return [...englishPart, { type: "transition", title: "Language Transition" }, ...nativePart];
  }

  function handleStart() {
    // Generate a random word list version (0 to 5) for the registration/recall words
    const randomVersion = Math.floor(Math.random() * 6);
    setWordListIndex(randomVersion);
    setAnswers({});
    setStepIndex(0);

    const steps = buildWizardSteps(testType, secondaryLanguage);
    setAllSteps(steps);
    setStarted(true);
  }

  function handleExit(confirm) {
    if (confirm) {
      stopSpeech();
      if (user) {
        localStorage.removeItem(`tash_draft_${user.userId}`);
      }
      router.push("/");
    } else {
      setShowExitModal(false);
    }
  }

  function nextStep() {
    stopSpeech();
    if (stepIndex < allSteps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }

  function prevStep() {
    stopSpeech();
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }

  // Unified Step Timer Hook
  const [stepTimeLeft, setStepTimeLeft] = useState(null);

  useEffect(() => {
    stopSpeech();
    
    if (!started || !allSteps[stepIndex]) {
      setStepTimeLeft(null);
      return;
    }

    const currentStep = allSteps[stepIndex];
    let limit = null;

    if (currentStep.type === "registration") {
      limit = 30; // 30 seconds for Word presentation
    } else if (currentStep.type === "clock") {
      limit = 180; // 3 minutes for Clock drawing
    } else if (currentStep.type === "recall") {
      limit = 30; // 30 seconds for Word recall
    } else if (currentStep.type === "transition") {
      limit = 20; // 20 seconds for Transition screen
    }

    if (limit !== null) {
      setStepTimeLeft(limit);
      const timer = setInterval(() => {
        setStepTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            nextStep();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setStepTimeLeft(null);
    }
  }, [stepIndex, started, allSteps]);


  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const payload = {
        testType,
        secondaryLanguage: secondaryLanguage || "none",
        patient: {
          identifier: user.email,
          age: user.age,
          gender: user.gender,
          educationYears: user.educationYears,
        },
        answers,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Clear draft cache on successful save
        if (user) {
          localStorage.removeItem(`tash_draft_${user.userId}`);
        }
        router.push("/");
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to submit assessment.");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle specific input updates dynamically
  function updateAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f6f7f4" }}>
        <p style={{ color: "var(--teal)", fontWeight: "bold" }}>Loading setup...</p>
      </div>
    );
  }

  if (!user) return null;

  // Active step in progression
  const currentStep = allSteps[stepIndex];

  return (
    <main className="appShell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f6f7f4" }}>
      {/* Header top bar */}
      <header className="topBar" style={{ background: "#10251f", color: "#fff", padding: "20px clamp(18px, 4vw, 44px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%", justifyContent: "space-between" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {started && (
              <button
                onClick={() => setShowExitModal(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#c9ddd8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            )}
            {!started && (
              <button
                onClick={() => router.push("/")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#c9ddd8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="eyebrow" style={{ color: "#91d6cd", fontWeight: "800", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                {started ? `${testType.toUpperCase()} Test` : "Assessment Setup"}
              </span>
              <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700 }}>
                {started ? (currentStep.type === "transition" ? "Transition" : currentStep.title) : "Configure Assessment"}
              </h1>
            </div>
          </div>

          {/* Progress bar metrics */}
          {started && currentStep.type !== "transition" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#91d6cd" }}>
                Part {currentStep.lang === "en" ? "1 (English)" : `2 (${currentStep.lang.toUpperCase()})`}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#c9ddd8" }}>
                Step {allSteps.filter((s, idx) => idx <= stepIndex && s.type !== "transition" && s.lang === currentStep.lang).length} of{" "}
                {allSteps.filter((s) => s.lang === currentStep.lang).length}
              </span>
              {stepTimeLeft !== null && (
                <span style={{ fontSize: "0.75rem", color: "#fda29b", fontWeight: "bold", background: "rgba(253, 162, 155, 0.15)", padding: "2px 6px", borderRadius: "4px", marginTop: "4px" }}>
                  Time Left: {Math.floor(stepTimeLeft / 60)}:{(stepTimeLeft % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Exit Confirmation Dialog */}
      {showExitModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
          <div style={{ background: "#ffffff", padding: "28px", borderRadius: "12px", maxWidth: "400px", width: "100%", boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--red)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={20} />
              Exit Assessment?
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.4, marginBottom: "20px" }}>
              Are you sure you want to abort the current test? All unsaved inputs and recordings will be discarded.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleExit(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExit(true)}
                style={{
                  background: "var(--red)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup screen view OR Wizard rendering */}
      {!started ? (
        /* Setup Configuration Screen */
        <div style={{ flex: 1, padding: "40px 18px", maxWidth: "800px", width: "100%", margin: "0 auto" }}>
          <div className="demographicsPanel" style={{ padding: "32px", gap: "28px", boxShadow: "var(--shadow)", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
            
            {/* Choose Test */}
            <div>
              <div className="sectionTitle" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--teal-dark)" }}>
                <ClipboardList size={22} />
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Select Cognitive Test</h2>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                <div
                  onClick={() => setTestType("mini-cog")}
                  style={{
                    border: testType === "mini-cog" ? "2px solid var(--teal)" : "1px solid var(--line)",
                    background: testType === "mini-cog" ? "rgba(15, 118, 110, 0.04)" : "#ffffff",
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "1.05rem", color: testType === "mini-cog" ? "var(--teal-dark)" : "var(--ink)" }}>
                      Mini-Cog Screen
                    </strong>
                    <input
                      type="radio"
                      checked={testType === "mini-cog"}
                      onChange={() => setTestType("mini-cog")}
                      style={{ accentColor: "var(--teal)" }}
                    />
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                    A quick, 3-step screening focusing on word recall and clock-drawing. (Takes 3-5 minutes).
                  </p>
                </div>

                <div
                  onClick={() => setTestType("mmse")}
                  style={{
                    border: testType === "mmse" ? "2px solid var(--teal)" : "1px solid var(--line)",
                    background: testType === "mmse" ? "rgba(15, 118, 110, 0.04)" : "#ffffff",
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "1.05rem", color: testType === "mmse" ? "var(--teal-dark)" : "var(--ink)" }}>
                      MMSE Evaluation
                    </strong>
                    <input
                      type="radio"
                      checked={testType === "mmse"}
                      onChange={() => setTestType("mmse")}
                      style={{ accentColor: "var(--teal)" }}
                    />
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                    A comprehensive, 30-point evaluation covering orientation, memory, math, and language. (Takes 10-15 minutes).
                  </p>
                </div>
              </div>
            </div>

            {/* Choose Language */}
            <div>
              <div className="sectionTitle" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--teal-dark)" }}>
                <Globe size={22} />
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Secondary Language Comfort</h2>
              </div>
              
              <label style={{ color: "var(--ink)", fontWeight: 500, fontSize: "0.92rem", marginBottom: "12px" }}>
                Are you more comfortable in a language other than English?
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                {[
                  { code: "", label: "English Only" },
                  { code: "es", label: "Español (Spanish)" },
                  { code: "zh-TW", label: "中文 (Chinese)" },
                  { code: "ar", label: "العربية (Arabic)" },
                ].map((lang) => (
                  <div
                    key={lang.code}
                    onClick={() => setSecondaryLanguage(lang.code)}
                    style={{
                      border: secondaryLanguage === lang.code ? "2px solid var(--teal)" : "1px solid var(--line)",
                      background: secondaryLanguage === lang.code ? "rgba(15, 118, 110, 0.04)" : "#ffffff",
                      borderRadius: "8px",
                      padding: "14px 10px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      color: secondaryLanguage === lang.code ? "var(--teal-dark)" : "var(--muted)",
                    }}
                  >
                    {lang.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Dual Notice */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "18px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <BookOpen size={20} style={{ color: "var(--teal)", marginTop: "2px", flexShrink: 0 }} />
              <div style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.5 }}>
                <strong style={{ display: "block", color: "var(--teal-dark)", marginBottom: "4px" }}>
                  Assessment Procedure
                </strong>
                {secondaryLanguage ? (
                  <span>
                    To ensure accuracy and isolate language barriers, you will take the entire {testType === "mini-cog" ? "Mini-Cog" : "MMSE"} test **first in English**, and then repeat the exact same test **in your selected language**. The AI grader will compare both submissions.
                  </span>
                ) : (
                  <span>
                    You will take the entire {testType === "mini-cog" ? "Mini-Cog" : "MMSE"} test in English. The test contains multiple stages, including memory recall and drawing tasks.
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleStart}
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "16px 24px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(15, 118, 110, 0.15)",
                transition: "transform 0.15s ease",
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <Play size={16} fill="#ffffff" />
              Start Assessment
            </button>
          </div>
        </div>
      ) : (
        /* Wizard Engine Interface */
        <div style={{ flex: 1, padding: "30px 18px", maxWidth: "680px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Main Card */}
          <div
            className="taskPanel"
            style={{
              padding: "32px",
              boxShadow: "var(--shadow)",
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {currentStep.type === "transition" ? (
              /* Bilingual Switch Transition Screen */
              <div style={{ textAlign: "center", padding: "40px 0", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "20px" }}>
                <div style={{ background: "rgba(15, 118, 110, 0.08)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                  <Globe size={32} style={{ color: "var(--teal)" }} />
                </div>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--teal-dark)" }}>
                  Part 1 (English) Completed
                </h3>
                <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.5, maxWidth: "440px" }}>
                  Excellent. You have finished the English portion of the test. We will now prepare the evaluation in{" "}
                  <strong>
                    {secondaryLanguage === "es" ? "Spanish (Español)" : secondaryLanguage === "zh-TW" ? "Chinese (中文)" : "Arabic (العربية)"}
                  </strong>
                  .
                </p>
                <div style={{ color: "var(--red)", fontSize: "0.92rem", fontWeight: "bold", background: "rgba(180, 35, 24, 0.06)", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(180, 35, 24, 0.15)", margin: "10px 0" }}>
                  Beginning Part 2 automatically in {stepTimeLeft} seconds...
                </div>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", fontStyle: "italic" }}>
                  Please repeat the exact same instructions and tasks as they appear in the new language.
                </p>
              </div>
            ) : (
              /* Question/Interaction Render */
              (() => {
                const details = getStepDetails(currentStep, wordListIndex);

                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    {/* Header instruction with audio read-aloud options */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                      <p style={{ fontSize: "1.02rem", color: "var(--ink)", fontWeight: 500, lineHeight: 1.5, flex: 1 }}>
                        {details.text}
                      </p>
                      
                      {details.voiceText && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => speakInstruction(details.voiceText, details.voiceLocale)}
                            style={{
                              background: "rgba(15, 118, 110, 0.08)",
                              color: "var(--teal)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Volume2 size={15} />
                            Listen
                          </button>
                          <button
                            onClick={stopSpeech}
                            style={{
                              background: "rgba(0,0,0,0.04)",
                              color: "var(--muted)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px",
                              cursor: "pointer",
                            }}
                          >
                            <Square size={14} fill="var(--muted)" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ borderBottom: "1px solid var(--line)" }} />

                    {/* Step specific input render */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                      
                      {/* 1. Mini-Cog / MMSE Word Registration */}
                      {currentStep.type === "registration" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
                            {details.words.map((word, idx) => (
                              <div
                                key={word}
                                style={{
                                  background: "#f0fdfa",
                                  border: "2px solid #99f6e4",
                                  borderRadius: "12px",
                                  padding: "16px 28px",
                                  fontSize: "1.4rem",
                                  fontWeight: 800,
                                  color: "var(--teal-dark)",
                                  boxShadow: "0 4px 6px rgba(15, 118, 110, 0.05)",
                                }}
                              >
                                {word}
                              </div>
                            ))}
                          </div>
                          <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic", textAlign: "center" }}>
                            Read these words aloud and commit them to memory.
                          </span>
                        </div>
                      )}

                      {/* 2. Mini-Cog Clock Drawing */}
                      {currentStep.type === "clock" && (
                        <WebcamCapture
                          instruction={details.text}
                          onCapture={(dataUrl) => updateAnswer(`clockDrawing_${currentStep.lang}`, dataUrl)}
                        />
                      )}

                      {/* 3. Mini-Cog Recall */}
                      {currentStep.type === "recall" && (
                        <AudioRecorder
                          instruction={details.text}
                          onConfirm={(audioDataUrl) => updateAnswer(`recallAudio_${currentStep.lang}`, audioDataUrl)}
                        />
                      )}

                      {/* 4. MMSE Temporal Orientation */}
                      {currentStep.type === "mmse_temporal" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px", width: "100%" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <label>
                              Year
                              <select
                                value={answers[`temporal_year_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`temporal_year_${currentStep.lang}`, e.target.value)}
                                style={{ width: "100%" }}
                              >
                                <option value="">Select Year</option>
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                                <option value="2027">2027</option>
                                <option value="other">Other</option>
                              </select>
                            </label>

                            <label>
                              Season
                              <select
                                value={answers[`temporal_season_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`temporal_season_${currentStep.lang}`, e.target.value)}
                                style={{ width: "100%" }}
                              >
                                <option value="">Select Season</option>
                                <option value="summer">Summer / Verano</option>
                                <option value="autumn">Autumn/Fall / Otoño</option>
                                <option value="winter">Winter / Invierno</option>
                                <option value="spring">Spring / Primavera</option>
                              </select>
                            </label>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <label>
                              Month
                              <select
                                value={answers[`temporal_month_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`temporal_month_${currentStep.lang}`, e.target.value)}
                                style={{ width: "100%" }}
                              >
                                <option value="">Select Month</option>
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                                  <option key={m} value={m.toLowerCase()}>{m}</option>
                                ))}
                              </select>
                            </label>

                            <label>
                              Day of the Week
                              <select
                                value={answers[`temporal_day_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`temporal_day_${currentStep.lang}`, e.target.value)}
                                style={{ width: "100%" }}
                              >
                                <option value="">Select Day</option>
                                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                                  <option key={d} value={d.toLowerCase()}>{d}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label>
                            Date (Day of Month)
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={answers[`temporal_date_${currentStep.lang}`] || ""}
                              onChange={(e) => updateAnswer(`temporal_date_${currentStep.lang}`, e.target.value)}
                              placeholder="e.g. 12"
                              style={{ width: "100%" }}
                            />
                          </label>
                        </div>
                      )}

                      {/* 5. MMSE Spatial Orientation */}
                      {currentStep.type === "mmse_spatial" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                          <label>
                            State / Province / Region
                            <input
                              type="text"
                              value={answers[`spatial_state_${currentStep.lang}`] || ""}
                              onChange={(e) => updateAnswer(`spatial_state_${currentStep.lang}`, e.target.value)}
                              placeholder="e.g. Ohio"
                            />
                          </label>

                          <label>
                            County / Caza / District
                            <input
                              type="text"
                              value={answers[`spatial_county_${currentStep.lang}`] || ""}
                              onChange={(e) => updateAnswer(`spatial_county_${currentStep.lang}`, e.target.value)}
                              placeholder="e.g. Franklin"
                            />
                          </label>

                          <label>
                            City / Town / Mohafazat
                            <input
                              type="text"
                              value={answers[`spatial_town_${currentStep.lang}`] || ""}
                              onChange={(e) => updateAnswer(`spatial_town_${currentStep.lang}`, e.target.value)}
                              placeholder="e.g. Columbus"
                            />
                          </label>

                          <label>
                            Building Name / Street / Address
                            <input
                              type="text"
                              value={answers[`spatial_building_${currentStep.lang}`] || ""}
                              onChange={(e) => updateAnswer(`spatial_building_${currentStep.lang}`, e.target.value)}
                              placeholder="e.g. Medical Clinic"
                            />
                          </label>

                          <label>
                            Floor / Room Number
                            <input
                              type="text"
                              value={answers[`spatial_floor_${currentStep.lang}`] || ""}
                              onChange={(e) => updateAnswer(`spatial_floor_${currentStep.lang}`, e.target.value)}
                              placeholder="e.g. 3rd Floor"
                            />
                          </label>
                        </div>
                      )}

                      {/* 6. MMSE Registration */}
                      {currentStep.type === "mmse_registration" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
                            {details.words.map((word) => (
                              <div
                                key={word}
                                style={{
                                  background: "#f0fdfa",
                                  border: "2px solid #99f6e4",
                                  borderRadius: "12px",
                                  padding: "12px 24px",
                                  fontSize: "1.25rem",
                                  fontWeight: 800,
                                  color: "var(--teal-dark)",
                                }}
                              >
                                {word}
                              </div>
                            ))}
                          </div>
                          
                          <AudioRecorder
                            instruction="Click start and repeat the words"
                            onConfirm={(audioDataUrl) => updateAnswer(`registrationAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 7. MMSE Attention & Calculation */}
                      {currentStep.type === "mmse_attention" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px", width: "100%" }}>
                          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
                            Write down the next 5 numbers from 100 counting backwards by 7 (93, 86, 79, etc.):
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
                            {[1, 2, 3, 4, 5].map((idx) => (
                              <input
                                key={idx}
                                type="number"
                                value={answers[`attention_${idx}_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`attention_${idx}_${currentStep.lang}`, e.target.value)}
                                placeholder={`Sub ${idx}`}
                                style={{ textAlign: "center", padding: "10px 4px", fontSize: "1rem" }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 8. MMSE Recall */}
                      {currentStep.type === "mmse_recall" && (
                        <AudioRecorder
                          instruction="Record yourself speaking the three words"
                          onConfirm={(audioDataUrl) => updateAnswer(`recallAudio_${currentStep.lang}`, audioDataUrl)}
                        />
                      )}

                      {/* 9. MMSE Object Naming */}
                      {currentStep.type === "mmse_naming" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                            {/* Object 1 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                              <img
                                src={currentStep.lang === "es" ? "/tests/mmse/eye.png" : "/tests/mmse/pencil.png"}
                                alt="Naming Object 1"
                                style={{ width: "120px", height: "120px", objectFit: "contain", border: "1px solid var(--line)", borderRadius: "8px", background: "#fff" }}
                              />
                              <input
                                type="text"
                                value={answers[`naming_object1_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`naming_object1_${currentStep.lang}`, e.target.value)}
                                placeholder={currentStep.lang === "es" ? "Nombre en español" : "Object name"}
                                style={{ width: "100%", textAlign: "center" }}
                              />
                            </div>

                            {/* Object 2 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                              <img
                                src={currentStep.lang === "es" ? "/tests/mmse/ear.png" : "/tests/mmse/watch.png"}
                                alt="Naming Object 2"
                                style={{ width: "120px", height: "120px", objectFit: "contain", border: "1px solid var(--line)", borderRadius: "8px", background: "#fff" }}
                              />
                              <input
                                type="text"
                                value={answers[`naming_object2_${currentStep.lang}`] || ""}
                                onChange={(e) => updateAnswer(`naming_object2_${currentStep.lang}`, e.target.value)}
                                placeholder={currentStep.lang === "es" ? "Nombre en español" : "Object name"}
                                style={{ width: "100%", textAlign: "center" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 10. MMSE Repetition */}
                      {currentStep.type === "mmse_repetition" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <strong style={{ fontSize: "1.3rem", color: "var(--teal-dark)", background: "#f8faf9", border: "1px dashed var(--line)", borderRadius: "8px", padding: "14px 20px" }}>
                            {details.phrase}
                          </strong>
                          <AudioRecorder
                            instruction="Repeat the phrase aloud"
                            onConfirm={(audioDataUrl) => updateAnswer(`repetitionAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 11. MMSE 3-Stage Command */}
                      {currentStep.type === "mmse_command" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", textAlign: "left" }}>
                          {details.commands.map((cmd, idx) => (
                            <label
                              key={idx}
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: "12px",
                                background: answers[`command_step${idx + 1}_${currentStep.lang}`] ? "rgba(15, 118, 110, 0.04)" : "transparent",
                                border: "1px solid var(--line)",
                                borderRadius: "8px",
                                padding: "16px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!answers[`command_step${idx + 1}_${currentStep.lang}`]}
                                onChange={(e) => updateAnswer(`command_step${idx + 1}_${currentStep.lang}`, e.target.checked)}
                                style={{ width: "18px", height: "18px", accentColor: "var(--teal)" }}
                              />
                              <span style={{ fontSize: "0.92rem", color: "var(--ink)", fontWeight: 500 }}>
                                {idx + 1}. {cmd}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 12. MMSE Reading & Obedience */}
                      {currentStep.type === "mmse_reading" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px", width: "100%" }}>
                          <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--red)", letterSpacing: "1px" }}>
                            {details.commandText}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => updateAnswer(`readingObeyed_${currentStep.lang}`, true)}
                            style={{
                              background: answers[`readingObeyed_${currentStep.lang}`] ? "var(--green)" : "var(--teal)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "14px 28px",
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            {answers[`readingObeyed_${currentStep.lang}`] ? "Command Confirmed ✓" : "I Have Obeyed Command"}
                          </button>
                        </div>
                      )}

                      {/* 13. MMSE Sentence Writing */}
                      {currentStep.type === "mmse_writing" && (
                        <div style={{ width: "100%" }}>
                          <textarea
                            value={answers[`writingSentence_${currentStep.lang}`] || ""}
                            onChange={(e) => updateAnswer(`writingSentence_${currentStep.lang}`, e.target.value)}
                            placeholder="Type your sentence here..."
                            rows={4}
                            style={{ width: "100%", padding: "14px", fontSize: "0.98rem" }}
                          />
                        </div>
                      )}

                      {/* 14. MMSE Pentagon Drawing */}
                      {currentStep.type === "mmse_pentagons" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
                          {/* Reference drawing */}
                          <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "14px", background: "#f8faf9" }}>
                            <svg width="240" height="150" viewBox="0 0 240 150" style={{ margin: "0 auto", display: "block" }}>
                              {/* Pentagon 1 */}
                              <polygon points="70,20 120,55 100,110 40,110 20,55" fill="none" stroke="var(--teal)" strokeWidth="3" />
                              {/* Pentagon 2 */}
                              <polygon points="100,55 150,20 200,55 180,110 120,110" fill="none" stroke="var(--teal)" strokeWidth="3" />
                            </svg>
                          </div>

                          <WebcamCapture
                            instruction={details.text}
                            onCapture={(dataUrl) => updateAnswer(`pentagonDrawing_${currentStep.lang}`, dataUrl)}
                          />
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Navigation Controls footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {started ? (
              <div />
            ) : (
              <button
                onClick={prevStep}
                disabled={stepIndex === 0 || isSubmitting}
                style={{
                  background: "transparent",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: stepIndex === 0 ? "var(--line)" : "var(--muted)",
                  cursor: stepIndex === 0 ? "default" : "pointer",
                }}
              >
                Previous
              </button>
            )}

            <button
              onClick={nextStep}
              disabled={isSubmitting}
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 28px",
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(15, 118, 110, 0.15)",
              }}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : stepIndex === allSteps.length - 1 ? (
                "Submit Assessment"
              ) : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </main>
  );
}
