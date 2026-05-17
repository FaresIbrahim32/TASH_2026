import { useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { createAudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { Picker } from "@react-native-picker/picker";
import {
  I18nManager,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { languageTests, supportedFirstLanguages } from "./src/tests";

const defaultTtsEndpoint =
  Platform.OS === "web" && typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3000/api/tts"
    : "/api/tts";
const TTS_ENDPOINT = process.env.EXPO_PUBLIC_TTS_ENDPOINT || defaultTtsEndpoint;

const emptyForm = {
  age: "",
  gender: "",
  educationYears: "",
  countryOrRegion: "",
  firstLanguage: "",
  englishRecall: "",
  firstLanguageRecall: "",
};

function FieldLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function TextField({ value, onChangeText, placeholder, keyboardType = "default", multiline = false, rtl = false }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && styles.textArea, rtl && styles.rtlInput]}
      textAlign={rtl ? "right" : "left"}
      textAlignVertical={multiline ? "top" : "center"}
    />
  );
}

function NativeSelect({ selectedValue, onValueChange, children }) {
  return (
    <View style={styles.pickerWrap}>
      <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
        {children}
      </Picker>
    </View>
  );
}

function ScreenHeader({ subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Memory and clock activity</Text>
      <Text style={styles.headerCopy}>{subtitle}</Text>
    </View>
  );
}

