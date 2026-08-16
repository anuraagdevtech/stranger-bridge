"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallKind, WebRtcSignal } from "@stranger-bridge/shared";
import { getSocket } from "./socket";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
// MVP note: no TURN server is configured, so calls between peers on
// restrictive/symmetric NATs may fail to connect directly. See README.

export type CallState =
  | { status: "idle" }
  | { status: "calling"; kind: CallKind }
  | { status: "incoming"; kind: CallKind }
  | { status: "connected"; kind: CallKind };

function offerHasVideo(data: unknown): boolean {
  const sdp = (data as RTCSessionDescriptionInit | undefined)?.sdp ?? "";
  return sdp.includes("m=video");
}

/** Manages a single 1:1 WebRTC call within `roomId`, signaled over the shared socket. */
export function useWebRtc(roomId: string, peerId: string, selfId: string | undefined) {
  const [state, setState] = useState<CallState>({ status: "idle" });
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  // Mirrors `localStream` for cleanup(): a ref keeps cleanup's identity
  // stable across renders, so it can safely run only on unmount (see below)
  // instead of re-firing every time a call starts/stops.
  const localStreamRef = useRef<MediaStream | null>(null);

  const setLocalStreamBoth = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setLocalStreamBoth(null);
    setRemoteStream(null);
    pendingOfferRef.current = null;
    setState({ status: "idle" });
  }, [setLocalStreamBoth]);

  const createPeerConnection = useCallback(() => {
    const socket = getSocket();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate && selfId) {
        const signal: WebRtcSignal = {
          roomId,
          toUserId: peerId,
          fromUserId: selfId,
          data: e.candidate.toJSON(),
        };
        socket.emit("call:ice-candidate", signal);
      }
    };
    pc.ontrack = (e) => {
      setRemoteStream((prev) => {
        const stream = prev ?? new MediaStream();
        stream.addTrack(e.track);
        return stream;
      });
    };
    pcRef.current = pc;
    return pc;
  }, [roomId, peerId, selfId]);

  const startCall = useCallback(
    async (kind: CallKind) => {
      if (!selfId) return;
      const socket = getSocket();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "video",
      });
      setLocalStreamBoth(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:offer", { roomId, toUserId: peerId, fromUserId: selfId, data: offer });
      setState({ status: "calling", kind });
    },
    [roomId, peerId, selfId, createPeerConnection, setLocalStreamBoth],
  );

  const acceptCall = useCallback(async () => {
    if (!selfId || state.status !== "incoming" || !pendingOfferRef.current) return;
    const kind = state.kind;
    const socket = getSocket();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video",
    });
    setLocalStreamBoth(stream);
    const pc = createPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    await pc.setRemoteDescription(pendingOfferRef.current);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("call:answer", { roomId, toUserId: peerId, fromUserId: selfId, data: answer });
    pendingOfferRef.current = null;
    setState({ status: "connected", kind });
  }, [roomId, peerId, selfId, state, createPeerConnection, setLocalStreamBoth]);

  const declineCall = useCallback(() => {
    pendingOfferRef.current = null;
    setState({ status: "idle" });
  }, []);

  const endCall = useCallback(() => {
    if (selfId) {
      getSocket().emit("call:end", { roomId, toUserId: peerId });
    }
    cleanup();
  }, [roomId, peerId, selfId, cleanup]);

  useEffect(() => {
    const socket = getSocket();

    const onOffer = (signal: WebRtcSignal) => {
      if (signal.roomId !== roomId) return;
      pendingOfferRef.current = signal.data as RTCSessionDescriptionInit;
      setState({ status: "incoming", kind: offerHasVideo(signal.data) ? "video" : "voice" });
    };
    const onAnswer = async (signal: WebRtcSignal) => {
      if (signal.roomId !== roomId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(signal.data as RTCSessionDescriptionInit);
      setState((s) => (s.status === "calling" ? { status: "connected", kind: s.kind } : s));
    };
    const onIceCandidate = async (signal: WebRtcSignal) => {
      if (signal.roomId !== roomId || !pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(signal.data as RTCIceCandidateInit);
      } catch {
        // benign: candidate arrived before remote description was set
      }
    };
    const onCallEnd = (payload: { roomId: string }) => {
      if (payload.roomId !== roomId) return;
      cleanup();
    };

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:end", onCallEnd);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:end", onCallEnd);
    };
  }, [roomId, cleanup]);

  // Hang up automatically if the chat/call screen unmounts mid-call.
  useEffect(() => () => cleanup(), [cleanup]);

  return { state, remoteStream, localStream, startCall, acceptCall, declineCall, endCall };
}
