/**
 * Dashboard Module DTOs (Data Transfer Objects)
 *
 * DTOs for KPIs, activity feeds, and statistical data
 */

/**
 * KPI DTO
 * Used in dashboard KPI endpoint
 */
export interface KpiDTO {
  totalMembers: number;
  activeMembers: number;
  visitors: number;
  churches: number;
  newLast30: number;
  totalOfferingsMtd: number;
  offeringsDeltaPct: number;
}

/**
 * Membership Growth Data Point DTO
 * Single month in growth chart
 */
export interface MembershipGrowthPointDTO {
  label: string; // "Jan", "Feb", etc
  date: string; // "2026-01" format
  count: number; // Cumulative member count
}

/**
 * Membership Growth Response DTO
 * Array of growth data points
 */
export type MembershipGrowthDTO = MembershipGrowthPointDTO[];

/**
 * Activity Actor DTO
 * Profile information of person who performed activity
 */
export interface ActivityActorDTO {
  id: string;
  fullName: string | null;
}

/**
 * Activity Entry DTO
 * Single activity in recent activities feed
 */
export interface ActivityEntryDTO {
  id: string;
  verb: string; // "created", "updated", "deleted", etc
  subjectType: string; // "member", "event", "contribution", etc
  subjectId: string;
  meta: Record<string, any>; // Additional context
  createdAt: string; // ISO 8601
  churchId: string;
  actor: ActivityActorDTO | null; // Who performed the action
  church: {
    name: string;
  } | null;
}

/**
 * Recent Activities Response DTO
 * Array of recent activities
 */
export type RecentActivitiesDTO = ActivityEntryDTO[];

/**
 * Church Overview DTO
 * Church data with member count
 */
export interface ChurchOverviewDTO {
  id: string;
  name: string;
  city: string | null;
  photoUrl: string | null;
  members: number;
}

/**
 * Churches Overview Response DTO
 * Array of church overviews
 */
export type ChurchesOverviewDTO = ChurchOverviewDTO[];

/**
 * Mapper functions to convert service responses to DTOs
 */

/**
 * Map KPI data to DTO
 */
export function toKpiDTO(data: {
  total_members: number;
  active_members: number;
  visitors: number;
  churches: number;
  new_last_30: number;
  total_offerings_mtd: number;
  offerings_delta_pct: number;
}): KpiDTO {
  return {
    totalMembers: data.total_members,
    activeMembers: data.active_members,
    visitors: data.visitors,
    churches: data.churches,
    newLast30: data.new_last_30,
    totalOfferingsMtd: data.total_offerings_mtd,
    offeringsDeltaPct: data.offerings_delta_pct,
  };
}

/**
 * Map membership growth point to DTO
 */
export function toMembershipGrowthPointDTO(data: {
  label: string;
  date: string;
  count: number;
}): MembershipGrowthPointDTO {
  return {
    label: data.label,
    date: data.date,
    count: data.count,
  };
}

/**
 * Map membership growth array to DTO
 */
export function toMembershipGrowthDTO(
  data: Array<{
    label: string;
    date: string;
    count: number;
  }>
): MembershipGrowthDTO {
  return data.map(toMembershipGrowthPointDTO);
}

/**
 * Map activity entry to DTO
 */
export function toActivityEntryDTO(data: {
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
}): ActivityEntryDTO {
  return {
    id: data.id,
    verb: data.verb,
    subjectType: data.subject_type,
    subjectId: data.subject_id,
    meta: data.meta || {},
    createdAt: data.created_at,
    churchId: data.church_id,
    actor: data.profiles
      ? {
          id: data.actor_id || '',
          fullName: data.profiles.full_name,
        }
      : null,
    church: data.churches ? { name: data.churches.name } : null,
  };
}

/**
 * Map activities array to DTO
 */
export function toRecentActivitiesDTO(
  data: Array<{
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
  }>
): RecentActivitiesDTO {
  return data.map(toActivityEntryDTO);
}

/**
 * Map church overview to DTO
 */
export function toChurchOverviewDTO(data: {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  members: number;
}): ChurchOverviewDTO {
  return {
    id: data.id,
    name: data.name,
    city: data.city,
    photoUrl: data.photo_url,
    members: data.members,
  };
}

/**
 * Map churches array to DTO
 */
export function toChurchesOverviewDTO(
  data: Array<{
    id: string;
    name: string;
    city: string | null;
    photo_url: string | null;
    members: number;
  }>
): ChurchesOverviewDTO {
  return data.map(toChurchOverviewDTO);
}
