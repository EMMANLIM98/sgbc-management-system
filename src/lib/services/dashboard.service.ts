/**
 * Dashboard Service
 * 
 * Aggregates statistics, KPIs, and activity data for dashboard displays
 */

import { supabase } from '@/lib/repositories/supabase.client';
import type { MemberDTO } from '@/lib/api/dto/membership.dto';

export interface KPIData {
  total_members: number;
  active_members: number;
  visitors: number;
  churches: number;
  new_last_30: number;
  total_offerings_mtd: number;
  offerings_delta_pct: number;
}

export interface MembershipGrowthData {
  label: string;
  date: string;
  count: number;
}

export interface ActivityData {
  id: string;
  verb: string;
  subject_type: string;
  subject_id: string;
  meta: any;
  created_at: string;
  church_id: string;
  actor_id: string | null;
  churches: { name: string } | null;
  profiles: { full_name: string | null } | null;
}

export interface ChurchOverviewData {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  members: number;
}

export class DashboardService {
  /**
   * Get KPIs for dashboard
   */
  async getKpis(churchId?: string): Promise<KPIData> {
    try {
      const filterChurch = (q: any) => (churchId ? q.eq('church_id', churchId) : q);

      const [total, active, visitors, churches] = await Promise.all([
        filterChurch(
          supabase.from('members').select('id', { count: 'exact', head: true })
        ),
        filterChurch(
          supabase
            .from('members')
            .select('id', { count: 'exact', head: true })
            .in('membership_status', ['member', 'regular'])
        ),
        filterChurch(
          supabase
            .from('members')
            .select('id', { count: 'exact', head: true })
            .eq('membership_status', 'visitor')
        ),
        churchId
          ? Promise.resolve({ count: 1 })
          : supabase.from('churches').select('id', { count: 'exact', head: true }),
      ]);

      // Membership growth vs 30 days ago
      const thirty = new Date();
      thirty.setDate(thirty.getDate() - 30);
      const growthQ = filterChurch(
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirty.toISOString())
      );
      const { count: growth } = await growthQ;

      return {
        total_members: total.count ?? 0,
        active_members: active.count ?? 0,
        visitors: visitors.count ?? 0,
        churches: (churches as any).count ?? 0,
        new_last_30: growth ?? 0,
        total_offerings_mtd: 0,
        offerings_delta_pct: 0,
      };
    } catch (error) {
      throw new Error(`Failed to get KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get membership growth over specified months
   */
  async getMembershipGrowth(months: number = 6, churchId?: string): Promise<MembershipGrowthData[]> {
    try {
      if (months < 3 || months > 24) {
        throw new Error('Months must be between 3 and 24');
      }

      let q = supabase.from('members').select('created_at, church_id');
      if (churchId) {
        q = q.eq('church_id', churchId);
      }

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);

      const now = new Date();
      const buckets: MembershipGrowthData[] = [];

      // Create month buckets
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: d.toLocaleString('en-US', { month: 'short' }),
          date: d.toISOString().slice(0, 7),
          count: 0,
        });
      }

      // Calculate cumulative membership growth
      let cumulative = 0;
      const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      cumulative = (rows ?? []).filter(
        (r: any) => new Date(r.created_at) < cutoff
      ).length;

      for (const b of buckets) {
        const monthRows = (rows ?? []).filter(
          (r: any) => (r.created_at ?? '').startsWith(b.date)
        );
        cumulative += monthRows.length;
        b.count = cumulative;
      }

      return buckets;
    } catch (error) {
      throw new Error(
        `Failed to get membership growth: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit: number = 10, churchId?: string): Promise<ActivityData[]> {
    try {
      if (limit < 1 || limit > 50) {
        throw new Error('Limit must be between 1 and 50');
      }

      let q = supabase
        .from('activities')
        .select(
          'id, verb, subject_type, subject_id, meta, created_at, church_id, actor_id, churches(name)'
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (churchId) {
        q = q.eq('church_id', churchId);
      }

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);

      // Fetch actor profiles
      const actorIds = Array.from(
        new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean))
      );

      let profileMap: Record<string, { full_name: string | null }> = {};
      if (actorIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', actorIds);

        for (const p of profs ?? []) {
          profileMap[p.id] = { full_name: p.full_name };
        }
      }

      return (rows ?? []).map((r: any) => ({
        ...r,
        profiles: r.actor_id ? (profileMap[r.actor_id] ?? null) : null,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get activities: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get overview of churches with member counts
   */
  async getChurchesOverview(): Promise<ChurchOverviewData[]> {
    try {
      const { data: churches, error: churchError } = await supabase
        .from('churches')
        .select('id, name, city, photo_url')
        .order('name');

      if (churchError) throw new Error(churchError.message);

      const ids = (churches ?? []).map((c) => c.id);
      let counts: Record<string, number> = {};

      if (ids.length) {
        const { data } = await supabase
          .from('members')
          .select('church_id')
          .in('church_id', ids);

        for (const r of data ?? []) {
          counts[r.church_id] = (counts[r.church_id] ?? 0) + 1;
        }
      }

      return (churches ?? []).map((c) => ({
        ...c,
        members: counts[c.id] ?? 0,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get churches overview: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Singleton instance
export const dashboardService = new DashboardService();
