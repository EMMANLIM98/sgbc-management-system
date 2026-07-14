/**
 * Raffle Application Service
 *
 * Business logic for raffle draw operations.
 * Architecture Layer: Application
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AttendanceCategory,
  VisitorMembership,
  LeadershipRole,
} from "@/modules/events/domain/event-registration";

export interface RaffleEntryData {
  eventId: string;
  registrationId: string;
  churchId: string;
  participantName: string;
  participantEmail?: string;
  ageCategory?: AttendanceCategory;
  visitorStatus?: VisitorMembership;
  leadershipRole?: LeadershipRole;
}

export interface RaffleFilter {
  ageCategory?: AttendanceCategory;
  visitorStatus?: VisitorMembership;
  leadershipRole?: LeadershipRole;
  excludePreviousWinners?: boolean;
}

export interface DrawResult {
  winnerId: string;
  participantName: string;
  participantEmail?: string;
  prizeName: string;
}

export interface RaffleDrawRecord {
  id: string;
  eventId: string;
  winnerId: string;
  participantName: string;
  prizeName: string;
  drawnAt: Date;
  drawnBy: string;
}

/**
 * RaffleService
 *
 * Manages raffle entry and drawing logic including:
 * - Creating raffle entries from checked-in attendees
 * - Drawing winners with optional filtering
 * - Recording draw history
 * - Preventing duplicate winners
 */
