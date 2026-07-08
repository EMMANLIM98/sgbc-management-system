import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Church OS" }] }),
  component: SettingsLayout,
});

const items = [
  { to: "/settings/organization", label: "Organization" },
  { to: "/settings/churches", label: "Churches" },
  { to: "/settings/team", label: "Team" },
  { to: "/settings/profile", label: "Profile" },
];

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-4">Manage your organization, churches, team, and profile.</p>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-0.5">
          {items.map((i) => (
            <Link key={i.to} to={i.to as any}
              className={cn(
                "block rounded-md px-2 py-1.5 text-[13px]",
                path === i.to ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}>{i.label}</Link>
          ))}
        </nav>
        <div className="flex-1 min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
