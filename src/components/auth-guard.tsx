"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setUser(user);

      const discordUserId =
        user.user_metadata.provider_id ?? user.user_metadata.sub ?? user.identities?.[0]?.identity_data?.sub;

      if (!discordUserId) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: moderator, error } = await supabase
        .from("moderators")
        .select("id, active")
        .eq("discord_user_id", discordUserId)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        console.error("Moderator check failed:", error.message);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(!!moderator);
      setLoading(false);
    };

    void checkAccess();
  }, [router]);

  if (loading) {
    return <div className="p-6">Checking moderator access...</div>;
  }

  if (!user) {
    return null;
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border p-8 text-center">
          <h1 className="font-bold text-2xl">Access Denied</h1>

          <p className="mt-3 text-muted-foreground">
            Your Discord account is not authorized to access the Weekly Spotlight moderator portal.
          </p>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/");
            }}
            className="mt-6 rounded-md border px-4 py-2"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
