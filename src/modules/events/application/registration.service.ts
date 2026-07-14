/**
 * Event Registration Application Service
 *
 * Business logic for event registration operations.
 * Architecture Layer: Application
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  EventRegistration,
  type AttendanceCategory,
  type LeadershipRole,
  type VisitorMembership,
  type SexKind,
  type RegistrationStatus,
} from "@/modules/events/domain/event-registration";
import { QRCode } from "@/modules/events/domain/qr-code";
import { EventService } from "@/modules/events/application/event.service";

export interface RegisterForEventInput {
  eventId: string;
  churchId: string;
  organizationId: string;
  memberId?: string;
  attendeeFirstName: string;
  attendeeLastName: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  ageCategory?: AttendanceCategory;
  sex?: SexKind;
  visitorStatus?: VisitorMembership;
  leadershipRole?: LeadershipRole;
  createdBy: string;
}

export interface UpdateRegistrationInput {
  id: string;
  ageCategory?: AttendanceCategory;
  sex?: SexKind;
  visitorStatus?: VisitorMembership;
  leadershipRole?: LeadershipRole;
}

/**
 * RegistrationService
 *
 * Handles all event registration operations including:
 * - Creating registrations
 * - Updating registration details
 * - Cancelling registrations
 * - Querying registrations
 */
export class RegistrationService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private eventService: EventService,
  ) {}

  /**
   * Register a member or guest for an event
   */
  async registerForEvent(input: RegisterForEventInput): Promise<EventRegistration> {
    // Check if event exists and can accept registrations
    const event = await this.eventService.getEventById(input.eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.canRegister()) {
      throw new Error("Event is not accepting registrations");
    }

    // Check if already registered (for members)
    if (input.memberId) {
      const existing = await this.getRegistrationByMemberAndEvent(input.memberId, input.eventId);

      if (existing) {
        throw new Error("Member is already registered for this event");
      }
    }

    // Check capacity
    const isAtCapacity = await this.eventService.isEventAtCapacity(input.eventId);

    if (isAtCapacity) {
      throw new Error("Event is at maximum capacity");
    }

    // Create registration
    const registration = EventRegistration.create({
      eventId: input.eventId,
      memberId: input.memberId,
      churchId: input.churchId,
      organizationId: input.organizationId,
      attendeeFirstName: input.attendeeFirstName,
      attendeeLastName: input.attendeeLastName,
      attendeeEmail: input.attendeeEmail,
      attendeePhone: input.attendeePhone,
      ageCategory: input.ageCategory,
      sex: input.sex,
      visitorStatus: input.visitorStatus || "visitor",
      leadershipRole: input.leadershipRole || "none",
      status: "registered",
      createdBy: input.createdBy,
    });

    const { error } = await this.supabase
      .from("event_registrations")
      .insert([registration.toDatabase()]);

    if (error) {
      throw new Error(`Failed to register for event: ${error.message}`);
    }

    // Generate QR code for registration
    await this.generateQRCodeForRegistration(registration.id, input.eventId, input.churchId);

    return registration;
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("*")
      .eq("id", registrationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch registration: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return EventRegistration.fromDatabase(data);
  }

  /**
   * Get registration by member and event
   */
  async getRegistrationByMemberAndEvent(
    memberId: string,
    eventId: string,
  ): Promise<EventRegistration | null> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("*")
      .eq("member_id", memberId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch registration: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return EventRegistration.fromDatabase(data);
  }

  /**
   * List registrations for an event
   */
  async listRegistrationsByEvent(
    eventId: string,
    options?: {
      status?: RegistrationStatus;
      limit?: number;
      offset?: number;
      search?: string;
    },
  ): Promise<{ registrations: EventRegistration[]; total: number }> {
    let query = this.supabase
      .from("event_registrations")
      .select("*", { count: "exact" })
      .eq("event_id", eventId);

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.search) {
      const like = `%${options.search}%`;
      query = query.or(
        `attendee_first_name.ilike.${like},attendee_last_name.ilike.${like},attendee_email.ilike.${like}`,
      );
    }

    query = query.order("registered_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list registrations: ${error.message}`);
    }

    return {
      registrations: (data ?? []).map((r) => EventRegistration.fromDatabase(r)),
      total: count ?? 0,
    };
  }

  /**
   * List checked-in registrations for an event
   */
  async listCheckedInRegistrations(eventId: string): Promise<EventRegistration[]> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list checked-in: ${error.message}`);
    }

    return (data ?? []).map((r) => EventRegistration.fromDatabase(r));
  }

  /**
   * Update registration
   */
  async updateRegistration(input: UpdateRegistrationInput): Promise<EventRegistration> {
    const updateData: any = {};

    if (input.ageCategory !== undefined) updateData.age_category = input.ageCategory;
    if (input.sex !== undefined) updateData.sex = input.sex;
    if (input.visitorStatus !== undefined) updateData.visitor_status = input.visitorStatus;
    if (input.leadershipRole !== undefined) updateData.leadership_role = input.leadershipRole;

    updateData.updated_at = new Date();

    const { error } = await this.supabase
      .from("event_registrations")
      .update(updateData)
      .eq("id", input.id);

    if (error) {
      throw new Error(`Failed to update registration: ${error.message}`);
    }

    return this.getRegistrationById(input.id) as Promise<EventRegistration>;
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId: string): Promise<void> {
    const registration = await this.getRegistrationById(registrationId);

    if (!registration) {
      throw new Error("Registration not found");
    }

    registration.cancel();

    const { error } = await this.supabase
      .from("event_registrations")
      .update({ status: "cancelled", updated_at: new Date() })
      .eq("id", registrationId);

    if (error) {
      throw new Error(`Failed to cancel registration: ${error.message}`);
    }
  }

  /**
   * Mark registration as no-show
   */
  async markAsNoShow(registrationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("event_registrations")
      .update({ status: "no_show", updated_at: new Date() })
      .eq("id", registrationId);

    if (error) {
      throw new Error(`Failed to mark as no-show: ${error.message}`);
    }
  }

  /**
   * Generate QR code for registration
   */
  private async generateQRCodeForRegistration(
    registrationId: string,
    eventId: string,
    churchId: string,
  ): Promise<QRCode> {
    const qrCode = QRCode.generate(registrationId, eventId, churchId);

    const { error } = await this.supabase.from("qr_codes").insert([qrCode.toDatabase()]);

    if (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }

    return qrCode;
  }

  /**
   * Get registrations by status and filter
   */
  async getRegistrationsByFilter(
    eventId: string,
    filter?: {
      ageCategory?: AttendanceCategory;
      visitorStatus?: VisitorMembership;
      leadershipRole?: LeadershipRole;
    },
  ): Promise<EventRegistration[]> {
    let query = this.supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "checked_in");

    if (filter?.ageCategory) {
      query = query.eq("age_category", filter.ageCategory);
    }

    if (filter?.visitorStatus) {
      query = query.eq("visitor_status", filter.visitorStatus);
    }

    if (filter?.leadershipRole) {
      query = query.eq("leadership_role", filter.leadershipRole);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to filter registrations: ${error.message}`);
    }

    return (data ?? []).map((r) => EventRegistration.fromDatabase(r));
  }
}
