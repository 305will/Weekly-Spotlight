"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatus } from "@/components/auth-status";

export function ModeratorNav() {
  const pathname = usePathname();

  const links = [
    { href: "/submissions", label: "Submissions" },
    { href: "/results", label: "Results" },
    { href: "/archive", label: "Archive" },
    {
      href: "/manage-submissions",
      label: "Manage Submissions",
    },
    { href: "/manage", label: "Manage Week" },
  ];

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-muted-foreground text-sm">Weekly Spotlight</p>

            <p className="font-semibold">Moderator Portal</p>
          </div>

          <nav className="flex items-center gap-2">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 font-medium text-sm ${
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <AuthStatus />
      </div>
    </header>
  );
}
