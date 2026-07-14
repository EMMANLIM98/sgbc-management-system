import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.object({ church_id: z.string().uuid().nullable().optional() });

// Full contribution history for a single member, with category totals
export const getMemberContributionHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        member_id: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("contributions")
      .select(
        "id, amount, currency, method, reference, note, occurred_on, created_at, church_id, category_id, finance_categories(id, name, color), churches(id, name), members(id, first_name, last_name, email, phone)",
      )
      .eq("member_id", data.member_id)
      .order("occurred_on", { ascending: false });
    if (data.from) q = q.gte("occurred_on", data.from);
    if (data.to) q = q.lte("occurred_on", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    // Breakdown by category
    const catMap = new Map<
      string,
      { id: string; name: string; color: string | null; total: number; count: number }
    >();
    let total = 0;
    for (const r of list) {
      const c = (r as any).finance_categories;
      const key = c?.id ?? "uncat";
      const cur = catMap.get(key) ?? {
        id: key,
        name: c?.name ?? "Uncategorized",
        color: c?.color ?? null,
        total: 0,
        count: 0,
      };
      cur.total += Number((r as any).amount);
      cur.count += 1;
      catMap.set(key, cur);
      total += Number((r as any).amount);
    }

    // Year buckets
    const yearMap = new Map<string, number>();
    for (const r of list) {
      const y = (r as any).occurred_on.slice(0, 4);
      yearMap.set(y, (yearMap.get(y) ?? 0) + Number((r as any).amount));
    }

    const member = (list[0] as any)?.members ?? null;
    return {
      member,
      total,
      count: list.length,
      by_category: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
      by_year: Array.from(yearMap.entries())
        .map(([year, total]) => ({ year, total }))
        .sort((a, b) => (a.year < b.year ? 1 : -1)),
      rows: list,
    };
  });

// Get a single contribution (used for receipt page)
export const getContribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("contributions")
      .select(
        "id, amount, currency, method, reference, note, occurred_on, created_at, finance_categories(name), churches(name), members(id, first_name, last_name, email, phone)",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Aggregated report: total giving per member with breakdown by category
export const getMemberGivingReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scope
      .extend({
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("contributions")
      .select(
        "amount, member_id, category_id, occurred_on, members(id, first_name, last_name), finance_categories(id, name)",
      )
      .not("member_id", "is", null);
    if (data.church_id) q = q.eq("church_id", data.church_id);
    if (data.from) q = q.gte("occurred_on", data.from);
    if (data.to) q = q.lte("occurred_on", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    type MemberAgg = {
      id: string;
      name: string;
      total: number;
      count: number;
      by_category: Record<string, number>;
      last_gift: string | null;
    };
    const map = new Map<string, MemberAgg>();
    const catNames = new Set<string>();
    for (const r of rows ?? []) {
      const m: any = (r as any).members;
      if (!m) continue;
      const cat: any = (r as any).finance_categories;
      const catName = cat?.name ?? "Uncategorized";
      catNames.add(catName);
      const cur: MemberAgg = map.get(m.id) ?? {
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        total: 0,
        count: 0,
        by_category: {} as Record<string, number>,
        last_gift: null,
      };
      const amt = Number((r as any).amount);
      cur.total += amt;
      cur.count += 1;
      cur.by_category[catName] = (cur.by_category[catName] ?? 0) + amt;
      if (!cur.last_gift || (r as any).occurred_on > cur.last_gift)
        cur.last_gift = (r as any).occurred_on;
      map.set(m.id, cur);
    }
    const categories = Array.from(catNames).sort();
    const list = Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, data.limit);
    const grand_total = list.reduce((a, m) => a + m.total, 0);
    return { categories, members: list, grand_total, count: list.length };
  });
