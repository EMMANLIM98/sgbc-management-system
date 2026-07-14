import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.object({ church_id: z.string().uuid().nullable().optional() });

export const listGivingCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("finance_categories")
      .select("id, name, color, church_id, churches(name)")
      .eq("kind", "income")
      .eq("is_archived", false)
      .order("name");
    if (data.church_id) q = q.eq("church_id", data.church_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listMemberPicker = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scope
      .extend({
        q: z.string().max(120).optional().default(""),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let query = context.supabase
      .from("members")
      .select("id, first_name, last_name, church_id, churches(name)")
      .order("last_name")
      .order("first_name")
      .limit(data.limit);
    if (data.church_id) query = query.eq("church_id", data.church_id);
    if (data.q) {
      const like = `%${data.q}%`;
      query = query.or(`first_name.ilike.${like},last_name.ilike.${like}`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const listSchema = scope.extend({
  q: z.string().max(120).optional().default(""),
  category_id: z.string().uuid().nullable().optional(),
  member_id: z.string().uuid().nullable().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(50),
});

export const listContributions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("contributions")
      .select(
        "id, church_id, amount, currency, method, reference, note, occurred_on, created_at, members(id, first_name, last_name), finance_categories(id, name, color), churches(name)",
        { count: "exact" },
      )
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.church_id) q = q.eq("church_id", data.church_id);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    if (data.member_id) q = q.eq("member_id", data.member_id);
    if (data.from) q = q.gte("occurred_on", data.from);
    if (data.to) q = q.lte("occurred_on", data.to);
    const from = (data.page - 1) * data.page_size;
    q = q.range(from, from + data.page_size - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0, page: data.page, page_size: data.page_size };
  });

const createSchema = z.object({
  church_id: z.string().uuid(),
  category_id: z.string().uuid(),
  member_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().default("PHP"),
  method: z.enum(["cash", "check", "bank", "online", "other"]).nullable().optional(),
  reference: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  occurred_on: z.string(),
});

export const createContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from("contributions")
      .insert({
        church_id: data.church_id,
        category_id: data.category_id,
        member_id: data.member_id ?? null,
        amount: data.amount,
        currency: data.currency,
        method: data.method ?? null,
        reference: data.reference ?? null,
        note: data.note ?? null,
        occurred_on: data.occurred_on,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("contributions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMemberGivingSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scope.extend({ limit: z.number().int().min(1).max(50).default(10) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    let q = context.supabase
      .from("contributions")
      .select("amount, member_id, members(id, first_name, last_name)")
      .not("member_id", "is", null)
      .gte("occurred_on", yearStart);
    if (data.church_id) q = q.eq("church_id", data.church_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const map = new Map<string, { id: string; name: string; total: number; count: number }>();
    for (const r of rows ?? []) {
      const m: any = (r as any).members;
      if (!m) continue;
      const cur = map.get(m.id) ?? {
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        total: 0,
        count: 0,
      };
      cur.total += Number((r as any).amount);
      cur.count += 1;
      map.set(m.id, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, data.limit);
  });
