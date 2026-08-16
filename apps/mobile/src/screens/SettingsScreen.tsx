import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Gender, PublicUser } from "@stranger-bridge/shared";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";
import { colors } from "@/lib/theme";

export default function SettingsScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [region, setRegion] = useState(user?.region ?? "");
  const [interests, setInterests] = useState(user?.interests.join(", ") ?? "");
  const [gender] = useState<Gender | undefined>(user?.gender ?? undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blocked, setBlocked] = useState<PublicUser[] | null>(null);

  useEffect(() => {
    apiClient.listBlocks().then(setBlocked);
  }, []);

  async function onSave() {
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.updateProfile({
        displayName,
        gender,
        region: region.trim() || undefined,
        interests: interests.split(",").map((i) => i.trim()).filter(Boolean).slice(0, 10),
      });
      await refreshUser();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function unblock(userId: string) {
    await apiClient.unblockUser(userId);
    setBlocked((prev) => prev?.filter((u) => u.id !== userId) ?? null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <Text style={styles.label}>Display name</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholderTextColor={colors.textFaint} />

      <Text style={styles.label}>Region</Text>
      <TextInput value={region} onChangeText={setRegion} style={styles.input} placeholderTextColor={colors.textFaint} />

      <Text style={styles.label}>Interests (comma-separated)</Text>
      <TextInput value={interests} onChangeText={setInterests} style={styles.input} placeholderTextColor={colors.textFaint} />

      <Pressable style={styles.button} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save changes"}</Text>
      </Pressable>
      {saved && <Text style={styles.saved}>Saved</Text>}

      <Text style={[styles.label, { marginTop: 28 }]}>Blocked users</Text>
      {blocked?.length === 0 && <Text style={styles.empty}>You haven&apos;t blocked anyone.</Text>}
      {blocked?.map((u) => (
        <View key={u.id} style={styles.row}>
          <Text style={styles.name}>{u.displayName}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => unblock(u.id)}>
            <Text style={styles.chipText}>Unblock</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.dangerText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "600", color: colors.text },
  email: { color: colors.textFaint, fontSize: 13, marginBottom: 16 },
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
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, marginTop: 20, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 15 },
  saved: { color: "#34d399", marginTop: 8 },
  empty: { color: colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  name: { color: colors.text },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: colors.text, fontSize: 13 },
  logoutButton: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerText: { color: "#fca5a5", fontWeight: "600" },
});
