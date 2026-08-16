import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { friendRoomId, type MatchHistoryEntry } from "@stranger-bridge/shared";
import type { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";
import { colors } from "@/lib/theme";

export default function HistoryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<MatchHistoryEntry[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiClient.listHistory().then(setEntries);
  }, []);

  async function addFriend(peerId: string) {
    try {
      await apiClient.sendFriendRequest({ addresseeId: peerId });
      setNotice("Friend request sent!");
    } catch {
      setNotice("Could not send friend request (maybe already sent).");
    }
  }

  function chatAgain(peerId: string, peerName: string) {
    if (!user) return;
    navigation.navigate("Chat", { roomId: friendRoomId(user.id, peerId), kind: "friend", peerId, peerName });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your chat history</Text>
      {notice && <Text style={styles.notice}>{notice}</Text>}
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.matchSessionId}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {entries === null ? "Loading…" : "No conversations yet — head to the Lobby to meet someone new."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.peer.displayName} {item.isFriend && <Text style={styles.friendTag}>· friend</Text>}
              </Text>
              <Text style={styles.meta}>
                {new Date(item.startedAt).toLocaleString()}
                {item.endedReason ? ` · ended (${item.endedReason.toLowerCase()})` : " · ongoing"}
              </Text>
              {item.lastMessagePreview && (
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessagePreview}
                </Text>
              )}
            </View>
            {item.isFriend ? (
              <Pressable style={styles.primaryButton} onPress={() => chatAgain(item.peer.id, item.peer.displayName)}>
                <Text style={styles.primaryButtonText}>Chat again</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.secondaryButton} onPress={() => addFriend(item.peer.id)}>
                <Text style={styles.chipText}>+ Add friend</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "600", color: colors.text, marginBottom: 12 },
  notice: { color: "#c7d2fe", backgroundColor: "#1e1b4b", padding: 10, borderRadius: 8, marginBottom: 8 },
  empty: { color: colors.textMuted, marginTop: 20, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  name: { color: colors.text, fontWeight: "600" },
  friendTag: { color: "#34d399", fontSize: 12 },
  meta: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  preview: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  primaryButtonText: { color: "white", fontSize: 13, fontWeight: "600" },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: colors.text, fontSize: 13 },
});
