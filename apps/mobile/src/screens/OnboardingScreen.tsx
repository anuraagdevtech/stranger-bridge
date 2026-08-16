import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ApiError, MIN_AGE_YEARS, type Gender } from "@stranger-bridge/shared";
import { useAuth } from "@/lib/useAuth";
import { colors } from "@/lib/theme";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [gender, setGender] = useState<Gender | null>(null);
  const [region, setRegion] = useState("");
  const [interests, setInterests] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("Enter your date of birth as YYYY-MM-DD");
      return;
    }
    if (!tosAccepted) {
      setError("You must accept the Terms of Service to continue");
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding({
        birthDate,
        tosAccepted: true,
        gender: gender ?? undefined,
        region: region.trim() || undefined,
        interests: interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean)
          .slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Just a few things first</Text>
      <Text style={styles.subtitle}>You must be {MIN_AGE_YEARS}+ to use Stranger Bridge.</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
      <TextInput
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="1998-04-12"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />

      <Text style={styles.label}>Gender (optional)</Text>
      <View style={styles.chipRow}>
        {GENDERS.map((g) => (
          <Pressable
            key={g.value}
            onPress={() => setGender(gender === g.value ? null : g.value)}
            style={[styles.chip, gender === g.value && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{g.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Region (optional)</Text>
      <TextInput
        value={region}
        onChangeText={setRegion}
        placeholder="e.g. Europe, US-West, India"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />

      <Text style={styles.label}>Interests (optional, comma-separated)</Text>
      <TextInput
        value={interests}
        onChangeText={setInterests}
        placeholder="music, hiking, movies"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />

      <View style={styles.tosRow}>
        <Switch value={tosAccepted} onValueChange={setTosAccepted} />
        <Text style={styles.tosText}>
          I confirm I meet the age requirement and accept the Terms of Service. This platform
          connects you with strangers — be respectful, and report or block anyone who makes you
          uncomfortable.
        </Text>
      </View>

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Saving…" : "Continue"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  tosRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 20 },
  tosText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 15 },
  error: { color: "#fca5a5", backgroundColor: colors.dangerBg, padding: 10, borderRadius: 8, marginBottom: 8 },
});
