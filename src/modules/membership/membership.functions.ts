import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scopeSchema = z.object({
  church_id: z.string().uuid().nullable().optional(), // null = all churches user can access
});

const listSchema = scopeSchema.extend({
  q: z.string().max(120).optional().default(""),
  status: z
    .enum(["visitor", "regular", "member", "inactive", "transferred"])
    .nullable()
    .optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
  sort: z.enum(["name_asc", "name_desc", "created_desc", "created_asc"]).default("name_asc"),
});

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ context, data }) => {
    let query = context.supabase
      .from("members")
      .select(
        "id, church_id, first_name, last_name, email, phone, membership_status, photo_url, joined_at, created_at, churches(name)",
        { count: "exact" },
      );
    if (data.church_id) query = query.eq("church_id", data.church_id);
    if (data.status) query = query.eq("membership_status", data.status);
    if (data.q) {
      const like = `%${data.q}%`;
      query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
    }
    switch (data.sort) {
      case "name_asc": query = query.order("last_name").order("first_name"); break;
      case "name_desc": query = query.order("last_name", { ascending: false }); break;
      case "created_desc": query = query.order("created_at", { ascending: false }); break;
      case "created_asc": query = query.order("created_at", { ascending: true }); break;
    }
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    query = query.range(from, to);
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const getMember = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: member, error } = await context.supabase
      .from("members")
      .select("*, churches(id,name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) throw new Error("Member not found");
    const [{ data: family }, { data: docs }, { data: transfers }] = await Promise.all([
      context.supabase
        .from("member_family_links")
        .select("id, relation, related_member_id, members!member_family_links_related_member_id_fkey(id,first_name,last_name)")
        .eq("member_id", data.id),
      context.supabase
        .from("member_documents")
        .select("*")
        .eq("member_id", data.id)
        .order("uploaded_at", { ascending: false }),
      context.supabase
        .from("member_transfers")
        .select("*, from:churches!member_transfers_from_church_id_fkey(name), to:churches!member_transfers_to_church_id_fkey(name)")
        .eq("member_id", data.id)
        .order("transferred_at", { ascending: false }),
    ]);
    return { member, family: family ?? [], documents: docs ?? [], transfers: transfers ?? [] };
  });

const memberInputSchema = z.object({
  id: z.string().uuid().optional(),
  church_id: z.string().uuid(),
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  middle_name: z.string().max(80).nullable().optional(),
  suffix: z.string().max(20).nullable().optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  birthdate: z.string().nullable().optional(),
  civil_status: z.enum(["single", "married", "widowed", "separated", "divorced"]).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(240).nullable().optional(),
  membership_status: z.enum(["visitor", "regular", "member", "inactive", "transferred"]).default("visitor"),
  joined_at: z.string().nullable().optional(),
  baptism_date: z.string().nullable().optional(),
  baptism_church: z.string().max(160).nullable().optional(),
  wedding_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

function cleanEmpty<T extends Record<string, any>>(o: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(o)) out[k] = v === "" ? null : v;
  return out;
}

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => memberInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    const payload = cleanEmpty({ ...data, created_by: context.userId });
    const { data: row, error } = await context.supabase.from("members").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => memberInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    if (!data.id) throw new Error("id required");
    const { id, ...patch } = cleanEmpty(data);
    const { error } = await context.supabase.from("members").update(patch).eq("id", id as string);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("members")
      .update({ membership_status: "inactive" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const transferSchema = z.object({
  id: z.string().uuid(),
  to_church_id: z.string().uuid(),
  reason: z.string().max(400).optional(),
});
export const transferMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => transferSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: current, error: e1 } = await context.supabase
      .from("members").select("church_id").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await context.supabase.from("member_transfers").insert({
      member_id: data.id,
      from_church_id: current.church_id,
      to_church_id: data.to_church_id,
      reason: data.reason ?? null,
      transferred_by: context.userId,
    });
    if (e2) throw new Error(e2.message);
    const { error: e3 } = await context.supabase
      .from("members")
      .update({ church_id: data.to_church_id })
      .eq("id", data.id);
    if (e3) throw new Error(e3.message);
    return { ok: true };
  });

const familySchema = z.object({
  member_id: z.string().uuid(),
  related_member_id: z.string().uuid(),
  relation: z.enum(["spouse", "parent", "child", "sibling", "guardian", "other"]),
});
export const addFamilyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => familySchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("member_family_links").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFamilyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("member_family_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
