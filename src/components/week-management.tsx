"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type Week = {
  id: number;
  week_number: number;
  title: string | null;
  is_current: boolean;
  voting_open: boolean;
  created_at: string;
};

export function WeekManagement() {
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [newWeekNumber, setNewWeekNumber] = useState("");

  const [newWeekTitle, setNewWeekTitle] = useState("");

  const loadCurrentWeek = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("weeks")
      .select("id, week_number, title, is_current, voting_open, created_at")
      .eq("is_current", true)
      .single();

    if (error || !data) {
      setCurrentWeek(null);

      setMessage(`Could not load current week: ${error?.message ?? "No current week found"}`);

      setLoading(false);
      return;
    }

    setCurrentWeek(data);

    const nextWeekNumber = data.week_number + 1;

    setNewWeekNumber(String(nextWeekNumber));

    setNewWeekTitle(`Weekly Spotlight - Week ${nextWeekNumber}`);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCurrentWeek();
  }, [loadCurrentWeek]);

  const setVoting = async (open: boolean) => {
    if (!currentWeek) {
      return;
    }

    const actionText = open ? "open voting" : "close voting";

    const confirmed = window.confirm(`Are you sure you want to ${actionText} for Week ${currentWeek.week_number}?`);

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("weeks")
      .update({
        voting_open: open,
      })
      .eq("id", currentWeek.id);

    if (error) {
      setMessage(`Could not update voting status: ${error.message}`);

      setSaving(false);
      return;
    }

    setMessage(
      open
        ? `Voting is now open for Week ${currentWeek.week_number}.`
        : `Voting is now closed for Week ${currentWeek.week_number}.`,
    );

    setSaving(false);

    await loadCurrentWeek();
  };

  const startNewWeek = async () => {
    if (!currentWeek) {
      return;
    }

    const parsedWeekNumber = Number(newWeekNumber);

    if (!Number.isInteger(parsedWeekNumber) || parsedWeekNumber < 1) {
      setMessage("Please enter a valid week number greater than 0.");

      return;
    }

    const title = newWeekTitle.trim() || `Weekly Spotlight - Week ${parsedWeekNumber}`;

    const confirmed = window.confirm(
      `Start Week ${parsedWeekNumber}?\n\nThis will close Week ${currentWeek.week_number}, mark it as no longer current, and open Week ${parsedWeekNumber}.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase.rpc("start_new_week", {
      target_week_number: parsedWeekNumber,
      target_title: title,
    });

    if (error) {
      setMessage(`Could not start new week: ${error.message}`);

      setSaving(false);
      return;
    }

    setMessage(`Week ${parsedWeekNumber} started successfully.`);

    setSaving(false);

    console.log("New week created:", data);

    await loadCurrentWeek();
  };

  if (loading) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-muted-foreground text-sm">Loading current week...</p>
      </div>
    );
  }

  if (!currentWeek) {
    return (
      <div className="rounded-xl border p-6">
        <p className="font-medium">No current week found</p>

        {message && <p className="mt-2 text-muted-foreground text-sm">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="font-medium text-muted-foreground text-sm">Current Weekly Spotlight</p>

            <h2 className="mt-1 font-bold text-2xl">{currentWeek.title ?? `Week ${currentWeek.week_number}`}</h2>

            <p className="mt-2 text-muted-foreground text-sm">Week {currentWeek.week_number}</p>
          </div>

          <span className="w-fit rounded-full border px-3 py-1 font-medium text-sm">
            {currentWeek.voting_open ? "Voting Open" : "Voting Closed"}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {currentWeek.voting_open ? (
            <button
              className="rounded-md border px-4 py-2 font-medium text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              onClick={() => setVoting(false)}
              type="button"
            >
              {saving ? "Updating..." : "Close Voting"}
            </button>
          ) : (
            <button
              className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              onClick={() => setVoting(true)}
              type="button"
            >
              {saving ? "Updating..." : "Open Voting"}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border p-6">
        <div>
          <h2 className="font-semibold text-xl">Start New Week</h2>

          <p className="mt-1 text-muted-foreground text-sm">
            Starting a new week will automatically close the current week and make the new week the active Weekly
            Spotlight.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="new-week-number">
              Week Number
            </label>

            <input
              className="w-full rounded-md border bg-background px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              id="new-week-number"
              min="1"
              onChange={(event) => {
                const value = event.target.value;

                setNewWeekNumber(value);

                if (value) {
                  setNewWeekTitle(`Weekly Spotlight - Week ${value}`);
                } else {
                  setNewWeekTitle("");
                }
              }}
              placeholder="6"
              type="number"
              value={newWeekNumber}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-sm" htmlFor="new-week-title">
              Week Title
            </label>

            <input
              className="w-full rounded-md border bg-background px-3 py-2 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              id="new-week-title"
              onChange={(event) => setNewWeekTitle(event.target.value)}
              placeholder="Weekly Spotlight - Week 6"
              type="text"
              value={newWeekTitle}
            />
          </div>

          <button
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || !newWeekNumber.trim()}
            onClick={startNewWeek}
            type="button"
          >
            {saving ? "Starting..." : "Start New Week"}
          </button>
        </div>
      </section>

      {message && (
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
