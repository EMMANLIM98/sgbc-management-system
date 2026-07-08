import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.object({ church_id: z.string().uuid().nullable().optional() });

export const getKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const filterChurch = (q: any) => (data.church_id ? q.eq("church_id", data.church_id) : q);

    const [total, active, visitors, churches] = await Promise.all([
      filterChurch(sb.from("members").select("id", { count: "exact", head: true })),
      filterChurch(
        sb.from("members").select("id", { count: "exact", head: true }).in("membership_status", ["member", "regular"]),
      ),
      filterChurch(
        sb.from("members").select("id", { count: "exact", head: true }).eq("membership_status", "visitor"),
      ),
      data.church_id
        ? Promise.resolve({ count: 1 })
        : sb.from("churches").select("id", { count: "exact", head: true }),
    ]);

    // Membership growth vs 30 days ago
    const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
    const growthQ = filterChurch(
      sb.from("members").select("id", { count: "exact", head: true }).gte("created_at", thirty.toISOString()),
    );
    const { count: growth } = await growthQ;

    return {
      total_members: total.count ?? 0,
      active_members: active.count ?? 0,
      visitors: visitors.count ?? 0,
      churches: (churches as any).count ?? 0,
      new_last_30: growth ?? 0,
      // Finance module ships offerings; Phase 1 returns 0s so the tiles render.
      total_offerings_mtd: 0,
      offerings_delta_pct: 0,
    };
  });

export const getMembershipGrowth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.extend({ months: z.number().int().min(3).max(24).default(6) }).parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("members").select("created_at, church_id");
    if (data.church_id) q = q.eq("church_id", data.church_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const now = new Date();
    const buckets: { label: string; count: number; date: string }[] = [];
    for (let i = data.months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        label: d.toLocaleString("en-US", { month: "short" }),
        date: d.toISOString().slice(0, 7),
        count: 0,
      });
    }
    let cumulative = 0;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (data.months - 1), 1);
    cumulative = (rows ?? []).filter((r: any) => new Date(r.created_at) < cutoff).length;
    for (const b of buckets) {
      const monthRows = (rows ?? []).filter((r: any) => (r.created_at ?? "").startsWith(b.date));
      cumulative += monthRows.length;
      b.count = cumulative;
    }
    return buckets;
  });

export const getRecentActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.extend({ limit: z.number().int().min(1).max(50).default(10) }).parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("activities")
      .select("id, verb, subject_type, subject_id, meta, created_at, church_id, churches(name), profiles:actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.church_id) q = q.eq("church_id", data.church_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getChurchesOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: churches } = await sb
      .from("churches")
      .select("id, name, city, photo_url")
      .order("name");
    const ids = (churches ?? []).map((c) => c.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data } = await sb.from("members").select("church_id").in("church_id", ids);
      for (const r of data ?? []) counts[r.church_id] = (counts[r.church_id] ?? 0) + 1;
    }
    return (churches ?? []).map((c) => ({ ...c, members: counts[c.id] ?? 0 }));
  });
