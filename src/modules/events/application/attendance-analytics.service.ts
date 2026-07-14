/**
 * Attendance Analytics Application Service
 *
 * Business logic for generating attendance analytics and dashboard metrics.
 * Architecture Layer: Application
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AttendanceCategory,
  VisitorMembership,
  LeadershipRole,
} from "@/modules/events/domain/event-registration";

export interface EventAttendanceMetrics {
  eventId: string;
  eventName: string;
  eventDate: string;
  totalRegistered: number;
  totalCheckedIn: number;
  attendancePercentage: number;
  remainingAttendees: number;
  visitorCount: number;
  memberCount: number;
  childrenCount: number;
  youthCount: number;
  youngAdultsCount: number;
  adultsCount: number;
  seniorsCount: number;
}

export interface AttendanceByCategory {
  category: AttendanceCategory;
  count: number;
  percentage: number;
}

export interface AttendanceByMembership {
  membership: VisitorMembership;
  count: number;
  percentage: number;
}

export interface AttendanceByLeadership {
  role: LeadershipRole;
  count: number;
  percentage: number;
}

export interface AttendanceByGender {
  gender: "male" | "female";
  count: number;
  percentage: number;
}

export interface HourlyArrival {
  hour: number;
  count: number;
}

export interface ChurchAttendance {
  churchId: string;
  churchName: string;
  registrationCount: number;
  checkedInCount: number;
}

/**
 * AttendanceAnalyticsService
 *
 * Generates real-time attendance analytics for events including:
 * - Overall attendance metrics
 * - Demographic breakdowns
 * - Hourly arrival data
 * - Church-level attendance
 */
