import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ApiError, type ChatMessage, type ReportInput } from "@stranger-bridge/shared";
import type { RootStackParamList } from "@/navigation/types";
import { ChatPanel } from "@/components/ChatPanel";
import { CallPanel } from "@/components/CallPanel";
import { useAuth } from "@/lib/useAuth";
import { useWebRtc } from "@/lib/useWebRtc";
import { getSocket } from "@/lib/socket";
import { apiClient } from "@/lib/apiClient";
import { colors } from "@/lib/theme";

const REPORT_REASONS: { value: ReportInput["reason"]; label: string }[] = [
  { value: "harassment", label: "Harassment" },
  { value: "explicit_content", label: "Explicit content" },
  { value: "spam", label: "Spam" },
  { value: "underage", label: "Appears underage" },
  { value: "other", label: "Other" },
];

export default function ChatCallScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const { roomId, kind, peerId, peerName, matchSessionId } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ended, setEnded] = useState<string | null>(null);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<ReportInput["reason"]>("harassment");
  const [reportDetails, setReportDetails] = useState("");

  const call = useWebRtc(roomId, peerId, user?.id);

  useEffect(() => {
    navigation.setOptions({ title: peerName });
  }, [navigation, peerName]);

  useEffect(() => {
    const socket = getSocket();
    if (kind === "friend") socket.emit("room:join", { roomId });

    const onMessage = (message: ChatMessage) => {
      if (message.roomId !== roomId) return;
      setMessages((prev) => [...prev, message]);
    };
    const onEnded = (payload: { roomId: string; reason: string }) => {
      if (payload.roomId !== roomId) return;
      setEnded(payload.reason);
    };

    socket.on("chat:message", onMessage);
    socket.on("match:ended", onEnded);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("match:ended", onEnded);
    };
  }, [roomId, kind]);

  function sendMessage(body: string) {
    getSocket().emit("chat:send", { roomId, body });
  }

  function leaveChat() {
    if (kind === "match" && !ended) getSocket().emit("match:leave", { roomId });
    navigation.goBack();
  }

  async function addFriend() {
    try {
      await apiClient.sendFriendRequest({ addresseeId: peerId });
      setFriendRequestSent(true);
      setNotice("Friend request sent!");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not send friend request");
    }
  }

  async function blockUser() {
    await apiClient.blockUser(peerId).catch(() => undefined);
    setNotice(`${peerName} has been blocked.`);
    leaveChat();
  }

  async function submitReport() {
    try {
      await apiClient.createReport({
        reportedId: peerId,
        matchSessionId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setNotice(`${peerName} was reported and blocked.`);
      setShowReportForm(false);
      leaveChat();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Could not submit report");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        {kind === "match" && !friendRequestSent && (
          <Pressable style={styles.secondaryButton} onPress={addFriend}>
            <Text style={styles.chipText}>+ Add friend</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryButton} onPress={() => setShowReportForm((s) => !s)}>
          <Text style={styles.chipText}>Report</Text>
        </Pressable>
        <Pressable style={styles.dangerButton} onPress={blockUser}>
          <Text style={styles.dangerText}>Block</Text>
        </Pressable>
        <Pressable style={styles.leaveButton} onPress={leaveChat}>
          <Text style={styles.buttonTextWhite}>{kind === "match" ? "Skip / Leave" : "Close"}</Text>
        </Pressable>
      </View>

      {notice && <Text style={styles.notice}>{notice}</Text>}

      {showReportForm && (
        <View style={styles.reportBox}>
          <View style={styles.chipRow}>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReportReason(r.value)}
                style={[styles.chip, reportReason === r.value && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder="Additional details (optional)"
            placeholderTextColor={colors.textFaint}
            style={styles.textArea}
            multiline
          />
          <Pressable style={styles.dangerFullButton} onPress={submitReport}>
            <Text style={styles.buttonTextWhite}>Submit report &amp; block</Text>
          </Pressable>
        </View>
      )}

      {user && <CallPanel peerName={peerName} call={call} />}

      <View style={{ flex: 1, marginTop: 10 }}>
        <ChatPanel
          messages={messages}
          selfId={user?.id ?? ""}
          disabled={Boolean(ended)}
          disabledReason={ended ? `Chat ended (${ended.toLowerCase()})` : undefined}
          onSend={sendMessage}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 12 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  dangerButton: { borderWidth: 1, borderColor: "#7f1d1d", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  leaveButton: { backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.text, fontSize: 12 },
  dangerText: { color: "#fca5a5", fontSize: 12 },
  buttonTextWhite: { color: "white", fontSize: 12, fontWeight: "600" },
  notice: { color: "#c7d2fe", backgroundColor: "#1e1b4b", padding: 8, borderRadius: 8, marginBottom: 8, fontSize: 12 },
  reportBox: { borderWidth: 1, borderColor: "#7f1d1d", backgroundColor: "#450a0a33", borderRadius: 10, padding: 10, marginBottom: 8, gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipSelected: { backgroundColor: colors.danger, borderColor: colors.danger },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    minHeight: 50,
  },
  dangerFullButton: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
});
