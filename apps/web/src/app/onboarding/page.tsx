"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, MIN_AGE_YEARS, type Gender } from "@stranger-bridge/shared";
import { useAuth } from "@/lib/useAuth";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function OnboardingPage() {
  const { completeOnboarding, user } = useAuth();
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [region, setRegion] = useState("");
  const [interests, setInterests] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user?.tosAcceptedAt) {
    router.replace("/lobby");
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tosAccepted) {
      setError("You must accept the Terms of Service to continue");
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding({
        birthDate,
        tosAccepted: true,
        gender: gender || undefined,
        region: region.trim() || undefined,
        interests: interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean)
          .slice(0, 10),
      });
      router.replace("/lobby");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Just a few things first</h1>
          <p className="mt-1 text-sm text-slate-400">
            You must be {MIN_AGE_YEARS}+ to use Stranger Bridge.
          </p>
        </div>
        {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Date of birth</label>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Gender (optional)</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">Prefer not to say</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Region (optional)</label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Europe, US-West, India"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Interests (optional, comma-separated)</label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="music, hiking, movies"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            className="mt-1"
          />
          I confirm I meet the age requirement and accept the Terms of Service. This
          platform connects you with strangers — be respectful, and report or block
          anyone who makes you uncomfortable.
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
