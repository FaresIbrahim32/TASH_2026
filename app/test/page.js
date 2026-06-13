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
  RotateCcw,
  Check,
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
    const titles = {
      en: {
        registration: "Word Presentation",
        clock: "Clock Drawing",
        recall: "Word Recall",
      },
      es: {
        registration: "Presentación de palabras",
        clock: "Dibujar el reloj",
        recall: "Recordar palabras",
      },
      "zh-TW": {
        registration: "顯示詞彙",
        clock: "畫時鐘",
        recall: "回想名詞",
      },
      ar: {
        registration: "عرض الكلمات",
        clock: "رسم الساعة",
        recall: "تذكر الكلمات",
      }
    };

    const t = titles[lang] || titles.en;

    return [
      {
        id: `minicog_registration_${lang}`,
        type: "registration",
        lang,
        title: t.registration,
      },
      {
        id: `minicog_clock_${lang}`,
        type: "clock",
        lang,
        title: t.clock,
      },
      {
        id: `minicog_recall_${lang}`,
        type: "recall",
        lang,
        title: t.recall,
      },
    ];
  } else {
    // MMSE Steps
    const titles = {
      en: {
        temporal: "Temporal Orientation",
        spatial: "Spatial Orientation",
        registration: "Registration",
        attention: "Attention & Calculation",
        recall: "Word Recall",
        naming: "Object Naming",
        repetition: "Repetition",
        command: "3-Stage Command",
        reading: "Reading & Obedience",
        writing: "Sentence Writing",
        pentagons: "Intersecting Pentagons",
      },
      es: {
        temporal: "Orientación temporal",
        spatial: "Orientación espacial",
        registration: "Registro de palabras",
        attention: "Atención y cálculo",
        recall: "Recordar palabras",
        naming: "Nominación de objetos",
        repetition: "Repetición de frase",
        command: "Comando de tres etapas",
        reading: "Lectura y ejecución",
        writing: "Escritura de una oración",
        pentagons: "Pentágonos intersectados",
      },
      "zh-TW": {
        temporal: "時間定向",
        spatial: "空間定向",
        registration: "詞彙註冊",
        attention: "注意力與計算",
        recall: "詞彙回想",
        naming: "物體命名",
        repetition: "語句複誦",
        command: "三階段指令",
        reading: "閱讀理解",
        writing: "寫一句話",
        pentagons: "交叉五角形",
      },
      ar: {
        temporal: "الاعتياد الزمني",
        spatial: "الاعتياد المكاني",
        registration: "التسجيل",
        attention: "التركيز والحساب",
        recall: "تذكر الكلمات",
        naming: "تسمية الأشياء",
        repetition: "التكرار اللفظي",
        command: "الأوامر الثلاثية",
        reading: "القراءة والتنفيذ",
        writing: "كتابة الجملة",
        pentagons: "رسم الأشكال الهندسية",
      }
    };

    const t = titles[lang] || titles.en;

    return [
      {
        id: `mmse_temporal_${lang}`,
        type: "mmse_temporal",
        lang,
        title: t.temporal,
      },
      {
        id: `mmse_spatial_${lang}`,
        type: "mmse_spatial",
        lang,
        title: t.spatial,
      },
      {
        id: `mmse_registration_${lang}`,
        type: "mmse_registration",
        lang,
        title: t.registration,
      },
      {
        id: `mmse_attention_${lang}`,
        type: "mmse_attention",
        lang,
        title: t.attention,
      },
      {
        id: `mmse_recall_${lang}`,
        type: "mmse_recall",
        lang,
        title: t.recall,
      },
      {
        id: `mmse_naming_${lang}`,
        type: "mmse_naming",
        lang,
        title: t.naming,
      },
      {
        id: `mmse_repetition_${lang}`,
        type: "mmse_repetition",
        lang,
        title: t.repetition,
      },
      {
        id: `mmse_command_${lang}`,
        type: "mmse_command",
        lang,
        title: t.command,
      },
      {
        id: `mmse_reading_${lang}`,
        type: "mmse_reading",
        lang,
        title: t.reading,
      },
      {
        id: `mmse_writing_${lang}`,
        type: "mmse_writing",
        lang,
        title: t.writing,
      },
      {
        id: `mmse_pentagons_${lang}`,
        type: "mmse_pentagons",
        lang,
        title: t.pentagons,
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
    let text = "Please answer the following questions regarding today's date aloud (including year, season, month, date, and day of the week). Click record to speak:";
    let voiceText = "Please answer the following questions regarding today's date aloud. State the year, the season, the month, the date, and the day of the week.";
    if (lang === "es") {
      text = "Por favor, responda en voz alta las siguientes preguntas sobre la fecha de hoy (incluyendo año, estación, mes, fecha y día de la semana). Haga clic en grabar para hablar:";
      voiceText = "Por favor, responda en voz alta las siguientes preguntas sobre la fecha de hoy. Indique el año, la estación, el mes, la fecha y el día de la semana.";
    } else if (lang === "zh-TW") {
      text = "請大聲回答關於今天日期的問題（包括年份、季節、月份、日期和星期幾）。點擊錄音開始說話：";
      voiceText = "請大聲回答關於今天日期的問題。請說出年份、季節、月份、日期和星期幾。";
    } else if (lang === "ar") {
      text = "يرجى الإجابة بصوت عالٍ على الأسئلة التالية المتعلقة بتاريخ اليوم (بما في ذلك السنة، الفصل، الشهر، التاريخ، ويوم الأسبوع). انقر على زر التسجيل للتحدث:";
      voiceText = "يرجى الإجابة بصوت عالٍ على الأسئلة التالية المتعلقة بتاريخ اليوم. اذكر السنة، الفصل، الشهر، التاريخ، ويوم الأسبوع.";
    }
    return { text, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_spatial") {
    let text = "Please describe your current location aloud (including state/region, county/district, city/town, building/address, and floor/room). Click record to speak:";
    let voiceText = "Please describe your current location aloud. State the state or region, the county or district, the city or town, the building name or address, and the floor or room number.";
    if (lang === "es") {
      text = "Describa su ubicación actual en voz alta (incluyendo estado/región, condado/distrito, ciudad/pueblo, edificio/dirección y piso/habitación). Haga clic en grabar para hablar:";
      voiceText = "Por favor, describa su ubicación actual en voz alta. Indique el estado o región, el condado o distrito, la ciudad o pueblo, el edificio o dirección, y el piso o número de habitación.";
    } else if (lang === "zh-TW") {
      text = "請大聲描述您目前所在的位置（包括省/州/區域、縣/區、城市/城鎮、建築物名稱/地址和樓層/房間號碼）。點擊錄音開始說話：";
      voiceText = "請大聲描述您目前所在的位置。請說出省/州/區域、縣/區、城市/城鎮、建築物名稱/地址和樓層/房間號碼。";
    } else if (lang === "ar") {
      text = "يرجى وصف موقعك الحالي بصوت عالٍ (بما في ذلك الولاية/المنطقة، المحافظة/القضاء، المدينة/البلدة، اسم المبنى/العنوان، والطابق/رقم الغرفة). انقر على زر التسجيل للتحدث:";
      voiceText = "يرجى وصف موقعك الحالي بصوت عالٍ. اذكر الولاية أو المنطقة، المحافظة أو القضاء، المدينة أو البلّدة، اسم المبنى أو العنوان، والطابق أو رقم الغرفة.";
    }
    return { text, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
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
    let text = "Starting from 100, subtract 7 serially. Record yourself speaking the 5 consecutive answers aloud (e.g. 100 - 7 = 93, then 93 - 7, etc.). Click record to speak:";
    let voiceText = "Starting from one hundred, subtract seven serially. Record yourself speaking the five consecutive answers aloud. For example, subtract seven from one hundred, then seven from that answer, and so on.";
    if (lang === "es") {
      text = "Restar 7 de 100 sucesivamente. Grábese diciendo las 5 respuestas consecutivas en voz alta (por ejemplo, 100 - 7 = 93, luego 93 - 7, etc.). Haga clic en grabar para hablar:";
      voiceText = "Comenzando desde cien, reste siete sucesivamente. Grábese diciendo las cinco respuestas consecutivas en voz alta. Por ejemplo, reste siete de cien, luego reste siete de esa respuesta, y así sucesivamente.";
    } else if (lang === "zh-TW") {
      text = "從100開始，連續減去7。請錄下您大聲說出5個相減答案的聲音（例如：100 - 7 = 93，接著93 - 7等）。點擊錄音開始說話：";
      voiceText = "從一百開始，連續減去七。請錄下您大聲說出五個相減答案的聲音。例如：一百減七，接著所得的答案再減七，以此類推。";
    } else if (lang === "ar") {
      text = "بدءاً من الرقم 100، اطرح 7 بشكل متتالي. سجل نفسك وأنت تنطق الإجابات الخمس المتتالية بصوت عالٍ (مثال: 100 - 7 = 93، ثم 93 - 7، إلخ). انقر على زر التسجيل للتحدث:";
      voiceText = "بدءاً من الرقم مئة، اطرح سبعة بشكل متتالي. سجل نفسك وأنت تنطق الإجابات الخمس المتتالية بصوت عالٍ. على سبيل المثال، اطرح سبعة من مئة، ثم سبعة من الإجابة الناتجة، وهكذا.";
    }
    return { text, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
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
    let text = "Listen to the phrase read aloud and repeat it exactly as spoken. Click record to speak:";
    let voiceText = "Please repeat the following phrase: No ifs, ands, or buts.";
    
    if (lang === "es") {
      phrase = "Es un día agradable y soleado, pero hace demasiado calor.";
      text = "Escuche la frase leída en voz alta y repítala exactamente como se dice. Haga clic en grabar para hablar:";
      voiceText = "Por favor, repita la siguiente frase: Es un día agradable y soleado, pero hace demasiado calor.";
    } else if (lang === "zh-TW") {
      phrase = "沒有如果、並且、或但是";
      text = "請聆聽唸出來的句子，並完全按照所聽到的進行複誦。點擊錄音開始說話：";
      voiceText = "請複誦以下句子：沒有如果、並且、或但是。";
    } else if (lang === "ar") {
      phrase = "أن ، لن ، إذن ، كي";
      text = "استمع إلى العبارة المقروءة بصوت عالٍ وكررها تماماً كما قيلت. انقر على زر التسجيل للتحدث:";
      voiceText = "يرجى تكرار العبارة التالية: أن ، لن ، إذن ، كي";
    }

    return { phrase, text, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_command") {
    let text = "Follow the instructions in order. First touch the green circle, second touch the red square, third touch the yellow triangle.";
    let voiceText = "Follow these three instructions carefully. First, touch the green circle. Second, touch the red square. Third, touch the yellow triangle.";
    let commands = [
      "Touch the green circle.",
      "Touch the red square.",
      "Touch the yellow triangle."
    ];

    if (lang === "es") {
      text = "Siga las instrucciones en orden. Primero toque el círculo verde, segundo toque el cuadrado rojo, tercero toque el triángulo amarillo.";
      voiceText = "Siga estas tres instrucciones cuidadosamente. Primero, toque el círculo verde. Segundo, toque el cuadrado rojo. Tercero, toque el triángulo amarillo.";
      commands = [
        "Toque el círculo verde.",
        "Toque el cuadrado rojo.",
        "Toque el triángulo amarillo."
      ];
    } else if (lang === "zh-TW") {
      text = "請依序執行指令。第一，觸碰綠色圓形；第二，觸碰紅色正方形；第三，觸碰黃色三角形。";
      voiceText = "請仔細執行以下三個步驟。第一，觸碰綠色圓形。第二，觸碰紅色正方形。第三，觸碰黃色三角形。";
      commands = [
        "觸碰綠色圓形。",
        "觸碰紅色正方形。",
        "觸碰黃色三角形。"
      ];
    } else if (lang === "ar") {
      text = "اتبع التعليمات بالترتيب. أولاً المس الدائرة الخضراء، ثانياً المس المربع الأحمر، ثالثاً المس المثلث الأصفر.";
      voiceText = "اتبع هذه التعليمات الثلاثة بدقة. أولاً، المس الدائرة الخضراء. ثانياً، المس المربع الأحمر. ثالثاً، المس المثلث الأصفر.";
      commands = [
        "المس الدائرة الخضراء.",
        "المس المربع الأحمر.",
        "المس المثلث الأصفر."
      ];
    }

    return { text, commands, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
  }

  if (step.type === "mmse_reading") {
    let text = "Read and obey the command written below in bold by tapping the correct shape:";
    let commandText = "TAP THE ORANGE STAR";
    let voiceText = "Read the command in bold on the screen and obey it by tapping the correct shape.";

    if (lang === "es") {
      text = "Lea y obedezca la orden escrita en negrita abajo tocando la forma correcta:";
      commandText = "TOQUE LA ESTRELLA NARANJA";
      voiceText = "Lea la orden escrita en negrita en la pantalla y obedézcala tocando la forma correcta.";
    } else if (lang === "zh-TW") {
      text = "閱讀並執行下方粗體顯示的指令，觸碰正確的圖形：";
      commandText = "請觸碰橘色星星";
      voiceText = "閱讀螢幕上粗體字顯示的指令，並透過觸碰正確的圖形來執行它。";
    } else if (lang === "ar") {
      text = "اقرأ ونفذ الأمر المكتوب بالخط العريض أدناه عن طريق لمس الشكل الصحيح:";
      commandText = "المس النجمة البرتقالية";
      voiceText = "اقرأ الأمر المكتوب بالخط العريض على الشاشة ونفذه عن طريق لمس الشكل الصحيح.";
    }

    return { text, commandText, voiceText, voiceLocale: lang === "zh-TW" ? "zh-TW" : lang === "es" ? "es-US" : lang === "ar" ? "ar-SA" : "en-US" };
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

const COMMAND_SHAPES = [
  { id: "circle", color: "#10b981", stroke: "#047857", label: "Green Circle" },
  { id: "square", color: "#ef4444", stroke: "#b91c1c", label: "Red Square" },
  { id: "triangle", color: "#f59e0b", stroke: "#d97706", label: "Yellow Triangle" },
  { id: "pentagon", color: "#3b82f6", stroke: "#1d4ed8", label: "Blue Pentagon" },
  { id: "star", color: "#f97316", stroke: "#c2410c", label: "Orange Star" },
];

function renderMiniShape(shapeId) {
  const shape = COMMAND_SHAPES.find(s => s.id === shapeId);
  if (!shape) return null;
  return (
    <span key={shapeId} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid var(--line)", borderRadius: "6px", padding: "4px", width: "28px", height: "28px" }}>
      {shapeId === "circle" && <svg width="18" height="18" viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill={shape.color} /></svg>}
      {shapeId === "square" && <svg width="18" height="18" viewBox="0 0 80 80"><rect x="4" y="4" width="72" height="72" rx="6" fill={shape.color} /></svg>}
      {shapeId === "triangle" && <svg width="18" height="18" viewBox="0 0 80 80"><polygon points="40,4 76,72 4,72" fill={shape.color} /></svg>}
      {shapeId === "pentagon" && <svg width="18" height="18" viewBox="0 0 80 80"><polygon points="40,4 76,30 62,72 18,72 4,30" fill={shape.color} /></svg>}
      {shapeId === "star" && <svg width="18" height="18" viewBox="0 0 80 80"><polygon points="40,4 49,30 76,30 54,46 62,72 40,56 18,72 26,46 4,30 31,30" fill={shape.color} /></svg>}
    </span>
  );
}

function renderShape(shape, isSelected, onClick) {
  const commonStyle = {
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRadius: "16px",
    border: isSelected ? "3px solid var(--teal)" : "2px solid transparent",
    padding: "8px",
    background: isSelected ? "rgba(15, 118, 110, 0.08)" : "rgba(255, 255, 255, 0.8)",
    boxShadow: isSelected ? "0 4px 12px rgba(15, 118, 110, 0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: isSelected ? "scale(1.05)" : "scale(1)",
    width: "90px",
    height: "90px",
  };

  return (
    <button
      key={shape.id}
      type="button"
      onClick={onClick}
      style={commonStyle}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "scale(1.03)";
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
        }
      }}
    >
      {shape.id === "circle" && (
        <svg width="56" height="56" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill={shape.color} stroke={shape.stroke} strokeWidth="3" />
        </svg>
      )}
      {shape.id === "square" && (
        <svg width="56" height="56" viewBox="0 0 80 80">
          <rect x="6" y="6" width="68" height="68" rx="8" fill={shape.color} stroke={shape.stroke} strokeWidth="3" />
        </svg>
      )}
      {shape.id === "triangle" && (
        <svg width="56" height="56" viewBox="0 0 80 80">
          <polygon points="40,6 74,70 6,70" fill={shape.color} stroke={shape.stroke} strokeWidth="3" />
        </svg>
      )}
      {shape.id === "pentagon" && (
        <svg width="56" height="56" viewBox="0 0 80 80">
          <polygon points="40,6 74,31 61,71 19,71 6,31" fill={shape.color} stroke={shape.stroke} strokeWidth="3" />
        </svg>
      )}
      {shape.id === "star" && (
        <svg width="56" height="56" viewBox="0 0 80 80">
          <polygon points="40,6 49,31 76,31 54,47 62,72 40,56 18,72 26,47 4,31 31,31" fill={shape.color} stroke={shape.stroke} strokeWidth="3" />
        </svg>
      )}
    </button>
  );
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
  const [commandClicks, setCommandClicks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  useEffect(() => {
    // Reset local interactive step state on step navigation
    setCommandClicks([]);
  }, [stepIndex]);

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

  function handleSpeak(text, locale) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 0.85;
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  function handleStopSpeech() {
    stopSpeech();
    setIsSpeaking(false);
  }

  function handleExit(confirm) {
    if (confirm) {
      handleStopSpeech();
      if (user) {
        localStorage.removeItem(`tash_draft_${user.userId}`);
      }
      router.push("/");
    } else {
      setShowExitModal(false);
    }
  }

  function nextStep() {
    handleStopSpeech();
    setStepIndex((prev) => {
      if (prev < allSteps.length - 1) {
        return prev + 1;
      } else {
        // Trigger submit in the next tick
        setTimeout(() => handleSubmit(), 0);
        return prev;
      }
    });
  }

  function prevStep() {
    handleStopSpeech();
    setStepIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }

  // Unified Step Timer Hook
  const [stepTimeLeft, setStepTimeLeft] = useState(null);

  useEffect(() => {
    handleStopSpeech();
    
    if (!started || !allSteps[stepIndex]) {
      setStepTimeLeft(null);
      return;
    }

    const currentStep = allSteps[stepIndex];
    let limit = null;

    if (currentStep.type === "registration" || currentStep.type === "mmse_registration") {
      limit = 30; // 30 seconds for Word presentation/registration
    } else if (currentStep.type === "clock" || currentStep.type === "mmse_pentagons") {
      limit = 180; // 3 minutes for Clock/Pentagons drawing
    } else if (currentStep.type === "recall" || currentStep.type === "mmse_recall") {
      limit = 30; // 30 seconds for Word recall
    } else if (currentStep.type === "transition") {
      limit = 20; // 20 seconds for Transition screen
    } else if (
      currentStep.type === "mmse_temporal" ||
      currentStep.type === "mmse_spatial" ||
      currentStep.type === "mmse_attention" ||
      currentStep.type === "mmse_naming" ||
      currentStep.type === "mmse_command" ||
      currentStep.type === "mmse_writing"
    ) {
      limit = 60; // 60 seconds for orientation, attention, naming, command, writing
    } else if (currentStep.type === "mmse_repetition" || currentStep.type === "mmse_reading") {
      limit = 30; // 30 seconds for repetition and reading obedience
    }

    if (limit === null) {
      setStepTimeLeft(null);
      return;
    }

    setStepTimeLeft(limit);

    const timer = setInterval(() => {
      setStepTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stepIndex, started, allSteps]);

  // Handle auto-advance when timer reaches 0
  useEffect(() => {
    if (started && stepTimeLeft === 0) {
      nextStep();
    }
  }, [stepTimeLeft, started]);


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

  const uiTranslations = {
    en: {
      next: "Next",
      submit: "Submit Assessment",
      submitting: "Submitting...",
      listen: "Listen",
      stop: "Stop",
    },
    es: {
      next: "Siguiente",
      submit: "Enviar evaluación",
      submitting: "Enviando...",
      listen: "Escuchar",
      stop: "Detener",
    },
    "zh-TW": {
      next: "下一步",
      submit: "提交評估",
      submitting: "提交中...",
      listen: "聆聽",
      stop: "停止",
    },
    ar: {
      next: "التالي",
      submit: "إرسال التقييم",
      submitting: "جاري الإرسال...",
      listen: "استمع",
      stop: "إيقاف",
    }
  };

  const currentLang = currentStep?.lang || "en";
  const t = uiTranslations[currentLang] || uiTranslations.en;

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
                {started ? `${testType === "mini-cog" ? "Mini-Cog" : "MMSE"} Assessment` : "Assessment Setup"}
              </span>
              <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700 }}>
                {started ? (
                  currentStep.type === "transition" 
                    ? "Transition" 
                    : `Part ${currentStep.lang === "en" ? "1 (English)" : `2 (${languageTests[currentStep.lang]?.nativeLabel || currentStep.lang.toUpperCase()})`}`
                ) : (
                  "Configure Assessment"
                )}
              </h1>
            </div>
          </div>

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
                  color: "var(--muted)",
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
                    
                    {/* Card Header with Step Title, Progress, and Time Limit */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Step {allSteps.filter((s, idx) => idx <= stepIndex && s.type !== "transition" && s.lang === currentStep.lang).length} of {allSteps.filter((s) => s.lang === currentStep.lang).length}
                        </span>
                        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", margin: "4px 0 0 0" }}>
                          {currentStep.title}
                        </h2>
                      </div>
                      {stepTimeLeft !== null && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            color: stepTimeLeft <= 10 ? "#b42318" : "#0f766e",
                            background: stepTimeLeft <= 10 ? "#fef3f2" : "#f0fdfa",
                            border: `1px solid ${stepTimeLeft <= 10 ? "#fda29b" : "#99f6e4"}`,
                            padding: "6px 12px",
                            borderRadius: "20px",
                          }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: stepTimeLeft <= 10 ? "#b42318" : "#0f766e",
                              display: "inline-block",
                            }}
                          />
                          <span>
                            Time Left: {Math.floor(stepTimeLeft / 60)}:{(stepTimeLeft % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Header instruction with audio read-aloud options */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                      <p style={{ fontSize: "1.02rem", color: "var(--ink)", fontWeight: 500, lineHeight: 1.5, flex: 1 }}>
                        {details.text}
                      </p>
                      
                      {details.voiceText && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleSpeak(details.voiceText, details.voiceLocale)}
                            style={{
                              background: isSpeaking ? "rgba(180, 35, 24, 0.08)" : "rgba(15, 118, 110, 0.08)",
                              color: isSpeaking ? "var(--red)" : "var(--teal)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {isSpeaking ? (
                              <>
                                <Square size={13} fill="var(--red)" />
                                {t.stop}
                              </>
                            ) : (
                              <>
                                <Volume2 size={15} />
                                {t.listen}
                              </>
                            )}
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
                          lang={currentStep.lang}
                          instruction={details.text}
                          onCapture={(dataUrl) => updateAnswer(`clockDrawing_${currentStep.lang}`, dataUrl)}
                        />
                      )}

                      {/* 3. Mini-Cog Recall */}
                      {currentStep.type === "recall" && (
                        <AudioRecorder
                          lang={currentStep.lang}
                          instruction={details.text}
                          onConfirm={(audioDataUrl) => updateAnswer(`recallAudio_${currentStep.lang}`, audioDataUrl)}
                        />
                      )}

                      {/* 4. MMSE Temporal Orientation */}
                      {currentStep.type === "mmse_temporal" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <AudioRecorder
                            lang={currentStep.lang}
                            instruction={
                              currentStep.lang === "es"
                                ? "Hable en el micrófono respondiendo al año, estación, mes, fecha y día de la semana"
                                : currentStep.lang === "zh-TW"
                                ? "在麥克風中說出年份、季節、月份、日期和星期幾"
                                : currentStep.lang === "ar"
                                ? "تحدث في الميكروفون مجيباً عن السنة والفصل والشهر والتاريخ ويوم الأسبوع"
                                : "Speak the year, season, month, date, and day of the week into the microphone"
                            }
                            onConfirm={(audioDataUrl) => updateAnswer(`temporalAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 5. MMSE Spatial Orientation */}
                      {currentStep.type === "mmse_spatial" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <AudioRecorder
                            lang={currentStep.lang}
                            instruction={
                              currentStep.lang === "es"
                                ? "Hable en el micrófono respondiendo a su estado, condado, ciudad, edificio y piso actual"
                                : currentStep.lang === "zh-TW"
                                ? "在麥克風中說出您目前所在的省/州、縣/區、城市、建築和樓層"
                                : currentStep.lang === "ar"
                                ? "تحدث في الميكروفون مجيباً عن الولاية والمحافظة والمدينة والمبنى والطابق الحالي"
                                : "Speak your current state, county, town, building, and floor into the microphone"
                            }
                            onConfirm={(audioDataUrl) => updateAnswer(`spatialAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 6. MMSE Registration */}
                      {currentStep.type === "mmse_registration" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <AudioRecorder
                            lang={currentStep.lang}
                            instruction={
                              currentStep.lang === "es"
                                ? "Escuche las palabras y repítalas en el micrófono"
                                : currentStep.lang === "zh-TW"
                                ? "聽詞彙並在麥克風中複誦"
                                : currentStep.lang === "ar"
                                ? "استمع إلى الكلمات وكررها في الميكروفون"
                                : "Listen to the words and repeat them into the microphone"
                            }
                            onConfirm={(audioDataUrl) => updateAnswer(`registrationAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 7. MMSE Attention & Calculation */}
                      {currentStep.type === "mmse_attention" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", width: "100%" }}>
                          <p style={{ fontSize: "0.92rem", color: "var(--muted)", margin: 0, textAlign: "center", maxWidth: "460px" }}>
                            {currentStep.lang === "es"
                              ? "Reste 7 de 100 sucesivamente y diga los 5 resultados en voz alta."
                              : currentStep.lang === "zh-TW"
                              ? "從100開始連續減去7，並大聲說出5個相減的答案。"
                              : currentStep.lang === "ar"
                              ? "اطرح 7 من 100 بشكل متتالي وانطق الإجابات الخمسة بصوت عالٍ."
                              : "Subtract 7 from 100 serially and speak the 5 consecutive answers aloud."
                            }
                          </p>
                          <AudioRecorder
                            lang={currentStep.lang}
                            instruction={
                              currentStep.lang === "es"
                                ? "Diga las 5 respuestas de resta en el micrófono"
                                : currentStep.lang === "zh-TW"
                                ? "在大聲說出5個減法答案"
                                : currentStep.lang === "ar"
                                ? "انطق إجابات الطرح الخمسة في الميكروفون"
                                : "Speak the 5 subtraction answers into the microphone"
                            }
                            onConfirm={(audioDataUrl) => updateAnswer(`attentionAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 8. MMSE Recall */}
                      {currentStep.type === "mmse_recall" && (
                        <AudioRecorder
                          lang={currentStep.lang}
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
                          <AudioRecorder
                            lang={currentStep.lang}
                            instruction={
                              currentStep.lang === "es"
                                ? "Haga clic en Grabar y repita la frase que escuchó"
                                : currentStep.lang === "zh-TW"
                                ? "點擊錄音並複誦您聽到的句子"
                                : currentStep.lang === "ar"
                                ? "انقر على زر التسجيل وكرر العبارة التي سمعتها"
                                : "Click start and repeat the phrase you heard"
                            }
                            onConfirm={(audioDataUrl) => updateAnswer(`repetitionAudio_${currentStep.lang}`, audioDataUrl)}
                          />
                        </div>
                      )}

                      {/* 11. MMSE 3-Stage Command */}
                      {currentStep.type === "mmse_command" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%" }}>
                          {/* Sequence slots */}
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8faf9", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 18px", width: "100%", justifyContent: "center" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                              {currentStep.lang === "es" ? "Sus toques:" : currentStep.lang === "zh-TW" ? "您的點擊：" : currentStep.lang === "ar" ? "لمساتك:" : "Your touches:"}
                            </span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {commandClicks.length >= 1 ? renderMiniShape(commandClicks[0]) : <span style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px dashed var(--line)", display: "inline-block" }} />}
                              <span style={{ color: "var(--muted)" }}>→</span>
                              {commandClicks.length >= 2 ? renderMiniShape(commandClicks[1]) : <span style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px dashed var(--line)", display: "inline-block" }} />}
                              <span style={{ color: "var(--muted)" }}>→</span>
                              {commandClicks.length >= 3 ? renderMiniShape(commandClicks[2]) : <span style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px dashed var(--line)", display: "inline-block" }} />}
                            </div>
                          </div>


                          {/* Shape selectors */}
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "10px" }}>
                            {COMMAND_SHAPES.map((shape) => {
                              const isClicked = commandClicks.includes(shape.id);
                              return renderShape(shape, isClicked, () => {
                                if (commandClicks.length < 3) {
                                  const newClicks = [...commandClicks, shape.id];
                                  setCommandClicks(newClicks);
                                  updateAnswer(`command_step1_${currentStep.lang}`, newClicks[0] === "circle");
                                  updateAnswer(`command_step2_${currentStep.lang}`, newClicks[1] === "square");
                                  updateAnswer(`command_step3_${currentStep.lang}`, newClicks[2] === "triangle");
                                }
                              });
                            })}
                          </div>

                          {/* Reset button */}
                          {commandClicks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCommandClicks([]);
                                updateAnswer(`command_step1_${currentStep.lang}`, false);
                                updateAnswer(`command_step2_${currentStep.lang}`, false);
                                updateAnswer(`command_step3_${currentStep.lang}`, false);
                              }}
                              style={{
                                background: "transparent",
                                color: "var(--muted)",
                                border: "1px solid var(--line)",
                                borderRadius: "8px",
                                padding: "8px 16px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginTop: "6px"
                              }}
                            >
                              <RotateCcw size={14} />
                              {currentStep.lang === "es" ? "Restablecer" : currentStep.lang === "zh-TW" ? "重設" : currentStep.lang === "ar" ? "إعادة تعيين" : "Reset"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* 12. MMSE Reading & Obedience */}
                      {currentStep.type === "mmse_reading" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px", width: "100%" }}>
                          <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--red)", letterSpacing: "1px", textAlign: "center" }}>
                            {details.commandText}
                          </span>

                          {/* Shape selector for Reading step */}
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "10px" }}>
                            {COMMAND_SHAPES.map((shape) => {
                              const isSelected = answers[`readingSelected_${currentStep.lang}`] === shape.id;
                              return renderShape(shape, isSelected, () => {
                                updateAnswer(`readingSelected_${currentStep.lang}`, shape.id);
                                updateAnswer(`readingObeyed_${currentStep.lang}`, shape.id === "star");
                              });
                            })}
                          </div>

                          {answers[`readingSelected_${currentStep.lang}`] && (
                            <div style={{ fontSize: "0.88rem", color: "var(--teal)", fontWeight: 600 }}>
                              {currentStep.lang === "es" ? "Selección registrada ✓" : currentStep.lang === "zh-TW" ? "已記錄選擇 ✓" : currentStep.lang === "ar" ? "تم تسجيل الاختيار ✓" : "Selection recorded ✓"}
                            </div>
                          )}
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
                            lang={currentStep.lang}
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
                t.submitting
              ) : stepIndex === allSteps.length - 1 ? (
                t.submit
              ) : (
                <>
                  {t.next}
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
