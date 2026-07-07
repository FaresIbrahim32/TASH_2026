// Content + UI strings for the Cultural Face Screen feature.
// Structured per-language so `ar`/`zh-TW` can be added later without touching
// page/hook code. Picture images are per-language (culturally themed); the
// Ludo/Domino board images are language-neutral and shared from
// /culture-content/games/.
export const cultureTests = {
  en: {
    label: "English",
    nativeLabel: "English",
    voiceLocale: "en-US",
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
