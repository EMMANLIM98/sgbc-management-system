import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.object({ church_id: z.string().uuid().nullable().optional() });

export const getFinanceKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    const scopeFilter = (q: any) => (data.church_id ? q.eq("church_id", data.church_id) : q);

    const [mtdC, prevC, ytdC, mtdE, prevE, ytdE] = await Promise.all([
      scopeFilter(sb.from("contributions").select("amount").gte("occurred_on", monthStart)),
      scopeFilter(sb.from("contributions").select("amount").gte("occurred_on", prevStart).lt("occurred_on", monthStart)),
      scopeFilter(sb.from("contributions").select("amount").gte("occurred_on", yearStart)),
      scopeFilter(sb.from("expenses").select("amount").gte("occurred_on", monthStart)),
      scopeFilter(sb.from("expenses").select("amount").gte("occurred_on", prevStart).lt("occurred_on", monthStart)),
      scopeFilter(sb.from("expenses").select("amount").gte("occurred_on", yearStart)),
    ]);

    const sum = (r: any) => (r.data ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
    const giving_mtd = sum(mtdC);
    const giving_prev = sum(prevC);
    const giving_ytd = sum(ytdC);
    const expenses_mtd = sum(mtdE);
    const expenses_prev = sum(prevE);
    const expenses_ytd = sum(ytdE);
    const net_mtd = giving_mtd - expenses_mtd;
    const giving_delta_pct = giving_prev > 0 ? Math.round(((giving_mtd - giving_prev) / giving_prev) * 100) : null;
    const expenses_delta_pct = expenses_prev > 0 ? Math.round(((expenses_mtd - expenses_prev) / expenses_prev) * 100) : null;

    return {
      giving_mtd, giving_ytd, giving_delta_pct,
      expenses_mtd, expenses_ytd, expenses_delta_pct,
      net_mtd,
    };
  });

export const getGivingTrend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.extend({ months: z.number().int().min(3).max(24).default(6) }).parse(d))
  .handler(async ({ context, data }) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (data.months - 1), 1);
    let cq = context.supabase.from("contributions").select("amount, occurred_on").gte("occurred_on", start.toISOString().slice(0, 10));
    let eq = context.supabase.from("expenses").select("amount, occurred_on").gte("occurred_on", start.toISOString().slice(0, 10));
    if (data.church_id) { cq = cq.eq("church_id", data.church_id); eq = eq.eq("church_id", data.church_id); }
    const [{ data: cRows }, { data: eRows }] = await Promise.all([cq, eq]);

    const buckets: Record<string, { label: string; giving: number; expenses: number }> = {};
    for (let i = data.months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      buckets[key] = { label: d.toLocaleString("en-US", { month: "short" }), giving: 0, expenses: 0 };
    }
    for (const r of cRows ?? []) {
      const k = (r.occurred_on as string).slice(0, 7);
      if (buckets[k]) buckets[k].giving += Number(r.amount);
    }
    for (const r of eRows ?? []) {
      const k = (r.occurred_on as string).slice(0, 7);
      if (buckets[k]) buckets[k].expenses += Number(r.amount);
    }
    return Object.entries(buckets).map(([k, v]) => ({ month: k, ...v }));
  });

export const getGivingByCategory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.parse(d))
  .handler(async ({ context, data }) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    let q = context.supabase
      .from("contributions")
      .select("amount, finance_categories(name, color)")
      .gte("occurred_on", start);
    if (data.church_id) q = q.eq("church_id", data.church_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const map = new Map<string, { name: string; color: string | null; amount: number }>();
    for (const r of rows ?? []) {
      const name = (r as any).finance_categories?.name ?? "Uncategorized";
      const color = (r as any).finance_categories?.color ?? null;
      const cur = map.get(name) ?? { name, color, amount: 0 };
      cur.amount += Number((r as any).amount);
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  });

export const getRecentFinanceActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.extend({ limit: z.number().int().min(1).max(50).default(10) }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    let cq = sb.from("contributions")
      .select("id, amount, currency, occurred_on, note, created_at, churches(name), finance_categories(name), members(first_name,last_name)")
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(data.limit);
    let eq = sb.from("expenses")
      .select("id, amount, currency, occurred_on, payee, note, created_at, churches(name), finance_categories(name)")
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(data.limit);
    if (data.church_id) { cq = cq.eq("church_id", data.church_id); eq = eq.eq("church_id", data.church_id); }
    const [{ data: c }, { data: e }] = await Promise.all([cq, eq]);

    const items = [
      ...(c ?? []).map((r: any) => ({
        id: `c-${r.id}`, kind: "contribution" as const, amount: Number(r.amount), currency: r.currency,
        occurred_on: r.occurred_on, created_at: r.created_at,
        church: r.churches?.name ?? null,
        category: r.finance_categories?.name ?? null,
        who: r.members ? `${r.members.first_name} ${r.members.last_name}` : null,
        note: r.note,
      })),
      ...(e ?? []).map((r: any) => ({
        id: `e-${r.id}`, kind: "expense" as const, amount: Number(r.amount), currency: r.currency,
        occurred_on: r.occurred_on, created_at: r.created_at,
        church: r.churches?.name ?? null,
        category: r.finance_categories?.name ?? null,
        who: r.payee ?? null,
        note: r.note,
      })),
    ];
    items.sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : (a.created_at < b.created_at ? 1 : -1)));
    return items.slice(0, data.limit);
  });

export const getFinanceByChurch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const { data: churches } = await sb.from("churches").select("id, name, currency").order("name");
    const ids = (churches ?? []).map((c) => c.id);
    if (!ids.length) return [];
    const [{ data: c }, { data: e }] = await Promise.all([
      sb.from("contributions").select("church_id, amount").in("church_id", ids).gte("occurred_on", monthStart),
      sb.from("expenses").select("church_id, amount").in("church_id", ids).gte("occurred_on", monthStart),
    ]);
    const giving: Record<string, number> = {};
    const spend: Record<string, number> = {};
    for (const r of c ?? []) giving[r.church_id] = (giving[r.church_id] ?? 0) + Number(r.amount);
    for (const r of e ?? []) spend[r.church_id] = (spend[r.church_id] ?? 0) + Number(r.amount);
    return (churches ?? []).map((ch) => ({
      id: ch.id, name: ch.name, currency: ch.currency,
      giving_mtd: giving[ch.id] ?? 0, expenses_mtd: spend[ch.id] ?? 0,
      net_mtd: (giving[ch.id] ?? 0) - (spend[ch.id] ?? 0),
    }));
  });