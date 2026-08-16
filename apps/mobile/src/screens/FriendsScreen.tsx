import { useCallback, useEffect, useState } from "react";
import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { friendRoomId, type Friendship } from "@stranger-bridge/shared";
import type { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";
import { colors } from "@/lib/theme";

export default function FriendsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [friendships, setFriendships] = useState<Friendship[] | null>(null);

  const load = useCallback(() => {
    apiClient.listFriends().then(setFriendships);
  }, []);

  useEffect(() => load(), [load]);

  if (!user) return null;

  const accepted = friendships?.filter((f) => f.status === "ACCEPTED") ?? [];
  const received = friendships?.filter((f) => f.status === "PENDING" && f.addressee.id === user.id) ?? [];
  const sent = friendships?.filter((f) => f.status === "PENDING" && f.requester.id === user.id) ?? [];

  function peerOf(f: Friendship) {
    return f.requester.id === user!.id ? f.addressee : f.requester;
  }

  function openChat(peerId: string, peerName: string) {
    navigation.navigate("Chat", { roomId: friendRoomId(user!.id, peerId), kind: "friend", peerId, peerName });
  }

  async function respond(id: string, action: "accept" | "decline") {
    await apiClient.respondFriendRequest(id, action);
    load();
  }

  async function remove(id: string) {
    await apiClient.removeFriend(id);
    load();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Friends</Text>

      {received.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend requests</Text>
          {received.map((f) => (
            <View key={f.id} style={styles.row}>
              <Text style={styles.name}>{peerOf(f).displayName}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.acceptButton} onPress={() => respond(f.id, "accept")}>
                  <Text style={styles.buttonTextWhite}>Accept</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => respond(f.id, "decline")}>
                  <Text style={styles.chipText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your friends</Text>
        {accepted.length === 0 && <Text style={styles.empty}>No friends yet — add someone from your chat history.</Text>}
        {accepted.map((f) => {
          const peer = peerOf(f);
          return (
            <View key={f.id} style={styles.row}>
              <Text style={styles.name}>{peer.displayName}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.primaryButton} onPress={() => openChat(peer.id, peer.displayName)}>
                  <Text style={styles.buttonTextWhite}>Chat / Call</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => remove(f.id)}>
                  <Text style={styles.dangerText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {sent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requests sent</Text>
          {sent.map((f) => (
            <View key={f.id} style={styles.row}>
              <Text style={styles.nameMuted}>{peerOf(f).displayName}</Text>
              <Pressable style={styles.secondaryButton} onPress={() => remove(f.id)}>
                <Text style={styles.chipText}>Cancel</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "600", color: colors.text, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "600", color: colors.textFaint, textTransform: "uppercase", marginBottom: 8 },
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
    marginBottom: 8,
  },
  name: { color: colors.text, fontWeight: "500" },
  nameMuted: { color: colors.textMuted },
  actions: { flexDirection: "row", gap: 8 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  acceptButton: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dangerButton: { borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  buttonTextWhite: { color: "white", fontSize: 13, fontWeight: "600" },
  dangerText: { color: "#fca5a5", fontSize: 13 },
  chipText: { color: colors.text, fontSize: 13 },
});
