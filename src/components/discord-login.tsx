"use client";

import { supabase } from "@/lib/supabase";

export function DiscordLogin() {
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/submissions`,
      },
    });

    if (error) {
      console.error("Discord login error:", error.message);
    }
  };

  return (
    <button type="button" onClick={handleLogin} className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white">
      Continue with Discord
    </button>
  );
}
