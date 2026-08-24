"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const continueWithDiscord = async () => {
    setLoading(true);
    setMessage("");

    // First check whether this browser already has a Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Already logged in
    if (session?.user) {
      router.push("/submissions");
      return;
    }

    // Not logged in — begin Discord OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/submissions`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setLoading(false);
      setMessage(`Discord login failed: ${error.message}`);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setLoading(false);
    setMessage("Unable to start Discord login.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border p-8 text-center shadow-sm">
        <h1 className="font-bold text-3xl">Weekly Spotlight</h1>

        <h2 className="mt-2 font-semibold text-xl">Moderator Portal</h2>

        <p className="mt-4 text-muted-foreground">
          Review TeamBuilder submissions and cast your vote for this week&apos;s spotlight.
        </p>

        <button
          type="button"
          onClick={continueWithDiscord}
          disabled={loading}
          className="mt-8 w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Loading..." : "Continue with Discord"}
        </button>

        {message && <p className="mt-4 text-red-500 text-sm">{message}</p>}
      </div>
    </main>
  );
}
