"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { friendRoomId, type Friendship } from "@stranger-bridge/shared";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";

export default function FriendsPage() {
  return (
    <AppShell>
      <FriendsContent />
    </AppShell>
  );
}

function FriendsContent() {
  const { user } = useAuth();
  const router = useRouter();
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
    const roomId = friendRoomId(user!.id, peerId);
    const params = new URLSearchParams({ kind: "friend", peerId, peerName });
    router.push(`/chat/${roomId}?${params.toString()}`);
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
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Friends</h1>

      {received.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Friend requests</h2>
          {received.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <span className="text-white">{peerOf(f).displayName}</span>
              <div className="flex gap-2">
                <button onClick={() => respond(f.id, "accept")} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500">
                  Accept
                </button>
                <button onClick={() => respond(f.id, "decline")} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Your friends</h2>
        {accepted.length === 0 && <p className="text-sm text-slate-500">No friends yet — add someone from your chat history.</p>}
        {accepted.map((f) => {
          const peer = peerOf(f);
          return (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <span className="text-white">{peer.displayName}</span>
              <div className="flex gap-2">
                <button onClick={() => openChat(peer.id, peer.displayName)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500">
                  Chat / Call
                </button>
                <button onClick={() => remove(f.id)} className="rounded-md border border-red-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950">
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {sent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Requests sent</h2>
          {sent.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <span className="text-slate-300">{peerOf(f).displayName}</span>
              <button onClick={() => remove(f.id)} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
