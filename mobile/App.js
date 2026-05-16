import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Speech from "expo-speech";
import { Picker } from "@react-native-picker/picker";
import {
  I18nManager,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { languageTests, supportedFirstLanguages } from "./src/tests";

const emptyForm = {
  age: "",
  gender: "",
  educationYears: "",
  countryOrRegion: "",
  secondLanguage: "",
  englishRecall: "",
  secondLanguageRecall: "",
};

function speak(text, locale) {
  Speech.stop();
  Speech.speak(text, {
    language: locale,
    rate: 0.88,
  });
}

function VoiceButton({ text, locale, label }) {
  return (
    <TouchableOpacity style={styles.voiceButton} onPress={() => speak(text, locale)}>
      <Text style={styles.voiceButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function TextField({ value, onChangeText, placeholder, keyboardType = "default", multiline = false }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && styles.textArea]}
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

function TaskPanel({ test }) {
  const ui = test.ui ?? languageTests.en.ui;
  const isRtl = test.direction === "rtl";

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={[styles.panelKicker, isRtl && styles.rtlText]}>{ui.instructionsTitle}</Text>
          <Text style={[styles.panelTitle, isRtl && styles.rtlText]}>{test.nativeLabel}</Text>
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={() => Speech.stop()}>
          <Text style={styles.stopButtonText}>■</Text>
        </TouchableOpacity>
      </View>

      <TaskCard
        step={`${ui.stepLabel} 1`}
        title={ui.taskTitles.registration}
        body={test.tasks.registration}
        words={test.wordList}
        ui={ui}
        locale={test.voiceLocale}
        isRtl={isRtl}
      />
      <TaskCard
        step={`${ui.stepLabel} 2`}
        title={ui.taskTitles.clock}
        body={test.tasks.clock}
        ui={ui}
        locale={test.voiceLocale}
        isRtl={isRtl}
      />
      <TaskCard
        step={`${ui.stepLabel} 3`}
        title={ui.taskTitles.recall}
        body={test.tasks.recall}
        ui={ui}
        locale={test.voiceLocale}
        isRtl={isRtl}
      />
    </View>
  );
}

function TaskCard({ step, title, body, words = [], ui, locale, isRtl }) {
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
      <VoiceButton text={body} locale={locale} label={ui.listen} />
    </View>
  );
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [finished, setFinished] = useState(false);
  const secondLanguage = form.secondLanguage ? languageTests[form.secondLanguage] : null;
  const showSecondLanguage = secondLanguage?.imported;

  function update(field, value) {
    setFinished(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Memory and clock activity</Text>
          <Text style={styles.headerCopy}>
            First complete the English version. Then choose another language if you speak one.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>About you</Text>
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
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Phase 1: English</Text>
          <Text style={styles.mutedText}>
            Listen to the English instructions first. When asked to draw the clock, use the sheet provided by the clinician.
          </Text>
        </View>

        <TaskPanel test={languageTests.en} />

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>English answer</Text>
          <FieldLabel>{languageTests.en.ui.answerLabel}</FieldLabel>
          <TextField
            value={form.englishRecall}
            onChangeText={(value) => update("englishRecall", value)}
            placeholder={languageTests.en.ui.answerPlaceholder}
            multiline
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Phase 2: Another language</Text>
          <FieldLabel>Do you speak another language best?</FieldLabel>
          <NativeSelect
            selectedValue={form.secondLanguage}
            onValueChange={(value) => update("secondLanguage", value)}
          >
            <Picker.Item label="No additional language selected" value="" />
            {supportedFirstLanguages
              .filter((language) => language.code !== "en")
              .map((language) => (
                <Picker.Item
                  key={language.code}
                  label={`${language.label}${language.imported ? "" : " (coming soon)"}`}
                  value={language.code}
                />
              ))}
          </NativeSelect>
          {!form.secondLanguage && (
            <Text style={styles.softNotice}>
              Choose a language only if the patient speaks one. Otherwise continue with English only.
            </Text>
          )}
          {form.secondLanguage && !showSecondLanguage && (
            <Text style={styles.softNotice}>This language is not ready yet. Only English will be shown.</Text>
          )}
        </View>

        {showSecondLanguage && <TaskPanel test={secondLanguage} />}

        {showSecondLanguage && (
          <View style={styles.panel}>
            <FieldLabel>{secondLanguage.ui.answerLabel}</FieldLabel>
            <TextInput
              value={form.secondLanguageRecall}
              onChangeText={(value) => update("secondLanguageRecall", value)}
              placeholder={secondLanguage.ui.answerPlaceholder}
              multiline
              style={[styles.input, styles.textArea, secondLanguage.direction === "rtl" && styles.rtlInput]}
              textAlign={secondLanguage.direction === "rtl" ? "right" : "left"}
              textAlignVertical="top"
            />
          </View>
        )}

        <View style={styles.panel}>
          <TouchableOpacity style={styles.finishButton} onPress={() => setFinished(true)}>
            <Text style={styles.finishButtonText}>Finish activity</Text>
          </TouchableOpacity>
          {finished && <Text style={styles.doneText}>Your responses are ready.</Text>}
        </View>
      </ScrollView>
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
  finishButton: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 7,
    minHeight: 48,
    justifyContent: "center",
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  doneText: {
    color: "#177245",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
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
