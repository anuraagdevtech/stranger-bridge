"use client";

import { useEffect, useRef, useState } from "react";
import type { CallState } from "@/lib/useWebRtc";

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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream;
  }, [call.localStream]);

  useEffect(() => {
    if (call.state.status !== "connected") return;
    if (call.state.kind === "video" && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = call.remoteStream;
    } else if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = call.remoteStream;
    }
  }, [call.remoteStream, call.state]);

  function toggleMute() {
    call.localStream?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  }

  function toggleCamera() {
    call.localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    setCameraOff((c) => !c);
  }

  if (call.state.status === "idle") {
    return (
      <div className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <button
          onClick={() => call.startCall("voice")}
          className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          🎙️ Voice call
        </button>
        <button
          onClick={() => call.startCall("video")}
          className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          🎥 Video call
        </button>
      </div>
    );
  }

  if (call.state.status === "incoming") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-indigo-800 bg-indigo-950/50 p-3">
        <p className="text-sm text-indigo-200">
          Incoming {call.state.kind} call from {peerName}
        </p>
        <div className="flex gap-2">
          <button
            onClick={call.acceptCall}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
          >
            Accept
          </button>
          <button
            onClick={call.declineCall}
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  const isVideo = call.state.kind === "video";

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-black p-3">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>
          {call.state.status === "calling" ? `Calling ${peerName}…` : `In ${call.state.kind} call with ${peerName}`}
        </span>
        <button onClick={call.endCall} className="rounded-md bg-red-700 px-3 py-1.5 text-white hover:bg-red-600">
          Hang up
        </button>
      </div>

      {isVideo ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-900">
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-2 right-2 h-24 w-32 rounded-md border border-slate-700 object-cover"
          />
        </div>
      ) : (
        <audio ref={remoteAudioRef} autoPlay />
      )}

      <div className="flex gap-2">
        <button
          onClick={toggleMute}
          className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        {isVideo && (
          <button
            onClick={toggleCamera}
            className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            {cameraOff ? "Turn camera on" : "Turn camera off"}
          </button>
        )}
      </div>
    </div>
  );
}
