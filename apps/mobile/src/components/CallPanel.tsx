import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RTCView, type MediaStream } from "react-native-webrtc";
import type { CallState } from "@/lib/useWebRtc";
import { colors } from "@/lib/theme";

interface CallPanelProps {
  peerName: string;
  call: {
    state: CallState;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    startCall: (kind: "voice" | "video") => void;
    acceptCall: () => void;
    declineCall: () => void;
    endCall: () => void;
  };
}

export function CallPanel({ peerName, call }: CallPanelProps) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  function toggleMute() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.localStream?.getAudioTracks().forEach((t: any) => (t.enabled = muted));
    setMuted((m) => !m);
  }

  function toggleCamera() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.localStream?.getVideoTracks().forEach((t: any) => (t.enabled = cameraOff));
    setCameraOff((c) => !c);
  }

  if (call.state.status === "idle") {
    return (
      <View style={styles.idleRow}>
        <Pressable style={styles.idleButton} onPress={() => call.startCall("voice")}>
          <Text style={styles.idleButtonText}>🎙️ Voice call</Text>
        </Pressable>
        <Pressable style={styles.idleButton} onPress={() => call.startCall("video")}>
          <Text style={styles.idleButtonText}>🎥 Video call</Text>
        </Pressable>
      </View>
    );
  }

  if (call.state.status === "incoming") {
    return (
      <View style={styles.incomingBox}>
        <Text style={styles.incomingText}>
          Incoming {call.state.kind} call from {peerName}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.acceptButton} onPress={call.acceptCall}>
            <Text style={styles.buttonTextWhite}>Accept</Text>
          </Pressable>
          <Pressable style={styles.declineButton} onPress={call.declineCall}>
            <Text style={styles.buttonTextWhite}>Decline</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isVideo = call.state.kind === "video";

  return (
    <View style={styles.activeBox}>
      <View style={styles.activeHeader}>
        <Text style={styles.activeHeaderText}>
          {call.state.status === "calling" ? `Calling ${peerName}…` : `In ${call.state.kind} call with ${peerName}`}
        </Text>
        <Pressable style={styles.hangupButton} onPress={call.endCall}>
          <Text style={styles.buttonTextWhite}>Hang up</Text>
        </Pressable>
      </View>

      {isVideo ? (
        <View style={styles.videoArea}>
          {call.remoteStream && (
            <RTCView streamURL={call.remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
          )}
          {call.localStream && (
            <RTCView streamURL={call.localStream.toURL()} style={styles.localVideo} objectFit="cover" mirror zOrder={1} />
          )}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Pressable style={styles.controlButton} onPress={toggleMute}>
          <Text style={styles.chipText}>{muted ? "Unmute" : "Mute"}</Text>
        </Pressable>
        {isVideo && (
          <Pressable style={styles.controlButton} onPress={toggleCamera}>
            <Text style={styles.chipText}>{cameraOff ? "Camera on" : "Camera off"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idleRow: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 10, padding: 10 },
  idleButton: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  idleButtonText: { color: colors.text, fontSize: 13 },
  incomingBox: { borderWidth: 1, borderColor: "#3730a3", backgroundColor: "#1e1b4b", borderRadius: 10, padding: 12, gap: 8 },
  incomingText: { color: "#c7d2fe", fontSize: 13 },
  acceptButton: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  declineButton: { backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  buttonTextWhite: { color: "white", fontSize: 13, fontWeight: "600" },
  activeBox: { backgroundColor: "black", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  activeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeHeaderText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  hangupButton: { backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  videoArea: { aspectRatio: 16 / 9, borderRadius: 8, overflow: "hidden", backgroundColor: colors.surfaceAlt, marginTop: 8 },
  localVideo: { position: "absolute", bottom: 8, right: 8, width: 96, height: 128, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  controlButton: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  chipText: { color: colors.text, fontSize: 13 },
});