export class RaffleService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Add raffle entry for an attendee
   * Only checked-in attendees can be added to raffle
   */
  async addRaffleEntry(data: RaffleEntryData): Promise<string> {
    // Verify registration is checked in
    const { data: registration, error: regError } = await this.supabase
      .from("event_registrations")
      .select("status")
      .eq("id", data.registrationId)
      .maybeSingle();

    if (regError || !registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== "checked_in") {
      throw new Error("Only checked-in attendees can join raffle");
    }

    // Check if already in raffle
    const { data: existing } = await this.supabase
      .from("raffle_entries")
      .select("id")
      .eq("registration_id", data.registrationId)
      .maybeSingle();

    if (existing) {
      throw new Error("Attendee already in raffle");
    }

    // Create entry
    const { data: entry, error } = await this.supabase
      .from("raffle_entries")
      .insert([
        {
          event_id: data.eventId,
          registration_id: data.registrationId,
          church_id: data.churchId,
          participant_name: data.participantName,
          participant_email: data.participantEmail || null,
          age_category: data.ageCategory || null,
          visitor_status: data.visitorStatus || null,
          leadership_role: data.leadershipRole || null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create raffle entry: ${error.message}`);
    }

    return entry.id;
  }

  /**
   * Populate raffle entries from all checked-in attendees for an event
   */
  async populateRaffleFromEvent(eventId: string, filter?: RaffleFilter): Promise<number> {
    // Get checked-in attendees
    let query = this.supabase
      .from("event_registrations")
      .select(
        "id, attendee_first_name, attendee_last_name, attendee_email, church_id, age_category, visitor_status, leadership_role",
      )
      .eq("event_id", eventId)
      .eq("status", "checked_in");

    // Apply filters
    if (filter?.ageCategory) {
      query = query.eq("age_category", filter.ageCategory);
    }

    if (filter?.visitorStatus) {
      query = query.eq("visitor_status", filter.visitorStatus);
    }

    if (filter?.leadershipRole) {
      query = query.eq("leadership_role", filter.leadershipRole);
    }

    const { data: attendees, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch attendees: ${error.message}`);
    }

    // Filter out previous winners if requested
    let entriesToAdd = attendees ?? [];

    if (filter?.excludePreviousWinners) {
      const { data: winners } = await this.supabase
        .from("raffle_draws")
        .select("winner_id")
        .eq("event_id", eventId);

      const winnerIds = new Set((winners ?? []).map((w: any) => w.winner_id));
      entriesToAdd = entriesToAdd.filter((attendee: any) => !winnerIds.has(attendee.id));
    }

    // Batch insert entries
    if (entriesToAdd.length === 0) {
      return 0;
    }

    const entries = entriesToAdd.map((attendee: any) => ({
      event_id: eventId,
      registration_id: attendee.id,
      church_id: attendee.church_id,
      participant_name: `${attendee.attendee_first_name} ${attendee.attendee_last_name}`,
      participant_email: attendee.attendee_email || null,
      age_category: attendee.age_category || null,
      visitor_status: attendee.visitor_status || null,
      leadership_role: attendee.leadership_role || null,
    }));

    const { error: insertError } = await this.supabase.from("raffle_entries").insert(entries);

    if (insertError) {
      throw new Error(`Failed to create raffle entries: ${insertError.message}`);
    }

    return entries.length;
  }

  /**
   * Draw a single winner
   */
  async drawWinner(
    eventId: string,
    prizeName: string,
    drawnBy: string,
    filter?: RaffleFilter,
  ): Promise<DrawResult | null> {
    // Get eligible entries
    let query = this.supabase
      .from("raffle_entries")
      .select("id, participant_name, participant_email, registration_id")
      .eq("event_id", eventId)
      .eq("is_winner", false)
      .eq("excluded", false);

    // Apply filters
    if (filter?.ageCategory) {
      query = query.eq("age_category", filter.ageCategory);
    }

    if (filter?.visitorStatus) {
      query = query.eq("visitor_status", filter.visitorStatus);
    }

    if (filter?.leadershipRole) {
      query = query.eq("leadership_role", filter.leadershipRole);
    }

    const { data: entries, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch raffle entries: ${error.message}`);
    }

    if (!entries || entries.length === 0) {
      return null;
    }

    // Select random winner
    const winner = entries[Math.floor(Math.random() * entries.length)];

    // Record draw
    const { error: drawError } = await this.supabase.from("raffle_draws").insert([
      {
        event_id: eventId,
        winner_id: winner.id,
        prize_name: prizeName,
        drawn_by: drawnBy,
        draw_time: new Date(),
      },
    ]);

    if (drawError) {
      throw new Error(`Failed to record draw: ${drawError.message}`);
    }

    // Mark as winner
    await this.supabase.from("raffle_entries").update({ is_winner: true }).eq("id", winner.id);

    return {
      winnerId: winner.id,
      participantName: winner.participant_name,
      participantEmail: winner.participant_email,
      prizeName,
    };
  }

  /**
   * Draw multiple winners
   */
  async drawMultipleWinners(
    eventId: string,
    prizes: Array<{ name: string; count: number }>,
    drawnBy: string,
    filter?: RaffleFilter,
  ): Promise<DrawResult[]> {
    const results: DrawResult[] = [];

    for (const prize of prizes) {
      for (let i = 0; i < prize.count; i++) {
        const result = await this.drawWinner(eventId, prize.name, drawnBy, {
          ...filter,
          excludePreviousWinners: true,
        });

        if (result) {
          results.push(result);
        } else {
          break; // No more eligible entries
        }
      }
    }

    return results;
  }

  /**
   * Re-roll winners (remove previous draws and create new ones)
   */
  async rerollWinners(
    eventId: string,
    prizeName: string,
    count: number,
    drawnBy: string,
    filter?: RaffleFilter,
  ): Promise<DrawResult[]> {
    // Remove previous draws for this prize
    await this.supabase
      .from("raffle_draws")
      .delete()
      .eq("event_id", eventId)
      .eq("prize_name", prizeName);

    // Mark previous winners as non-winners
    const { data: previousWinners } = await this.supabase
      .from("raffle_entries")
      .select("id")
      .eq("event_id", eventId)
      .eq("is_winner", true);

    if (previousWinners && previousWinners.length > 0) {
      await this.supabase
        .from("raffle_entries")
        .update({ is_winner: false })
        .in(
          "id",
          previousWinners.map((w) => w.id),
        );
    }

    // Draw new winners
    const results: DrawResult[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.drawWinner(eventId, prizeName, drawnBy, {
        ...filter,
        excludePreviousWinners: true,
      });

      if (result) {
        results.push(result);
      } else {
        break;
      }
    }

    return results;
  }

  /**
   * Get raffle entries for an event
   */
  async getRaffleEntries(
    eventId: string,
    options?: {
      excludeWinners?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ entries: any[]; total: number }> {
    let query = this.supabase
      .from("raffle_entries")
      .select("*", { count: "exact" })
      .eq("event_id", eventId);

    if (options?.excludeWinners) {
      query = query.eq("is_winner", false);
    }

    query = query.order("created_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch raffle entries: ${error.message}`);
    }

    return {
      entries: data ?? [],
      total: count ?? 0,
    };
  }

  /**
   * Get raffle winners for an event
   */
  async getRaffleWinners(eventId: string): Promise<RaffleDrawRecord[]> {
    const { data, error } = await this.supabase
      .from("raffle_draws")
      .select("id, event_id, winner_id, participant_name, prize_name, draw_time, drawn_by")
      .eq("event_id", eventId)
      .order("draw_time", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch raffle winners: ${error.message}`);
    }

    return (data ?? []).map((record: any) => ({
      id: record.id,
      eventId: record.event_id,
      winnerId: record.winner_id,
      participantName: record.participant_name,
      prizeName: record.prize_name,
      drawnAt: new Date(record.draw_time),
      drawnBy: record.drawn_by,
    }));
  }

  /**
   * Exclude entry from raffle
   */
  async excludeEntry(entryId: string): Promise<void> {
    const { error } = await this.supabase
      .from("raffle_entries")
      .update({ excluded: true })
      .eq("id", entryId);

    if (error) {
      throw new Error(`Failed to exclude entry: ${error.message}`);
    }
  }

  /**
   * Clear all raffle data for an event
   */
  async clearRaffle(eventId: string): Promise<void> {
    // Delete draws
    await this.supabase.from("raffle_draws").delete().eq("event_id", eventId);

    // Delete entries
    await this.supabase.from("raffle_entries").delete().eq("event_id", eventId);
  }
}
