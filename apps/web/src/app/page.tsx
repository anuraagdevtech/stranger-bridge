"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.tosAcceptedAt) {
      router.replace("/onboarding");
    } else {
      router.replace("/lobby");
    }
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      Loading…
    </div>
  );
}
