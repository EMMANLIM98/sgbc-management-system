import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChurchLite = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  city: string | null;
  photo_url: string | null;
  currency: string;
};

export type OrgLite = { id: string; name: string; slug: string; is_org_admin: boolean };

export type MyContext = {
  user: { id: string; email: string | null; full_name: string | null; avatar_url: string | null };
  organizations: OrgLite[];
  churches: ChurchLite[];
  roles: { church_id: string; role: string }[];
};

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyContext> => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: userOrgs }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_organizations")
        .select("is_org_admin, organizations(id,name,slug)")
        .eq("user_id", userId),
      supabase.from("user_church_roles").select("church_id, role").eq("user_id", userId),
    ]);

    const organizations: OrgLite[] = (userOrgs ?? [])
      .map((r: any) => r.organizations && { ...r.organizations, is_org_admin: r.is_org_admin })
      .filter(Boolean);

    const orgIds = organizations.map((o) => o.id);
    const churchesRes = orgIds.length
      ? await supabase
          .from("churches")
          .select("id, organization_id, name, slug, city, photo_url, currency")
          .in("organization_id", orgIds)
          .order("name")
      : { data: [] as ChurchLite[] };

    return {
      user: {
        id: userId,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
      organizations,
      churches: (churchesRes.data ?? []) as ChurchLite[],
      roles: (roles ?? []) as { church_id: string; role: string }[],
    };
  });

const createChurchSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "lowercase, digits, dashes"),
  city: z.string().max(120).optional().nullable(),
  address: z.string().max(240).optional().nullable(),
  currency: z.string().min(3).max(3).default("PHP"),
});

export const createChurch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createChurchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("churches")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const updateChurchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(120).nullable().optional(),
  address: z.string().max(240).nullable().optional(),
  currency: z.string().min(3).max(3).optional(),
});

export const updateChurch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateChurchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("churches").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateOrgSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(160) });
export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateOrgSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("organizations")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(120),
  phone: z.string().max(40).nullable().optional(),
});
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfileSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOrgTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ organization_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("user_organizations")
      .select("user_id, is_org_admin, is_owner, profiles(id,email,full_name,avatar_url)")
      .eq("organization_id", data.organization_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