export class AttendanceAnalyticsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get overall event attendance metrics
   */
  async getEventMetrics(eventId: string): Promise<EventAttendanceMetrics | null> {
    const { data, error } = await this.supabase
      .from("event_attendance_analytics")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch event metrics: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      eventId: data.event_id,
      eventName: data.event_name,
      eventDate: data.event_date,
      totalRegistered: data.total_registered || 0,
      totalCheckedIn: data.total_checked_in || 0,
      attendancePercentage: data.attendance_percentage || 0,
      remainingAttendees: data.remaining_attendees || 0,
      visitorCount: data.visitor_count || 0,
      memberCount: data.member_count || 0,
      childrenCount: data.children_count || 0,
      youthCount: data.youth_count || 0,
      youngAdultsCount: data.young_adults_count || 0,
      adultsCount: data.adults_count || 0,
      seniorsCount: data.seniors_count || 0,
    };
  }

  /**
   * Get attendance breakdown by age category
   */
  async getAttendanceByCategory(eventId: string): Promise<AttendanceByCategory[]> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("age_category, count(*)")
      .eq("event_id", eventId)
      .eq("status", "checked_in")
      .group_by("age_category");

    if (error) {
      throw new Error(`Failed to fetch category breakdown: ${error.message}`);
    }

    const total = (data ?? []).reduce((sum: number, row: any) => sum + (row.count || 0), 0);
    const categories = ["children", "youth", "young_adults", "adults", "seniors"];

    return categories.map((cat) => {
      const row = (data ?? []).find((r: any) => r.age_category === cat);
      const count = row?.count || 0;

      return {
        category: cat as AttendanceCategory,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });
  }

  /**
   * Get attendance breakdown by membership status
   */
  async getAttendanceByMembership(eventId: string): Promise<AttendanceByMembership[]> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("visitor_status, count(*)")
      .eq("event_id", eventId)
      .eq("status", "checked_in")
      .group_by("visitor_status");

    if (error) {
      throw new Error(`Failed to fetch membership breakdown: ${error.message}`);
    }

    const total = (data ?? []).reduce((sum: number, row: any) => sum + (row.count || 0), 0);
    const statuses = ["member", "visitor", "first_time_guest"];

    return statuses.map((status) => {
      const row = (data ?? []).find((r: any) => r.visitor_status === status);
      const count = row?.count || 0;

      return {
        membership: status as VisitorMembership,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });
  }

  /**
   * Get attendance breakdown by leadership role
   */
  async getAttendanceByLeadership(eventId: string): Promise<AttendanceByLeadership[]> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("leadership_role, count(*)")
      .eq("event_id", eventId)
      .eq("status", "checked_in")
      .group_by("leadership_role");

    if (error) {
      throw new Error(`Failed to fetch leadership breakdown: ${error.message}`);
    }

    const total = (data ?? []).reduce((sum: number, row: any) => sum + (row.count || 0), 0);

    return ((data ?? []) as any[])
      .map((row) => ({
        role: row.leadership_role as LeadershipRole,
        count: row.count || 0,
        percentage: total > 0 ? Math.round((row.count / total) * 100) : 0,
      }))
      .filter((item) => item.role !== "none" || item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get attendance breakdown by gender
   */
  async getAttendanceByGender(eventId: string): Promise<AttendanceByGender[]> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("sex, count(*)")
      .eq("event_id", eventId)
      .eq("status", "checked_in")
      .group_by("sex");

    if (error) {
      throw new Error(`Failed to fetch gender breakdown: ${error.message}`);
    }

    const total = (data ?? []).reduce((sum: number, row: any) => sum + (row.count || 0), 0);

    return ((data ?? []) as any[])
      .filter((row) => row.sex !== null)
      .map((row) => ({
        gender: row.sex as "male" | "female",
        count: row.count || 0,
        percentage: total > 0 ? Math.round((row.count / total) * 100) : 0,
      }));
  }

  /**
   * Get hourly arrival data for attendance trend
   */
  async getHourlyArrivals(eventId: string): Promise<HourlyArrival[]> {
    const { data, error } = await this.supabase
      .from("event_checkins")
      .select("checked_in_at")
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch hourly arrivals: ${error.message}`);
    }

    const hourlyData: Record<number, number> = {};

    (data ?? []).forEach((record: any) => {
      const date = new Date(record.checked_in_at);
      const hour = date.getHours();

      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    return Object.entries(hourlyData)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get attendance per church (for multi-church organizations)
   */
  async getAttendancePerChurch(eventId: string): Promise<ChurchAttendance[]> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("church_id, churches(name), status")
      .eq("event_id", eventId);

    if (error) {
      throw new Error(`Failed to fetch church attendance: ${error.message}`);
    }

    const churchData: Record<string, { name: string; registered: number; checkedIn: number }> = {};

    (data ?? []).forEach((record: any) => {
      const churchId = record.church_id;
      const churchName = record.churches?.name || "Unknown Church";

      if (!churchData[churchId]) {
        churchData[churchId] = { name: churchName, registered: 0, checkedIn: 0 };
      }

      churchData[churchId].registered++;

      if (record.status === "checked_in") {
        churchData[churchId].checkedIn++;
      }
    });

    return Object.entries(churchData).map(([churchId, data]) => ({
      churchId,
      churchName: data.name,
      registrationCount: data.registered,
      checkedInCount: data.checkedIn,
    }));
  }

  /**
   * Get all analytics for an event (consolidated view)
   */
  async getCompleteEventAnalytics(eventId: string): Promise<{
    metrics: EventAttendanceMetrics | null;
    byCategory: AttendanceByCategory[];
    byMembership: AttendanceByMembership[];
    byLeadership: AttendanceByLeadership[];
    byGender: AttendanceByGender[];
    hourlyArrivals: HourlyArrival[];
    perChurch: ChurchAttendance[];
  }> {
    const [metrics, byCategory, byMembership, byLeadership, byGender, hourlyArrivals, perChurch] =
      await Promise.all([
        this.getEventMetrics(eventId),
        this.getAttendanceByCategory(eventId),
        this.getAttendanceByMembership(eventId),
        this.getAttendanceByLeadership(eventId),
        this.getAttendanceByGender(eventId),
        this.getHourlyArrivals(eventId),
        this.getAttendancePerChurch(eventId),
      ]);

    return {
      metrics,
      byCategory,
      byMembership,
      byLeadership,
      byGender,
      hourlyArrivals,
      perChurch,
    };
  }

  /**
   * Refresh materialized view for faster queries
   */
  async refreshAnalytics(): Promise<void> {
    const { error } = await this.supabase.rpc("refresh_event_attendance_analytics");

    if (error) {
      throw new Error(`Failed to refresh analytics: ${error.message}`);
    }
  }
}
