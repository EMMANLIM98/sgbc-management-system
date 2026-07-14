import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  church_id: z.string().uuid().nullable().optional(),
  period: z.enum(["monthly", "annual"]).default("monthly"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional(),
});

export type FinanceReport = Awaited<ReturnType<typeof buildReport>>;

async function buildReport(sb: any, data: z.infer<typeof input>) {
  const isMonthly = data.period === "monthly";
  const start = isMonthly
    ? new Date(Date.UTC(data.year, (data.month ?? 1) - 1, 1))
    : new Date(Date.UTC(data.year, 0, 1));
  const end = isMonthly
    ? new Date(Date.UTC(data.year, data.month ?? 1, 1))
    : new Date(Date.UTC(data.year + 1, 0, 1));
  const startS = start.toISOString().slice(0, 10);
  const endS = end.toISOString().slice(0, 10);

  let cq = sb
    .from("contributions")
    .select("amount, occurred_on, currency, churches(name), finance_categories(name)")
    .gte("occurred_on", startS)
    .lt("occurred_on", endS);
  let eq = sb
    .from("expenses")
    .select("amount, occurred_on, currency, churches(name), finance_categories(name)")
    .gte("occurred_on", startS)
    .lt("occurred_on", endS);
  if (data.church_id) {
    cq = cq.eq("church_id", data.church_id);
    eq = eq.eq("church_id", data.church_id);
  }
  const [{ data: cRows, error: cErr }, { data: eRows, error: eErr }] = await Promise.all([cq, eq]);
  if (cErr) throw new Error(cErr.message);
  if (eErr) throw new Error(eErr.message);

  const sum = (rows: any[]) => rows.reduce((a, r) => a + Number(r.amount), 0);
  const giving_total = sum(cRows ?? []);
  const expenses_total = sum(eRows ?? []);

  // Category rollups
  const catAgg = (rows: any[]) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const name = r.finance_categories?.name ?? "Uncategorized";
      map.set(name, (map.get(name) ?? 0) + Number(r.amount));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Trend buckets
  let trend: { label: string; key: string; giving: number; expenses: number }[] = [];
  if (isMonthly) {
    // daily buckets
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    const buckets: Record<
      string,
      { label: string; key: string; giving: number; expenses: number }
    > = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { key, label: String(d.getUTCDate()), giving: 0, expenses: 0 };
    }
    for (const r of cRows ?? []) {
      const k = (r.occurred_on as string).slice(0, 10);
      if (buckets[k]) buckets[k].giving += Number(r.amount);
    }
    for (const r of eRows ?? []) {
      const k = (r.occurred_on as string).slice(0, 10);
      if (buckets[k]) buckets[k].expenses += Number(r.amount);
    }
    trend = Object.values(buckets);
  } else {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const buckets: Record<
      string,
      { label: string; key: string; giving: number; expenses: number }
    > = {};
    for (let m = 0; m < 12; m++) {
      const key = `${data.year}-${String(m + 1).padStart(2, "0")}`;
      buckets[key] = { key, label: months[m], giving: 0, expenses: 0 };
    }
    for (const r of cRows ?? []) {
      const k = (r.occurred_on as string).slice(0, 7);
      if (buckets[k]) buckets[k].giving += Number(r.amount);
    }
    for (const r of eRows ?? []) {
      const k = (r.occurred_on as string).slice(0, 7);
      if (buckets[k]) buckets[k].expenses += Number(r.amount);
    }
    trend = Object.values(buckets);
  }

  // Per church breakdown when scope=All
  let byChurch: { name: string; giving: number; expenses: number; net: number }[] = [];
  if (!data.church_id) {
    const map = new Map<string, { giving: number; expenses: number }>();
    for (const r of cRows ?? []) {
      const n = (r as any).churches?.name ?? "—";
      const cur = map.get(n) ?? { giving: 0, expenses: 0 };
      cur.giving += Number(r.amount);
      map.set(n, cur);
    }
    for (const r of eRows ?? []) {
      const n = (r as any).churches?.name ?? "—";
      const cur = map.get(n) ?? { giving: 0, expenses: 0 };
      cur.expenses += Number(r.amount);
      map.set(n, cur);
    }
    byChurch = Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        giving: v.giving,
        expenses: v.expenses,
        net: v.giving - v.expenses,
      }))
      .sort((a, b) => b.giving - a.giving);
  }

  return {
    period: data.period,
    year: data.year,
    month: data.month ?? null,
    range: { start: startS, end: endS },
    giving_total,
    expenses_total,
    net_total: giving_total - expenses_total,
    giving_by_category: catAgg(cRows ?? []),
    expenses_by_category: catAgg(eRows ?? []),
    trend,
    by_church: byChurch,
    transaction_counts: { giving: (cRows ?? []).length, expenses: (eRows ?? []).length },
  };
}

export const getFinanceReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ context, data }) => buildReport(context.supabase, data));
