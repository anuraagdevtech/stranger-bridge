"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@stranger-bridge/shared";

interface ChatPanelProps {
  messages: ChatMessage[];
  selfId: string;
  disabled: boolean;
  disabledReason?: string;
  onSend: (body: string) => void;
}

export function ChatPanel({ messages, selfId, disabled, disabledReason, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || disabled) return;
    onSend(body);
    setDraft("");
  }

  return (
    <div className="flex h-[50vh] flex-col rounded-lg border border-slate-800">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-500">Say hi 👋</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === selfId ? "justify-end" : "justify-start"}`}>
            <span
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.senderId === selfId ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-100"
              }`}
            >
              {m.body}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-slate-800 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? disabledReason ?? "Chat ended" : "Type a message…"}
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
