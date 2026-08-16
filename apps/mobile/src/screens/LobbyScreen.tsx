import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Gender, MatchFoundPayload } from "@stranger-bridge/shared";
import type { RootStackParamList } from "@/navigation/types";
import { getSocket } from "@/lib/socket";
import { colors } from "@/lib/theme";

type Status = "idle" | "searching" | "error";
const GENDER_OPTIONS: { value: Gender | "any"; label: string }[] = [
  { value: "any", label: "Anyone" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
];

export default function LobbyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interests, setInterests] = useState("");
  const [genderPreference, setGenderPreference] = useState<Gender | "any">("any");
  const [region, setRegion] = useState("");
  const listenersAttached = useRef(false);

  useEffect(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;
    const socket = getSocket();

    const onFound = (payload: MatchFoundPayload) => {
      setStatus("idle");
      navigation.navigate("Chat", {
        roomId: payload.roomId,
        kind: "match",
        peerId: payload.peer.id,
        peerName: payload.peer.displayName,
        matchSessionId: payload.matchSessionId,
      });
    };
    const onSearching = () => setStatus("searching");
    const onError = (payload: { message: string }) => {
      setStatus("error");
      setErrorMessage(payload.message);
    };

    socket.on("matchmaking:found", onFound);
    socket.on("matchmaking:searching", onSearching);
    socket.on("matchmaking:error", onError);

    return () => {
      socket.off("matchmaking:found", onFound);
      socket.off("matchmaking:searching", onSearching);
      socket.off("matchmaking:error", onError);
      listenersAttached.current = false;
    };
  }, [navigation]);

  function findMatch() {
    setErrorMessage(null);
    getSocket().emit("matchmaking:find", {
      interests: interests.split(",").map((i) => i.trim()).filter(Boolean),
      genderPreference,
      region: region.trim() || "any",
    });
    setStatus("searching");
  }

  function cancelSearch() {
    getSocket().emit("matchmaking:cancel");
    setStatus("idle");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a stranger to talk to</Text>
      <Text style={styles.subtitle}>Set optional filters, then start a text, voice, or video chat.</Text>

      <Text style={styles.label}>Shared interests (comma-separated)</Text>
      <TextInput
        value={interests}
        onChangeText={setInterests}
        placeholder="music, gaming, travel"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />

      <Text style={styles.label}>Match gender</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((g) => (
          <Pressable
            key={g.value}
            onPress={() => setGenderPreference(g.value)}
            style={[styles.chip, genderPreference === g.value && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{g.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Region</Text>
      <TextInput
        value={region}
        onChangeText={setRegion}
        placeholder="Any"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {status === "searching" ? (
        <View style={styles.searchingBox}>
          <Text style={styles.searchingText}>Looking for someone to match you with…</Text>
          <Pressable onPress={cancelSearch} style={styles.cancelButton}>
            <Text style={styles.chipText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.button} onPress={findMatch}>
          <Text style={styles.buttonText}>Start matching</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
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
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, marginTop: 24, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
  searchingBox: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#3730a3",
    backgroundColor: "#1e1b4b",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchingText: { color: "#c7d2fe", fontSize: 13, flex: 1 },
  cancelButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  error: { color: "#fca5a5", backgroundColor: colors.dangerBg, padding: 10, borderRadius: 8, marginTop: 12 },
});
