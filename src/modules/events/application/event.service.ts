/**
 * Event Application Service
 *
 * Business logic for event management operations.
 * Architecture Layer: Application
 * Only this layer invokes domain models and infrastructure.
 * Never place this logic in React components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Event, type EventStatus } from "@/modules/events/domain/event";

export interface CreateEventInput {
  churchId: string;
  organizationId: string;
  title: string;
  description?: string;
  eventDate: string; // ISO date
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
  allowMultipleCheckins?: boolean;
  createdBy: string;
}

export interface UpdateEventInput {
  id: string;
  title?: string;
  description?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
  status?: EventStatus;
  allowMultipleCheckins?: boolean;
}

/**
 * EventService
 *
 * Handles all event-related business logic including CRUD operations,
 * status management, and event queries.
 */
export class EventService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput): Promise<Event> {
    const event = Event.create({
      churchId: input.churchId,
      organizationId: input.organizationId,
      title: input.title,
      description: input.description,
      eventDate: new Date(input.eventDate),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      maxCapacity: input.maxCapacity,
      status: "scheduled",
      allowMultipleCheckins: input.allowMultipleCheckins || false,
      createdBy: input.createdBy,
    });

    const { error } = await this.supabase.from("events").insert([event.toDatabase()]);

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    return event;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return Event.fromDatabase(data);
  }

  /**
   * List events for a church
   */
  async listEventsByChurch(
    churchId: string | undefined,
    options?: {
      status?: EventStatus;
      futureOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ events: Event[]; total: number }> {
    let query = this.supabase.from("events").select("*", { count: "exact" });

    // Apply church filter only when specified; RLS handles access scoping
    if (churchId) {
      query = query.eq("church_id", churchId);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.futureOnly) {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("event_date", today);
    }

    query = query.order("event_date", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list events: ${error.message}`);
    }

    return {
      events: (data ?? []).map((e) => Event.fromDatabase(e)),
      total: count ?? 0,
    };
  }

  /**
   * Update event
   */
  async updateEvent(input: UpdateEventInput): Promise<Event> {
    const event = await this.getEventById(input.id);

    if (!event) {
      throw new Error("Event not found");
    }

    const updateData: any = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.eventDate !== undefined) updateData.event_date = input.eventDate;
    if (input.startTime !== undefined) updateData.start_time = input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.endTime;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.maxCapacity !== undefined) updateData.max_capacity = input.maxCapacity;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.allowMultipleCheckins !== undefined)
      updateData.allow_multiple_checkins = input.allowMultipleCheckins;

    updateData.updated_at = new Date();

    const { error } = await this.supabase.from("events").update(updateData).eq("id", input.id);

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }

    return this.getEventById(input.id) as Promise<Event>;
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: EventStatus): Promise<Event> {
    return this.updateEvent({ id: eventId, status });
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase.from("events").delete().eq("id", eventId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Get event registration count
   */
  async getRegistrationCount(eventId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("event_registrations")
      .select("*", { count: "exact" })
      .eq("event_id", eventId);

    if (error) {
      throw new Error(`Failed to count registrations: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Get checked-in count
   */
  async getCheckedInCount(eventId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("event_registrations")
      .select("*", { count: "exact" })
      .eq("event_id", eventId)
      .eq("status", "checked_in");

    if (error) {
      throw new Error(`Failed to count checked-in: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Check if event is at capacity
   */
  async isEventAtCapacity(eventId: string): Promise<boolean> {
    const event = await this.getEventById(eventId);

    if (!event || !event.maxCapacity) {
      return false;
    }

    const registrationCount = await this.getRegistrationCount(eventId);
    return registrationCount >= event.maxCapacity;
  }
}