function VoiceButton({ text, language, label, onPlay }) {
  return (
    <TouchableOpacity style={styles.voiceButton} onPress={() => onPlay(text, language)}>
      <Text style={styles.voiceButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function speakWithDeviceVoice(text, language) {
  const locale = languageTests[language]?.voiceLocale ?? "en-US";
  Speech.stop();
  Speech.speak(text, {
    language: locale,
    rate: 0.88,
  });
}

function TaskPanel({ test, onPlay, onStop }) {
  const ui = test.ui ?? languageTests.en.ui;
  const isRtl = test.direction === "rtl";

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={[styles.panelKicker, isRtl && styles.rtlText]}>{ui.instructionsTitle}</Text>
          <Text style={[styles.panelTitle, isRtl && styles.rtlText]}>{test.nativeLabel}</Text>
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={onStop}>
          <Text style={styles.stopButtonText}>■</Text>
        </TouchableOpacity>
      </View>

      <TaskCard
        step={`${ui.stepLabel} 1`}
        title={ui.taskTitles.registration}
        body={test.tasks.registration}
        words={test.wordList}
        ui={ui}
        language={test.code}
        onPlay={onPlay}
        isRtl={isRtl}
      />
      <TaskCard
        step={`${ui.stepLabel} 2`}
        title={ui.taskTitles.clock}
        body={test.tasks.clock}
        ui={ui}
        language={test.code}
        onPlay={onPlay}
        isRtl={isRtl}
      />
      <TaskCard
        step={`${ui.stepLabel} 3`}
        title={ui.taskTitles.recall}
        body={test.tasks.recall}
        ui={ui}
        language={test.code}
        onPlay={onPlay}
        isRtl={isRtl}
      />
    </View>
  );
}

function TaskCard({ step, title, body, words = [], ui, language, onPlay, isRtl }) {
  return (
    <View style={styles.taskCard}>
      <Text style={[styles.step, isRtl && styles.rtlText]}>{step}</Text>
      <Text style={[styles.taskTitle, isRtl && styles.rtlText]}>{title}</Text>
      <Text style={[styles.taskBody, isRtl && styles.rtlText]}>{body}</Text>
      {words.length > 0 && (
        <View style={[styles.wordRow, isRtl && styles.rtlRow]}>
          {words.map((word) => (
            <Text key={word} style={styles.wordChip}>
              {word}
            </Text>
          ))}
        </View>
      )}
      <VoiceButton text={body} language={language} label={ui.listen} onPlay={onPlay} />
    </View>
  );
}

function PrimaryButton({ children, onPress, disabled = false }) {
  return (
    <TouchableOpacity style={[styles.primaryButton, disabled && styles.disabledButton]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({ children, onPress }) {
  return (
    <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [screen, setScreen] = useState("signup");
  const [form, setForm] = useState(emptyForm);
  const [audioStatus, setAudioStatus] = useState("");
  const playerRef = useRef(null);

  const selectedLanguage = form.firstLanguage ? languageTests[form.firstLanguage] : null;
  const showPhase2 = selectedLanguage?.imported && form.firstLanguage !== "en";

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function stopAudio() {
    try {
      playerRef.current?.pause?.();
      playerRef.current?.remove?.();
      Speech.stop();
    } catch {
      // Best effort stop across native/web players.
    }
    playerRef.current = null;
    setAudioStatus("");
  }

  async function playElevenLabs(text, language) {
    stopAudio();
    setAudioStatus("Loading voice...");

    try {
      const url = `${TTS_ENDPOINT}?language=${encodeURIComponent(language)}&text=${encodeURIComponent(text)}`;
      const response = await fetch(url);

      if (!response.ok) {
        let message = "ElevenLabs voice failed. Using device voice instead.";
        try {
          const error = await response.json();
          const details = typeof error.details === "string" ? JSON.parse(error.details) : null;
          message = details?.detail?.message || error.message || message;
        } catch {
          // Keep generic fallback message.
        }

        speakWithDeviceVoice(text, language);
        setAudioStatus(`${message} Device voice is playing.`);
        return;
      }

      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      player.play();
      setAudioStatus("Playing ElevenLabs voice");
    } catch (error) {
      speakWithDeviceVoice(text, language);
      setAudioStatus("ElevenLabs voice failed. Device voice is playing.");
    }
  }

  function goToLanguageQuestion() {
    setScreen("language");
  }

  function continueFromLanguage() {
    if (!form.firstLanguage || form.firstLanguage === "en") {
      setScreen("done");
      return;
    }

    if (showPhase2) {
      setScreen("phase2");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {screen === "signup" && (
        <ScrollView contentContainerStyle={styles.page}>
          <ScreenHeader subtitle="Before we begin, please answer a few background questions." />
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Sign up</Text>
            <FieldLabel>Age</FieldLabel>
            <TextField
              value={form.age}
              onChangeText={(value) => update("age", value)}
              placeholder="Age"
              keyboardType="number-pad"
            />
            <FieldLabel>Gender</FieldLabel>
            <NativeSelect selectedValue={form.gender} onValueChange={(value) => update("gender", value)}>
              <Picker.Item label="Select" value="" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Non-binary" value="nonbinary" />
              <Picker.Item label="Prefer not to say" value="prefer-not" />
            </NativeSelect>
            <FieldLabel>Education years</FieldLabel>
            <TextField
              value={form.educationYears}
              onChangeText={(value) => update("educationYears", value)}
              placeholder="Years"
              keyboardType="number-pad"
            />
            <FieldLabel>Country or region</FieldLabel>
            <TextField
              value={form.countryOrRegion}
              onChangeText={(value) => update("countryOrRegion", value)}
              placeholder="Country or region"
            />
            <PrimaryButton onPress={() => setScreen("phase1")}>Continue to Phase 1</PrimaryButton>
          </View>
        </ScrollView>
      )}

      {screen === "phase1" && (
        <ScrollView contentContainerStyle={styles.page}>
          <ScreenHeader subtitle="Phase 1 is completed in English." />
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Phase 1: English</Text>
            <Text style={styles.mutedText}>
              Listen to each instruction. When asked to draw the clock, use the sheet provided by the clinician.
            </Text>
            {audioStatus && <Text style={styles.audioStatus}>{audioStatus}</Text>}
          </View>
          <TaskPanel test={languageTests.en} onPlay={playElevenLabs} onStop={stopAudio} />
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>English answer</Text>
            <FieldLabel>{languageTests.en.ui.answerLabel}</FieldLabel>
            <TextField
              value={form.englishRecall}
              onChangeText={(value) => update("englishRecall", value)}
              placeholder={languageTests.en.ui.answerPlaceholder}
              multiline
            />
            <PrimaryButton onPress={goToLanguageQuestion}>Finish Phase 1</PrimaryButton>
          </View>
        </ScrollView>
      )}

      {screen === "language" && (
        <ScrollView contentContainerStyle={styles.page}>
          <ScreenHeader subtitle="Now tell us the language you learned first or speak most naturally." />
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>First language</Text>
            <FieldLabel>What is your first language?</FieldLabel>
            <NativeSelect selectedValue={form.firstLanguage} onValueChange={(value) => update("firstLanguage", value)}>
              <Picker.Item label="Select a language" value="" />
              {supportedFirstLanguages.map((language) => (
                <Picker.Item
                  key={language.code}
                  label={`${language.label}${language.imported ? "" : " (coming soon)"}`}
                  value={language.code}
                />
              ))}
            </NativeSelect>
            {form.firstLanguage && !showPhase2 && form.firstLanguage !== "en" && (
              <Text style={styles.softNotice}>This language is not ready yet.</Text>
            )}
            {form.firstLanguage === "en" && (
              <Text style={styles.softNotice}>English was already completed in Phase 1.</Text>
            )}
            <PrimaryButton onPress={continueFromLanguage} disabled={!form.firstLanguage}>
              Continue
            </PrimaryButton>
            <SecondaryButton onPress={() => setScreen("phase1")}>Back to Phase 1</SecondaryButton>
          </View>
        </ScrollView>
      )}

      {screen === "phase2" && showPhase2 && (
        <ScrollView contentContainerStyle={styles.page}>
          <ScreenHeader subtitle={`Phase 2 is completed in ${selectedLanguage.label}.`} />
          <TaskPanel test={selectedLanguage} onPlay={playElevenLabs} onStop={stopAudio} />
          {audioStatus && <Text style={styles.floatingStatus}>{audioStatus}</Text>}
          <View style={styles.panel}>
            <Text style={[styles.sectionTitle, selectedLanguage.direction === "rtl" && styles.rtlText]}>
              {selectedLanguage.ui.instructionsTitle}
            </Text>
            <FieldLabel>{selectedLanguage.ui.answerLabel}</FieldLabel>
            <TextField
              value={form.firstLanguageRecall}
              onChangeText={(value) => update("firstLanguageRecall", value)}
              placeholder={selectedLanguage.ui.answerPlaceholder}
              multiline
              rtl={selectedLanguage.direction === "rtl"}
            />
            <PrimaryButton onPress={() => setScreen("done")}>Finish Phase 2</PrimaryButton>
            <SecondaryButton onPress={() => setScreen("language")}>Back</SecondaryButton>
          </View>
        </ScrollView>
      )}

      {screen === "done" && (
        <ScrollView contentContainerStyle={styles.page}>
          <ScreenHeader subtitle="Your responses are ready for clinician review." />
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Complete</Text>
            <Text style={styles.mutedText}>Thank you. The activity is finished.</Text>
            <PrimaryButton onPress={() => setScreen("signup")}>Start over</PrimaryButton>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f7f4",
  },
  page: {
    paddingBottom: 28,
  },
  header: {
    backgroundColor: "#10251f",
    paddingHorizontal: 20,
    paddingVertical: 26,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  headerCopy: {
    color: "#c9ddd8",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  panel: {
    backgroundColor: "#fff",
    borderColor: "#d9dfd8",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: {
    color: "#0d5d58",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },
  label: {
    color: "#5d6863",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#fbfcfb",
    borderColor: "#cdd5d1",
    borderRadius: 7,
    borderWidth: 1,
    color: "#17201c",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 12,
  },
  pickerWrap: {
    backgroundColor: "#fbfcfb",
    borderColor: "#cdd5d1",
    borderRadius: 7,
    borderWidth: 1,
    overflow: "hidden",
  },
  mutedText: {
    color: "#5d6863",
    fontSize: 16,
    lineHeight: 23,
  },
  softNotice: {
    backgroundColor: "#f7f9f8",
    borderColor: "#d9dfd8",
    borderRadius: 8,
    borderWidth: 1,
    color: "#5d6863",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    padding: 12,
  },
  audioStatus: {
    color: "#0d5d58",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12,
  },
  floatingStatus: {
    color: "#0d5d58",
    fontSize: 14,
    fontWeight: "800",
    marginHorizontal: 16,
    marginTop: 10,
  },
  panelHeader: {
    borderBottomColor: "#d9dfd8",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
  },
  panelKicker: {
    color: "#5d6863",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  panelTitle: {
    color: "#17201c",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  stopButton: {
    alignItems: "center",
    backgroundColor: "#f3f6f4",
    borderColor: "#d9dfd8",
    borderRadius: 7,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stopButtonText: {
    color: "#0d5d58",
    fontSize: 14,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderColor: "#cfd8d3",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  step: {
    color: "#0d5d58",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  taskTitle: {
    color: "#17201c",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 8,
  },
  taskBody: {
    color: "#303b36",
    fontSize: 17,
    lineHeight: 26,
    marginTop: 10,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  wordChip: {
    backgroundColor: "#eef7f5",
    borderColor: "#c6e0db",
    borderRadius: 999,
    borderWidth: 1,
    color: "#0d5d58",
    fontSize: 16,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voiceButton: {
    alignSelf: "flex-start",
    backgroundColor: "#143d35",
    borderRadius: 7,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voiceButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 7,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#f7f9f8",
    borderColor: "#d9dfd8",
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
  },
  secondaryButtonText: {
    color: "#17201c",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.55,
  },
  rtlText: {
    writingDirection: "rtl",
    textAlign: "right",
  },
  rtlInput: {
    writingDirection: "rtl",
  },
  rtlRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
  },
});
