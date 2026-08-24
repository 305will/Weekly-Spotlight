"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Submission = {
  id: number;
  team_name: string;
  creator_name: string;
  discord_url: string;
  week_number: number;
  status: string;
};

type SubmissionManagerProps = {
  submissions: Submission[];
  currentWeek: number;
  votingOpen: boolean;
};

function isValidDiscordMessageUrl(url: string) {
  try {
    const parsed = new URL(url);

    const validHost = parsed.hostname === "discord.com" || parsed.hostname === "www.discord.com";

    const parts = parsed.pathname.split("/").filter(Boolean);

    return (
      validHost &&
      parts.length === 4 &&
      parts[0] === "channels" &&
      Boolean(parts[1]) &&
      Boolean(parts[2]) &&
      Boolean(parts[3])
    );
  } catch {
    return false;
  }
}

export function SubmissionManager({ submissions, currentWeek, votingOpen }: SubmissionManagerProps) {
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setTeamName("");
    setCreatorName("");
    setDiscordUrl("");
    setEditingId(null);
    setMessage("");
  };

  const startEditing = (submission: Submission) => {
    if (!votingOpen) {
      return;
    }

    setEditingId(submission.id);
    setTeamName(submission.team_name);
    setCreatorName(submission.creator_name);
    setDiscordUrl(submission.discord_url);
    setMessage("");
  };

  const saveSubmission = async () => {
    if (!votingOpen) {
      setMessage("Submissions cannot be changed while voting is closed.");
      return;
    }

    const trimmedTeamName = teamName.trim();
    const trimmedCreatorName = creatorName.trim();
    const trimmedDiscordUrl = discordUrl.trim();

    if (!trimmedTeamName || !trimmedCreatorName || !trimmedDiscordUrl) {
      setMessage("Please complete all fields.");
      return;
    }

    if (!isValidDiscordMessageUrl(trimmedDiscordUrl)) {
      setMessage(
        "Please enter a valid Discord message URL in the format https://discord.com/channels/SERVER_ID/CHANNEL_ID/MESSAGE_ID",
      );
      return;
    }

    setSaving(true);
    setMessage("");

    if (editingId !== null) {
      const { error } = await supabase
        .from("submissions")
        .update({
          team_name: trimmedTeamName,
          creator_name: trimmedCreatorName,
          discord_url: trimmedDiscordUrl,
        })
        .eq("id", editingId);

      if (error) {
        setMessage(`Could not update submission: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Submission updated successfully.");
    } else {
      const { error } = await supabase.from("submissions").insert({
        team_name: trimmedTeamName,
        creator_name: trimmedCreatorName,
        discord_url: trimmedDiscordUrl,
        week_number: currentWeek,
        status: "active",
      });

      if (error) {
        setMessage(`Could not add submission: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Submission added successfully.");
    }

    setTeamName("");
    setCreatorName("");
    setDiscordUrl("");
    setEditingId(null);
    setSaving(false);

    router.refresh();
  };

  const removeSubmission = async (submission: Submission) => {
    if (!votingOpen) {
      setMessage("Submissions cannot be removed while voting is closed.");
      return;
    }

    const confirmed = window.confirm(`Remove "${submission.team_name}" from Week ${currentWeek}?`);

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase.from("submissions").delete().eq("id", submission.id).select("id");

    if (error) {
      setMessage(`Could not remove submission: ${error.message}`);
      setSaving(false);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Submission was not removed. Supabase did not allow the delete.");
      setSaving(false);
      return;
    }

    if (editingId === submission.id) {
      setTeamName("");
      setCreatorName("");
      setDiscordUrl("");
      setEditingId(null);
    }

    setMessage("Submission removed successfully.");
    setSaving(false);

    router.refresh();
  };

  let submitButtonText = "Add Submission";

  if (editingId !== null) {
    submitButtonText = "Save Changes";
  }

  if (saving) {
    submitButtonText = "Saving...";
  }

  return (
    <div className="space-y-8">
      {!votingOpen && (
        <div className="rounded-lg border p-4">
          <p className="font-medium">Submission management is locked.</p>

          <p className="mt-1 text-muted-foreground text-sm">
            Voting is closed for Week {currentWeek}. You can still view submissions, but they cannot be added, edited,
            or removed.
          </p>
        </div>
      )}

      <section className="rounded-xl border p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-xl">{editingId !== null ? "Edit Submission" : "Add Submission"}</h2>

            <p className="mt-1 text-muted-foreground text-sm">
              {editingId !== null
                ? "Update this submission's team, creator, or Discord message link."
                : `Manually add a submission to Week ${currentWeek}.`}
            </p>
          </div>

          {editingId !== null && (
            <button
              className="rounded-md border px-4 py-2 font-medium text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="team-name">
              Team Name
            </label>

            <input
              className="w-full rounded-md border bg-background px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!votingOpen || saving}
              id="team-name"
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              type="text"
              value={teamName}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="creator-name">
              Creator Name
            </label>

            <input
              className="w-full rounded-md border bg-background px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!votingOpen || saving}
              id="creator-name"
              onChange={(event) => setCreatorName(event.target.value)}
              placeholder="Discord username or creator name"
              type="text"
              value={creatorName}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="discord-url">
              Discord Message URL
            </label>

            <input
              className="w-full rounded-md border bg-background px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!votingOpen || saving}
              id="discord-url"
              onChange={(event) => setDiscordUrl(event.target.value)}
              placeholder="https://discord.com/channels/SERVER_ID/CHANNEL_ID/MESSAGE_ID"
              type="url"
              value={discordUrl}
            />
          </div>

          <button
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!votingOpen || saving}
            onClick={saveSubmission}
            type="button"
          >
            {submitButtonText}
          </button>

          {message && <p className="text-muted-foreground text-sm">{message}</p>}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-xl">Current Submissions</h2>

          <p className="mt-1 text-muted-foreground text-sm">
            {submissions.length} submission
            {submissions.length === 1 ? "" : "s"} for Week {currentWeek}.
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="font-medium">No submissions yet</p>

            <p className="mt-2 text-muted-foreground text-sm">
              Discord submissions will appear here automatically, or you can add one manually.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div className="rounded-xl border p-5" key={submission.id}>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-lg">{submission.team_name}</h3>

                      <span className="rounded-full border px-2 py-1 font-medium text-xs">{submission.status}</span>
                    </div>

                    <p className="mt-1 text-muted-foreground text-sm">Submitted by {submission.creator_name}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      className="rounded-md border px-3 py-2 font-medium text-sm"
                      href={submission.discord_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View
                    </a>

                    <button
                      className="rounded-md border px-3 py-2 font-medium text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!votingOpen || saving}
                      onClick={() => startEditing(submission)}
                      type="button"
                    >
                      Edit
                    </button>

                    <button
                      className="rounded-md border px-3 py-2 font-medium text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!votingOpen || saving}
                      onClick={() => removeSubmission(submission)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
