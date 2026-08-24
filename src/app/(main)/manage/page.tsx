import { AuthGuard } from "@/components/auth-guard";
import { ModeratorNav } from "@/components/moderator-nav";
import { WeekManagement } from "@/components/week-management";

export const dynamic = "force-dynamic";

export default function ManagePage() {
  return (
    <AuthGuard>
      <ModeratorNav />

      <main className="p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

          <h1 className="font-bold text-3xl">Manage Week</h1>

          <p className="mt-2 text-muted-foreground">Manage the current Weekly Spotlight and voting status.</p>
        </div>

        <WeekManagement />
      </main>
    </AuthGuard>
  );
}
