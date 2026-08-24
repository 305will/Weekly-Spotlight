"use client";

import { useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type Submission = {
  id: number;
  team_name: string;
  creator_name: string;
  discord_url: string;
  week_number: number;
};

type Props = {
  submissions: Submission[];
  weekNumber: number;
  votingOpen: boolean;
};

export function SubmissionVoting({ submissions, weekNumber, votingOpen }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);

  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadVote = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        return;
      }

      const { data, error } = await supabase
        .from("votes")
        .select("submission_id")
        .eq("voter_id", currentUser.id)
        .eq("week_number", weekNumber)
        .maybeSingle();

      if (error) {
        console.error("Could not load vote:", error.message);
        return;
      }

      if (data) {
        setSelectedSubmissionId(data.submission_id);
      }
    };

    void loadVote();
  }, [weekNumber]);

  const castVote = async (submission: Submission) => {
    if (!user || !votingOpen) {
      return;
    }

    setSavingId(submission.id);
    setMessage("");

    const { error } = await supabase.from("votes").upsert(
      {
        submission_id: submission.id,
        voter_id: user.id,
        week_number: weekNumber,
      },
      {
        onConflict: "voter_id,week_number",
      },
    );

    if (error) {
      setMessage(`Could not save vote: ${error.message}`);
      setSavingId(null);
      return;
    }

    setSelectedSubmissionId(submission.id);
    setSavingId(null);
    setMessage("Your vote has been saved.");
  };

  return (
    <div>
      {!votingOpen && (
        <div className="mb-6 rounded-lg border p-4">
          <p className="font-medium">Voting is closed.</p>

          <p className="mt-1 text-muted-foreground text-sm">Votes can no longer be changed for Week {weekNumber}.</p>
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-lg border p-4">
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="space-y-4">
        {submissions.map((submission) => {
          const selected = selectedSubmissionId === submission.id;

          const saving = savingId === submission.id;

          return (
            <div
              key={submission.id}
              className={`rounded-lg border p-5 shadow-sm ${selected ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-xl">{submission.team_name}</h2>

                  <p className="mt-1 text-muted-foreground">Submitted by {submission.creator_name}</p>

                  <p className="mt-1 text-sm">Week {submission.week_number}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={submission.discord_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border px-4 py-2 font-medium text-sm"
                  >
                    View Discord Submission
                  </a>

                  <button
                    type="button"
                    disabled={!votingOpen || saving}
                    onClick={() => castVote(submission)}
                    className={`rounded-md px-4 py-2 font-medium text-sm ${
                      selected ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {saving ? "Saving..." : selected ? "Your Vote ✓" : votingOpen ? "Vote" : "Voting Closed"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
