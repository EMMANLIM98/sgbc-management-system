import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import {
  getKpis, getMembershipGrowth, getRecentActivities, getChurchesOverview,
} from "@/modules/dashboard/dashboard.functions";
import { formatNumber, formatPHP } from "@/lib/money";
import { Users, UserCheck, UserPlus, Building2, TrendingUp, ArrowRight, Plus, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shekinah Glory Baptist Church" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const scope = { church_id: currentChurchId };

  const kpisFn = useServerFn(getKpis);
  const growthFn = useServerFn(getMembershipGrowth);
  const actFn = useServerFn(getRecentActivities);
  const overviewFn = useServerFn(getChurchesOverview);

  const { data: kpis } = useQuery({
    queryKey: ["kpis", currentChurchId],
    queryFn: () => kpisFn({ data: scope }),
  });
  const { data: growth } = useQuery({
    queryKey: ["growth", currentChurchId],
    queryFn: () => growthFn({ data: { ...scope, months: 6 } }),
  });
  const { data: activities } = useQuery({
    queryKey: ["activities", currentChurchId],
    queryFn: () => actFn({ data: { ...scope, limit: 8 } }),
  });
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => overviewFn(),
    enabled: !currentChurchId,
  });

  const scopeLabel = currentChurchId ? currentChurch?.name ?? "Church" : `All Churches (${churches.length})`;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Dashboard"
        description={`Overview — ${scopeLabel}`}
        actions={
          <Button asChild size="sm"><Link to="/members"><Plus className="h-4 w-4 mr-1.5" />Add member</Link></Button>
        }
      />

      {!currentChurchId && overview && overview.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Our churches</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {overview.map((c) => (
              <div key={c.id} className="border border-border rounded-md p-3 bg-card">
                <div className="text-[13px] font-medium truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.city || "—"}</div>
                <div className="mt-2 text-sm tabular">{formatNumber(c.members)} <span className="text-[11px] text-muted-foreground">members</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPI icon={Users} label="Total members" value={formatNumber(kpis?.total_members)} sub={`+${kpis?.new_last_30 ?? 0} in last 30d`} />
        <KPI icon={UserCheck} label="Active" value={formatNumber(kpis?.active_members)} />
        <KPI icon={UserPlus} label="Visitors" value={formatNumber(kpis?.visitors)} />
        <KPI icon={Building2} label="Churches" value={formatNumber(kpis?.churches)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <div className="lg:col-span-2 border border-border rounded-lg bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-medium">Membership growth</div>
              <div className="text-[11px] text-muted-foreground">Cumulative, last 6 months</div>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth ?? []} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
                <XAxis dataKey="label" fontSize={11} stroke="oklch(0.5 0.01 260)" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="oklch(0.5 0.01 260)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Line type="monotone" dataKey="count" stroke="oklch(0.55 0.18 258)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="text-[13px] font-medium mb-3">Quick actions</div>
          <div className="space-y-1">
            <QuickLink to="/members" icon={UserPlus} label="Add member" />
            <QuickAction icon={DollarSign} label="Record offering" hint="soon" />
            <QuickAction icon={UserPlus} label="Register visitor" hint="soon" />
            <QuickAction icon={Calendar} label="Schedule event" hint="soon" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-[13px] font-medium">Recent activity</div>
          </div>
          <ul className="divide-y divide-border">
            {(activities ?? []).map((a: any) => (
              <li key={a.id} className="px-4 py-3 text-[13px] flex items-start gap-3">
                <div className="h-6 w-6 mt-0.5 rounded-full bg-accent grid place-items-center text-[10px] font-medium">
                  {(a.profiles?.full_name ?? "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    <span className="font-medium">{a.profiles?.full_name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">{a.verb}</span>{" "}
                    <span>{a.subject_type}</span>{" "}
                    {a.meta?.name && <span className="text-muted-foreground">— {a.meta.name}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.churches?.name ? `${a.churches.name} · ` : ""}
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </div>
                </div>
              </li>
            ))}
            {(activities ?? []).length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                No activity yet.
              </li>
            )}
          </ul>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="text-[13px] font-medium mb-1">Finance</div>
          <div className="text-[11px] text-muted-foreground mb-3">Ships in Phase 2</div>
          <div className="text-2xl font-semibold tracking-tight tabular">{formatPHP(0)}</div>
          <div className="text-[11px] text-muted-foreground">Total offerings (MTD)</div>
          <div className="mt-4 text-[12px] text-muted-foreground">
            Tithes, offerings, expenses, budgets, and reports arrive in the Finance module.
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] hover:bg-accent">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

function QuickAction({ icon: Icon, label, hint }: { icon: any; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-muted-foreground opacity-70">
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      <span className="text-[10px] uppercase tracking-wider">{hint}</span>
    </div>
  );
}
