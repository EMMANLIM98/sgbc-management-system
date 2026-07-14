import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { formatPHP } from "@/lib/money";
import {
  getFinanceKpis,
  getGivingTrend,
  getGivingByCategory,
  getRecentFinanceActivity,
  getFinanceByChurch,
} from "@/modules/finance/finance.functions";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  ArrowRight,
  ReceiptText,
  HandCoins,
  HandHeart,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Shekinah Glory Baptist Church" },
      {
        name: "description",
        content: "Giving trends, expenses, and financial activity across your churches.",
      },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const scope = { church_id: currentChurchId };

  const kpisFn = useServerFn(getFinanceKpis);
  const trendFn = useServerFn(getGivingTrend);
  const catFn = useServerFn(getGivingByCategory);
  const actFn = useServerFn(getRecentFinanceActivity);
  const byChurchFn = useServerFn(getFinanceByChurch);

  const { data: kpis } = useQuery({
    queryKey: ["fin-kpis", currentChurchId],
    queryFn: () => kpisFn({ data: scope }),
  });
  const { data: trend } = useQuery({
    queryKey: ["fin-trend", currentChurchId],
    queryFn: () => trendFn({ data: { ...scope, months: 6 } }),
  });
  const { data: cats } = useQuery({
    queryKey: ["fin-cats", currentChurchId],
    queryFn: () => catFn({ data: scope }),
  });
  const { data: activity } = useQuery({
    queryKey: ["fin-act", currentChurchId],
    queryFn: () => actFn({ data: { ...scope, limit: 12 } }),
  });
  const { data: byChurch } = useQuery({
    queryKey: ["fin-by-church"],
    queryFn: () => byChurchFn(),
    enabled: !currentChurchId,
  });

  const scopeLabel = currentChurchId
    ? (currentChurch?.name ?? "Church")
    : `All Churches (${churches.length})`;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Finance"
        description={`Giving & expenses — ${scopeLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/finance/pledges"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md border border-border hover:bg-accent"
            >
              <HandHeart className="h-3.5 w-3.5" /> Pledges
            </Link>
            <Link
              to="/finance/member-reports"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md border border-border hover:bg-accent"
            >
              <Users className="h-3.5 w-3.5" /> Member report
            </Link>
            <Link
              to="/finance/reports"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md border border-border hover:bg-accent"
            >
              <ReceiptText className="h-3.5 w-3.5" /> Reports
            </Link>
            <Link
              to="/finance/contributions"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md bg-foreground text-background hover:opacity-90"
            >
              <HandCoins className="h-3.5 w-3.5" /> Record giving
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPI
          icon={HandCoins}
          label="Giving (MTD)"
          value={formatPHP(kpis?.giving_mtd)}
          delta={kpis?.giving_delta_pct}
          sub="vs previous month"
        />
        <KPI
          icon={ReceiptText}
          label="Expenses (MTD)"
          value={formatPHP(kpis?.expenses_mtd)}
          delta={kpis?.expenses_delta_pct}
          invertDelta
          sub="vs previous month"
        />
        <KPI
          icon={Wallet}
          label="Net (MTD)"
          value={formatPHP(kpis?.net_mtd)}
          sub={(kpis?.net_mtd ?? 0) >= 0 ? "surplus" : "deficit"}
        />
        <KPI
          icon={TrendingUp}
          label="Giving (YTD)"
          value={formatPHP(kpis?.giving_ytd)}
          sub={`Expenses YTD ${formatPHP(kpis?.expenses_ytd)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <div className="lg:col-span-2 border border-border rounded-lg bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-medium">Giving vs expenses</div>
              <div className="text-[11px] text-muted-foreground">Last 6 months</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend ?? []} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  stroke="oklch(0.5 0.01 260)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={11}
                  stroke="oklch(0.5 0.01 260)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  formatter={(v: any) => formatPHP(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="giving"
                  name="Giving"
                  fill="oklch(0.62 0.15 158)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="oklch(0.65 0.18 25)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="text-[13px] font-medium mb-1">Giving by category</div>
          <div className="text-[11px] text-muted-foreground mb-3">Month to date</div>
          {(cats ?? []).length === 0 ? (
            <div className="text-[12px] text-muted-foreground py-10 text-center">
              No giving recorded this month.
            </div>
          ) : (
            <ul className="space-y-2">
              {(cats ?? []).slice(0, 6).map((c) => {
                const total = (cats ?? []).reduce((a, x) => a + x.amount, 0) || 1;
                const pct = Math.round((c.amount / total) * 100);
                return (
                  <li key={c.name}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="truncate">{c.name}</span>
                      <span className="tabular text-muted-foreground">{formatPHP(c.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {!currentChurchId && byChurch && byChurch.length > 0 && (
        <div className="border border-border rounded-lg bg-card mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-[13px] font-medium">By church — this month</div>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-4 py-2">Church</th>
                  <th className="text-right font-medium px-4 py-2">Giving</th>
                  <th className="text-right font-medium px-4 py-2">Expenses</th>
                  <th className="text-right font-medium px-4 py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {byChurch.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-right tabular">{formatPHP(c.giving_mtd)}</td>
                    <td className="px-4 py-2 text-right tabular text-muted-foreground">
                      {formatPHP(c.expenses_mtd)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular font-medium ${c.net_mtd >= 0 ? "" : "text-destructive"}`}
                    >
                      {formatPHP(c.net_mtd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-[13px] font-medium">Recent finance activity</div>
          <Link
            to="/finance"
            className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {(activity ?? []).map((a) => (
            <li key={a.id} className="px-4 py-3 flex items-start gap-3 text-[13px]">
              <div
                className={`h-7 w-7 mt-0.5 rounded-full grid place-items-center ${
                  a.kind === "contribution"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                }`}
              >
                {a.kind === "contribution" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate">
                  <span className="font-medium">
                    {a.kind === "contribution" ? "Giving" : "Expense"}
                  </span>
                  {a.category && <span className="text-muted-foreground"> · {a.category}</span>}
                  {a.who && <span className="text-muted-foreground"> — {a.who}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {a.church ? `${a.church} · ` : ""}
                  {new Date(a.occurred_on).toLocaleDateString()} ·{" "}
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </div>
              </div>
              <div
                className={`tabular text-[13px] font-medium whitespace-nowrap ${
                  a.kind === "contribution" ? "" : "text-muted-foreground"
                }`}
              >
                {a.kind === "expense" ? "−" : "+"}
                {formatPHP(a.amount)}
              </div>
            </li>
          ))}
          {(activity ?? []).length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              No finance activity yet. Contributions and expenses will show here.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  invertDelta,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  invertDelta?: boolean;
}) {
  const showDelta = delta !== null && delta !== undefined;
  const positive = showDelta && (invertDelta ? (delta as number) < 0 : (delta as number) >= 0);
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
        {showDelta && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {(delta as number) >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta as number)}%
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}
