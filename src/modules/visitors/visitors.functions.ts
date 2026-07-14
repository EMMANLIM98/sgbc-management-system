import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.object({ church_id: z.string().uuid().nullable().optional() });

export const listVisitors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scope
      .extend({
        q: z.string().max(120).optional().default(""),
        source: z.enum(["invited", "walk_in"]).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("visitors")
      .select(
        "id, church_id, visit_date, full_name, age, address, contact_number, source, invited_by, can_visit, visit_when, notes, created_at, churches(name)",
      )
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.church_id) q = q.eq("church_id", data.church_id);
    if (data.source) q = q.eq("source", data.source);
    if (data.q) {
      const like = `%${data.q}%`;
      q = q.or(`full_name.ilike.${like},address.ilike.${like},contact_number.ilike.${like}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getVisitor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("visitors")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  church_id: z.string().uuid(),
  visit_date: z.string(),
  full_name: z.string().min(1).max(160),
  age: z.number().int().min(0).max(150).nullable().optional(),
  address: z.string().max(400).nullable().optional(),
  contact_number: z.string().max(60).nullable().optional(),
  source: z.enum(["invited", "walk_in"]),
  invited_by: z.string().max(160).nullable().optional(),
  can_visit: z.boolean().default(false),
  visit_when: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const createVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { id: _ignored, ...payload } = data;
    const { data: row, error } = await context.supabase
      .from("visitors")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("visitors").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("visitors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
