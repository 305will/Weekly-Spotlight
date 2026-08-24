"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const signIn = () => {
    router.push("/");
  };

  if (!user) {
    return (
      <button type="button" onClick={signIn} className="rounded-md border px-4 py-2 font-medium text-sm">
        Sign In
      </button>
    );
  }

  const displayName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Discord User";

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-sm">
        Signed in as <span className="font-medium text-foreground">{displayName}</span>
      </span>

      <button type="button" onClick={signOut} className="rounded-md border px-4 py-2 font-medium text-sm">
        Sign Out
      </button>
    </div>
  );
}
