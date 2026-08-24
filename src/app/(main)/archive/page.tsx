"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { AuthGuard } from "@/components/auth-guard";
import { ModeratorNav } from "@/components/moderator-nav";
import { supabase } from "@/lib/supabase";

type ArchiveWeek = {
  week_number: number;
  title: string | null;
  winner_name: string | null;
  winner_votes: number;
};

export default function ArchivePage() {
  const [weeks, setWeeks] = useState<ArchiveWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadArchive = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.rpc("get_archive_summary");

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setWeeks(data ?? []);
      setLoading(false);
    };

    void loadArchive();
  }, []);

  return (
    <AuthGuard>
      <ModeratorNav />

      <main className="p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

          <h1 className="font-bold text-3xl">Archive</h1>

          <p className="mt-2 text-muted-foreground">Browse previous Weekly Spotlight winners and results.</p>
        </div>

        {loading && (
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground">Loading archive...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border p-6">
            <p className="text-red-500">Error loading archive: {error}</p>
          </div>
        )}

        {!loading && !error && weeks.length === 0 && (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">No previous Weekly Spotlights have been archived yet.</p>
          </div>
        )}

        {!loading && !error && weeks.length > 0 && (
          <div className="space-y-4">
            {weeks.map((week) => (
              <div
                key={week.week_number}
                className="flex flex-col justify-between gap-4 rounded-lg border p-5 shadow-sm sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-muted-foreground text-sm">Week {week.week_number}</p>

                  <h2 className="mt-1 font-semibold text-xl">
                    {week.title ?? `Weekly Spotlight - Week ${week.week_number}`}
                  </h2>

                  <div className="mt-3">
                    <p className="text-muted-foreground text-sm">Winner</p>

                    <p className="font-medium">{week.winner_name ?? "No winner recorded"}</p>

                    {week.winner_name && (
                      <p className="text-muted-foreground text-sm">
                        {week.winner_votes} {Number(week.winner_votes) === 1 ? "vote" : "votes"}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href={`/results/${week.week_number}`}
                  className="rounded-md border px-4 py-2 text-center font-medium text-sm"
                >
                  View Results
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
