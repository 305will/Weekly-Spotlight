"use client";

import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { ModeratorNav } from "@/components/moderator-nav";
import { supabase } from "@/lib/supabase";

type Week = {
  week_number: number;
  title: string | null;
  voting_open: boolean;
};

type Result = {
  submission_id: number;
  team_name: string;
  creator_name: string;
  vote_count: number;
};

export default function ResultsPage() {
  const [week, setWeek] = useState<Week | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      setError("");

      const { data: currentWeek, error: weekError } = await supabase
        .from("weeks")
        .select("week_number, title, voting_open")
        .eq("is_current", true)
        .single();

      if (weekError || !currentWeek) {
        setError("No current Weekly Spotlight was found.");
        setLoading(false);
        return;
      }

      setWeek(currentWeek);

      if (currentWeek.voting_open) {
        setLoading(false);
        return;
      }

      const { data, error: resultsError } = await supabase.rpc("get_week_results", {
        target_week: currentWeek.week_number,
      });

      if (resultsError) {
        setError(resultsError.message);
        setLoading(false);
        return;
      }

      setResults(data ?? []);
      setLoading(false);
    };

    void loadResults();
  }, []);

  const highestVoteCount = results.length > 0 ? Number(results[0].vote_count) : 0;

  const winners = results.filter((result) => Number(result.vote_count) === highestVoteCount && highestVoteCount > 0);

  return (
    <AuthGuard>
      <ModeratorNav />

      <main className="p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

          <h1 className="font-bold text-3xl">Results</h1>

          {week && <p className="mt-2 text-muted-foreground">{week.title ?? `Week ${week.week_number}`}</p>}
        </div>

        {loading && (
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border p-6">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && week?.voting_open && (
          <div className="rounded-lg border p-8 text-center">
            <h2 className="font-semibold text-xl">Results are hidden</h2>

            <p className="mt-2 text-muted-foreground">
              Voting is still open for Week {week.week_number}. Results will become available after voting closes.
            </p>
          </div>
        )}

        {!loading && !error && week && !week.voting_open && results.length === 0 && (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">No results are available for this week.</p>
          </div>
        )}

        {!loading && !error && week && !week.voting_open && results.length > 0 && (
          <>
            <div className="mb-8 rounded-xl border p-6">
              <p className="font-medium text-muted-foreground text-sm">
                {winners.length > 1 ? "Tied for First" : "Weekly Spotlight Winner"}
              </p>

              <h2 className="mt-2 font-bold text-2xl">{winners.map((winner) => winner.team_name).join(" & ")}</h2>

              <p className="mt-1 text-muted-foreground">
                {highestVoteCount} {highestVoteCount === 1 ? "vote" : "votes"}
              </p>
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={result.submission_id} className="flex items-center justify-between rounded-lg border p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border font-semibold">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="font-semibold">{result.team_name}</h3>

                      <p className="text-muted-foreground text-sm">Submitted by {result.creator_name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-xl">{result.vote_count}</p>

                    <p className="text-muted-foreground text-xs">
                      {Number(result.vote_count) === 1 ? "vote" : "votes"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </AuthGuard>
  );
}
