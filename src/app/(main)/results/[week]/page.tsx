"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { AuthGuard } from "@/components/auth-guard";
import { ModeratorNav } from "@/components/moderator-nav";
import { supabase } from "@/lib/supabase";

type Result = {
  submission_id: number;
  team_name: string;
  creator_name: string;
  vote_count: number;
};

export default function ArchivedResultsPage() {
  const params = useParams();
  const weekNumber = Number(params.week);

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      if (!weekNumber || Number.isNaN(weekNumber)) {
        setError("Invalid week.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_week_results", {
        target_week: weekNumber,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setResults(data ?? []);
      setLoading(false);
    };

    void loadResults();
  }, [weekNumber]);

  const highestVoteCount = results.length > 0 ? Number(results[0].vote_count) : 0;

  const winners = results.filter((result) => Number(result.vote_count) === highestVoteCount && highestVoteCount > 0);

  return (
    <AuthGuard>
      <ModeratorNav />

      <main className="p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

          <h1 className="font-bold text-3xl">Week {weekNumber} Results</h1>

          <p className="mt-2 text-muted-foreground">Final results for this archived Weekly Spotlight.</p>
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

        {!loading && !error && results.length === 0 && (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">No results are available for this week.</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
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
