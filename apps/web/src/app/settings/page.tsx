"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Gender, PublicUser } from "@stranger-bridge/shared";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { apiClient } from "@/lib/apiClient";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [gender, setGender] = useState<Gender | "">(user?.gender ?? "");
  const [region, setRegion] = useState(user?.region ?? "");
  const [interests, setInterests] = useState(user?.interests.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blocked, setBlocked] = useState<PublicUser[] | null>(null);

  useEffect(() => {
    apiClient.listBlocks().then(setBlocked);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.updateProfile({
        displayName,
        gender: gender || undefined,
        region: region.trim() || undefined,
        interests: interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean)
          .slice(0, 10),
      });
      await refreshUser();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function unblock(userId: string) {
    await apiClient.unblockUser(userId);
    setBlocked((prev) => prev?.filter((u) => u.id !== userId) ?? null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Prefer not to say</option>
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
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Interests (comma-separated)</label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="ml-3 text-sm text-emerald-400">Saved</span>}
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Blocked users</h2>
        {blocked?.length === 0 && <p className="text-sm text-slate-500">You haven&apos;t blocked anyone.</p>}
        {blocked?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <span className="text-white">{u.displayName}</span>
            <button onClick={() => unblock(u.id)} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
              Unblock
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
