import { AuthGuard } from "@/components/auth-guard";
import { ModeratorNav } from "@/components/moderator-nav";
import { SubmissionManager } from "@/components/submission-manager";
import { supabase } from "@/lib/supabase";

export default async function ManageSubmissionsPage() {
  const { data: currentWeek, error: weekError } = await supabase
    .from("weeks")
    .select("week_number, title, voting_open")
    .eq("is_current", true)
    .single();

  if (weekError || !currentWeek) {
    return (
      <AuthGuard>
        <ModeratorNav />

        <main className="p-6">
          <div className="mb-8">
            <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

            <h1 className="font-bold text-3xl">Manage Submissions</h1>
          </div>

          <div className="rounded-lg border p-6">
            <p>No current Weekly Spotlight was found.</p>
          </div>
        </main>
      </AuthGuard>
    );
  }

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("week_number", currentWeek.week_number)
    .order("created_at", { ascending: false });

  return (
    <AuthGuard>
      <ModeratorNav />

      <main className="p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

          <h1 className="font-bold text-3xl">Manage Submissions</h1>

          <p className="mt-2 text-muted-foreground">
            Add and manage submissions for {currentWeek.title ?? `Week ${currentWeek.week_number}`}.
          </p>

          <div className="mt-3">
            <span className="rounded-full border px-3 py-1 font-medium text-xs">
              {currentWeek.voting_open ? "Voting Open" : "Voting Closed"}
            </span>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border p-6">
            <p className="text-red-500">Error loading submissions: {error.message}</p>
          </div>
        ) : (
          <SubmissionManager
            submissions={submissions ?? []}
            currentWeek={currentWeek.week_number}
            votingOpen={currentWeek.voting_open}
          />
        )}
      </main>
    </AuthGuard>
  );
}
