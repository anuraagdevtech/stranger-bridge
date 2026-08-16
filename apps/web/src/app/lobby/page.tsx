"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Gender, MatchFoundPayload } from "@stranger-bridge/shared";
import { AppShell } from "@/components/AppShell";
import { getSocket } from "@/lib/socket";

type Status = "idle" | "searching" | "error";

export default function LobbyPage() {
  return (
    <AppShell>
      <LobbyContent />
    </AppShell>
  );
}

function LobbyContent() {
  const router = useRouter();
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
      const params = new URLSearchParams({
        kind: "match",
        peerId: payload.peer.id,
        peerName: payload.peer.displayName,
        matchSessionId: payload.matchSessionId,
      });
      router.push(`/chat/${payload.roomId}?${params.toString()}`);
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
  }, [router]);

  function findMatch() {
    setErrorMessage(null);
    const socket = getSocket();
    socket.emit("matchmaking:find", {
      interests: interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Find a stranger to talk to</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set optional filters, then start a text, voice, or video chat with a
          random match.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Shared interests (comma-separated)</label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="music, gaming, travel"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Match gender</label>
            <select
              value={genderPreference}
              onChange={(e) => setGenderPreference(e.target.value as Gender | "any")}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="any">Anyone</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Region</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Any"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{errorMessage}</p>
      )}

      {status === "searching" ? (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-800 bg-indigo-950/40 p-4">
          <span className="h-2 w-2 animate-ping rounded-full bg-indigo-400" />
          <p className="text-sm text-indigo-200">Looking for someone to match you with…</p>
          <button
            onClick={cancelSearch}
            className="ml-auto rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={findMatch}
          className="w-full rounded-md bg-indigo-600 px-4 py-3 text-lg font-medium text-white hover:bg-indigo-500"
        >
          Start matching
        </button>
      )}
    </div>
  );
}
