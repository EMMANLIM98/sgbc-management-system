import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.object({ church_id: z.string().uuid().nullable().optional() });

const pledgeInput = z.object({
  church_id: z.string().uuid(),
  member_id: z.string().uuid(),
  category_id: z.string().uuid(),
  campaign: z.string().max(120).optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().default("PHP"),
  frequency: z.enum(["one_time", "weekly", "monthly", "quarterly", "annually"]).default("one_time"),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["active", "fulfilled", "cancelled"]).default("active"),
  notes: z.string().max(500).optional().nullable(),
});

export const listPledges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scope
      .extend({
        status: z.enum(["all", "active", "fulfilled", "cancelled"]).default("all"),
        member_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("pledges")
      .select(
        "id, church_id, member_id, category_id, campaign, amount, currency, frequency, start_date, end_date, status, notes, created_at, members(id, first_name, last_name), finance_categories(id, name, color), churches(name)",
      )
      .order("start_date", { ascending: false });
    if (data.church_id) q = q.eq("church_id", data.church_id);
    if (data.member_id) q = q.eq("member_id", data.member_id);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const pledgeIds = (rows ?? []).map((r: any) => r.id);
    let fulfillment = new Map<string, number>();
    if (pledgeIds.length > 0) {
      // Sum contributions per (member,category,church) since pledge start
      for (const p of rows ?? []) {
        let cq = context.supabase
          .from("contributions")
          .select("amount")
          .eq("church_id", (p as any).church_id)
          .eq("member_id", (p as any).member_id)
          .eq("category_id", (p as any).category_id)
          .gte("occurred_on", (p as any).start_date);
        if ((p as any).end_date) cq = cq.lte("occurred_on", (p as any).end_date);
        const { data: cRows } = await cq;
        const paid = (cRows ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
        fulfillment.set((p as any).id, paid);
      }
    }
    return (rows ?? []).map((p: any) => ({
      ...p,
      paid: fulfillment.get(p.id) ?? 0,
      remaining: Math.max(0, Number(p.amount) - (fulfillment.get(p.id) ?? 0)),
      progress_pct:
        Number(p.amount) > 0
          ? Math.min(100, Math.round(((fulfillment.get(p.id) ?? 0) / Number(p.amount)) * 100))
          : 0,
    }));
  });

export const createPledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pledgeInput.parse(d))
  .handler(async ({ context, data }) => {
    const { error, data: row } = await context.supabase
      .from("pledges")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pledgeInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("pledges").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("pledges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
