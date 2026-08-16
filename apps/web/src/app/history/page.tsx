"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { friendRoomId, type MatchHistoryEntry } from "@stranger-bridge/shared";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryContent />
    </AppShell>
  );
}

function HistoryContent() {
  const { user } = useAuth();
  const router = useRouter();
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
    const roomId = friendRoomId(user.id, peerId);
    const params = new URLSearchParams({ kind: "friend", peerId, peerName });
    router.push(`/chat/${roomId}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Your chat history</h1>
      {notice && <p className="rounded-md bg-indigo-950 px-3 py-2 text-sm text-indigo-200">{notice}</p>}

      {entries === null && <p className="text-slate-400">Loading…</p>}
      {entries?.length === 0 && (
        <p className="text-slate-400">No conversations yet — head to the Lobby to meet someone new.</p>
      )}

      <div className="space-y-2">
        {entries?.map((entry) => (
          <div
            key={entry.matchSessionId}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3"
          >
            <div>
              <p className="font-medium text-white">
                {entry.peer.displayName} {entry.isFriend && <span className="text-xs text-emerald-400">· friend</span>}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(entry.startedAt).toLocaleString()}
                {entry.endedReason ? ` · ended (${entry.endedReason.toLowerCase()})` : " · ongoing"}
              </p>
              {entry.lastMessagePreview && (
                <p className="mt-1 truncate text-sm text-slate-400">{entry.lastMessagePreview}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {entry.isFriend ? (
                <button
                  onClick={() => chatAgain(entry.peer.id, entry.peer.displayName)}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                >
                  Chat again
                </button>
              ) : (
                <button
                  onClick={() => addFriend(entry.peer.id)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  + Add friend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
