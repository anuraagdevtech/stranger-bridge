import { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ChatMessage } from "@stranger-bridge/shared";
import { colors } from "@/lib/theme";

interface ChatPanelProps {
  messages: ChatMessage[];
  selfId: string;
  disabled: boolean;
  disabledReason?: string;
  onSend: (body: string) => void;
}

export function ChatPanel({ messages, selfId, disabled, disabledReason, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  function submit() {
    const body = draft.trim();
    if (!body || disabled) return;
    onSend(body);
    setDraft("");
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 10, gap: 6 }}
        ListEmptyComponent={<Text style={styles.empty}>Say hi 👋</Text>}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.senderId === selfId ? styles.alignEnd : styles.alignStart]}>
            <Text style={[styles.bubble, item.senderId === selfId ? styles.bubbleSelf : styles.bubblePeer]}>
              {item.body}
            </Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          editable={!disabled}
          placeholder={disabled ? disabledReason ?? "Chat ended" : "Type a message…"}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={2000}
        />
        <Pressable style={[styles.sendButton, disabled && { opacity: 0.5 }]} onPress={submit} disabled={disabled}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" },
  empty: { textAlign: "center", color: colors.textFaint, marginTop: 20 },
  bubbleRow: { flexDirection: "row" },
  alignEnd: { justifyContent: "flex-end" },
  alignStart: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  bubbleSelf: { backgroundColor: colors.primary, color: "white" },
  bubblePeer: { backgroundColor: colors.surfaceAlt, color: colors.text },
  inputRow: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: colors.border, padding: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  sendButtonText: { color: "white", fontWeight: "600", fontSize: 13 },
});
