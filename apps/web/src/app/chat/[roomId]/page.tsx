"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ApiError, type ChatMessage, type ReportInput } from "@stranger-bridge/shared";
import { AppShell } from "@/components/AppShell";
import { ChatPanel } from "@/components/ChatPanel";
import { CallPanel } from "@/components/CallPanel";
import { useAuth } from "@/lib/useAuth";
import { useWebRtc } from "@/lib/useWebRtc";
import { getSocket } from "@/lib/socket";
import { apiClient } from "@/lib/apiClient";

export default function ChatPage() {
  return (
    <AppShell>
      <ChatPageContent />
    </AppShell>
  );
}

const REPORT_REASONS: { value: ReportInput["reason"]; label: string }[] = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "explicit_content", label: "Explicit content" },
  { value: "spam", label: "Spam" },
  { value: "underage", label: "Appears underage" },
  { value: "other", label: "Other" },
];

function ChatPageContent() {
  const { user } = useAuth();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId;
  const kind = searchParams.get("kind") === "friend" ? "friend" : "match";
  const peerId = searchParams.get("peerId") ?? "";
  const peerName = searchParams.get("peerName") ?? "Stranger";
  const matchSessionId = searchParams.get("matchSessionId") ?? undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ended, setEnded] = useState<string | null>(null);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<ReportInput["reason"]>("harassment");
  const [reportDetails, setReportDetails] = useState("");

  const call = useWebRtc(roomId, peerId, user?.id);

  useEffect(() => {
    const socket = getSocket();
    if (kind === "friend") {
      socket.emit("room:join", { roomId });
    }

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
    if (kind === "match" && !ended) {
      getSocket().emit("match:leave", { roomId });
    }
    router.push(kind === "match" ? "/lobby" : "/friends");
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{peerName}</h1>
          {kind === "match" && (
            <p className="text-xs text-slate-500">Randomly matched · this chat isn&apos;t saved unless you add each other as friends</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {kind === "match" && !friendRequestSent && (
            <button onClick={addFriend} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
              + Add friend
            </button>
          )}
          <button
            onClick={() => setShowReportForm((s) => !s)}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Report
          </button>
          <button onClick={blockUser} className="rounded-md border border-red-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950">
            Block
          </button>
          <button onClick={leaveChat} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
            {kind === "match" ? "Skip / Leave" : "Close"}
          </button>
        </div>
      </div>

      {notice && <p className="rounded-md bg-indigo-950 px-3 py-2 text-sm text-indigo-200">{notice}</p>}

      {showReportForm && (
        <div className="space-y-2 rounded-lg border border-red-900 bg-red-950/30 p-3">
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value as ReportInput["reason"])}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Additional details (optional)"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            rows={2}
          />
          <button onClick={submitReport} className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600">
            Submit report &amp; block
          </button>
        </div>
      )}

      {user && <CallPanel peerName={peerName} call={call} />}

      <ChatPanel
        messages={messages}
        selfId={user?.id ?? ""}
        disabled={Boolean(ended)}
        disabledReason={ended ? `Chat ended (${ended.toLowerCase()})` : undefined}
        onSend={sendMessage}
      />
    </div>
  );
}
