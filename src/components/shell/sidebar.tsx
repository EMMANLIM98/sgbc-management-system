import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wallet,
  GraduationCap,
  HeartHandshake,
  Sparkles,
  ClipboardList,
  Home as HomeIcon,
  MapPin,
  UserPlus,
  CalendarCheck2,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: any; soon?: boolean };
const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Membership", icon: Users },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/sunday-school", label: "Sunday School", icon: GraduationCap },
  { to: "/discipleship", label: "Discipleship", icon: HeartHandshake },
  { to: "/ministry", label: "Ministry", icon: Sparkles },
  { to: "/committee", label: "Committee", icon: ClipboardList },
  { to: "/visitation", label: "Visitation", icon: HomeIcon },
  { to: "/outreach", label: "Outreach", icon: MapPin },
  { to: "/visitors", label: "Visitors", icon: UserPlus },
  { to: "/events", label: "Events", icon: CalendarCheck2 },
  { to: "/inventory", label: "Inventory", icon: Package },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex md:w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="h-14 px-4 flex items-center border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-foreground text-background grid place-items-center text-[10px] font-semibold tabular">
            SGBC
          </div>
          <div className="text-sm font-semibold tracking-tight">Shekinah Glory Baptist Church</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, soon }) => {
          const active = path === to || path.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={soon ? "/dashboard" : (to as any)}
              onClick={(e) => {
                if (soon) e.preventDefault();
              }}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                soon && "opacity-60 cursor-not-allowed",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {soon && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-2">
        <Link
          to="/settings/organization"
          className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
            path.startsWith("/settings")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
