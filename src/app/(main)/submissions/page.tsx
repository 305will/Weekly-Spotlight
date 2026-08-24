import { AuthGuard } from "@/components/auth-guard";
import { ModeratorNav } from "@/components/moderator-nav";
import { SubmissionVoting } from "@/components/submission-voting";
import { supabase } from "@/lib/supabase";

export default async function SubmissionsPage() {
  const { data: currentWeek, error: weekError } = await supabase
    .from("weeks")
    .select("*")
    .eq("is_current", true)
    .single();

  if (weekError || !currentWeek) {
    return (
      <AuthGuard>
        <ModeratorNav />

        <main className="p-6">
          <h1 className="font-bold text-3xl">Submitted Teams</h1>

          <div className="mt-8 rounded-lg border p-6">
            <p>No active Weekly Spotlight was found.</p>
          </div>
        </main>
      </AuthGuard>
    );
  }

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("week_number", currentWeek.week_number)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <AuthGuard>
      <ModeratorNav />

      <main className="p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

          <h1 className="font-bold text-3xl">{currentWeek.title ?? `Week ${currentWeek.week_number}`}</h1>

          <p className="mt-2 text-muted-foreground">Review this week&apos;s submissions and cast your vote.</p>

          <div className="mt-3">
            <span className="rounded-full border px-3 py-1 font-medium text-xs">
              {currentWeek.voting_open ? "Voting Open" : "Voting Closed"}
            </span>
          </div>
        </div>

        {error ? (
          <p className="text-red-500">Error loading submissions: {error.message}</p>
        ) : submissions && submissions.length > 0 ? (
          <SubmissionVoting
            submissions={submissions}
            weekNumber={currentWeek.week_number}
            votingOpen={currentWeek.voting_open}
          />
        ) : (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-muted-foreground">No submissions have been added for this week yet.</p>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
