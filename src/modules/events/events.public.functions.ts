/**
 * Public (unauthenticated) Event Server Functions
 *
 * These server functions use the Supabase service-role key so they bypass RLS.
 * They are intentionally public — anyone with an event ID can register.
 * Rate limiting and duplicate checks are enforced server-side.
 *
 * Architecture Layer: API (public endpoints)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { EventService } from "@/modules/events/application/event.service";
import { RegistrationService } from "@/modules/events/application/registration.service";
import { emailService } from "@/lib/email";
import { webhookService } from "@/lib/webhooks";

// Service-role client used server-side only — never exposed to the browser
function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Server configuration error. Missing Supabase credentials.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export const listPublicEvents = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).optional() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: events, error } = await supabase
      .from("events")
      .select("id, title, description, event_date, start_time, end_time, location, max_capacity, status")
      .in("status", ["scheduled", "active"])
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(data.limit ?? 50);

    if (error) {
      throw new Error("Failed to load public events.");
    }

    return {
      events: (events ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        eventDate: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location,
        maxCapacity: event.max_capacity,
        status: event.status,
      })),
    };
  });

// ============ PUBLIC GET EVENT ============

export const getPublicEvent = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = createAdminClient();

    const { data: event, error } = await supabase
      .from("events")
      .select(
        "id, title, description, event_date, start_time, end_time, location, max_capacity, status",
      )
      .eq("id", data.eventId)
      .in("status", ["scheduled", "active"])
      .maybeSingle();

    if (error) throw new Error("Failed to load event details.");
    if (!event) throw new Error("Event not found or is not accepting registrations.");

    // Count current registrations so UI can show remaining capacity
    const { count: registered } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact" })
      .eq("event_id", data.eventId)
      .not("status", "eq", "cancelled");

    const remaining =
      event.max_capacity != null ? Math.max(0, event.max_capacity - (registered || 0)) : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.location,
      maxCapacity: event.max_capacity,
      remaining,
      status: event.status,
    };
  });

// ============ PUBLIC REGISTRATION ============

const publicRegisterSchema = z.object({
  eventId: z.string().uuid(),
  attendeeFirstName: z.string().min(1, "First name is required").max(80),
  attendeeLastName: z.string().min(1, "Last name is required").max(80),
  attendeeEmail: z.string().email("Valid email is required").max(200),
  attendeePhone: z.string().max(40).optional(),
  ageCategory: z.enum(["children", "youth", "young_adults", "adults", "seniors"]).optional(),
  sex: z.enum(["male", "female"]).optional(),
  visitorStatus: z
    .enum(["member", "visitor", "first_time_guest"])
    .optional()
    .default("first_time_guest"),
  leadershipRole: z
    .enum([
      "pastor",
      "pastor_wife",
      "pastor_children",
      "associate_pastor",
      "elder",
      "deacon",
      "preacher",
      "evangelist",
      "ministry_leader",
      "none",
    ])
    .optional()
    .default("none"),
});

export const publicRegisterForEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => publicRegisterSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = createAdminClient();

    // ── Rate limiting: max 3 registrations per email in last 5 minutes ──
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact" })
      .ilike("attendee_email", data.attendeeEmail)
      .gte("created_at", fiveMinsAgo);

    if ((recentCount || 0) >= 3) {
      throw new Error(
        "Too many registration attempts. Please wait a few minutes and try again.",
      );
    }

    // ── Duplicate check ──
    const { data: existing } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", data.eventId)
      .ilike("attendee_email", data.attendeeEmail)
      .not("status", "eq", "cancelled")
      .maybeSingle();

    if (existing) {
      throw new Error("This email is already registered for this event.");
    }

    // ── Fetch event + church/org IDs ──
    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, church_id, organization_id, title, event_date, location, status, max_capacity")
      .eq("id", data.eventId)
      .in("status", ["scheduled", "active"])
      .maybeSingle();

    if (eventErr || !eventRow) {
      throw new Error("Event not found or is not accepting registrations.");
    }

    // ── Capacity check ──
    if (eventRow.max_capacity != null) {
      const { count: currentCount } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact" })
        .eq("event_id", data.eventId)
        .not("status", "eq", "cancelled");

      if ((currentCount || 0) >= eventRow.max_capacity) {
        throw new Error("Sorry, this event is at full capacity.");
      }
    }

    // ── Register and generate QR ──
    const eventService = new EventService(supabase);
    const registrationService = new RegistrationService(supabase, eventService);

    const { registration, qrCode } = await registrationService.registerForEvent({
      eventId: data.eventId,
      churchId: eventRow.church_id,
      organizationId: eventRow.organization_id,
      attendeeFirstName: data.attendeeFirstName,
      attendeeLastName: data.attendeeLastName,
      attendeeEmail: data.attendeeEmail,
      attendeePhone: data.attendeePhone,
      ageCategory: data.ageCategory,
      sex: data.sex,
      visitorStatus: data.visitorStatus,
      leadershipRole: data.leadershipRole,
    });

    // ── Send emails (non-blocking) ──
    emailService
      .sendEventRegistrationConfirmation({
        to: data.attendeeEmail,
        recipientName: `${data.attendeeFirstName} ${data.attendeeLastName}`,
        eventName: eventRow.title,
        eventDate: eventRow.event_date,
        eventLocation: eventRow.location || "",
        registrationId: registration.id,
      })
      .catch((e) => console.error("[PublicRegister] Confirmation email failed:", e));

    emailService
      .sendEventQRCode({
        to: data.attendeeEmail,
        recipientName: `${data.attendeeFirstName} ${data.attendeeLastName}`,
        eventName: eventRow.title,
        eventDate: eventRow.event_date,
        qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode.token)}`,
        registrationId: registration.id,
      })
      .catch((e) => console.error("[PublicRegister] QR email failed:", e));

    // ── Trigger n8n webhook for external automation (non-blocking) ──
    webhookService
      .trigger("event.registration.created", {
        registration: {
          id: registration.id,
          status: registration.status,
          createdAt: registration.createdAt,
        },
        attendee: {
          firstName: data.attendeeFirstName,
          lastName: data.attendeeLastName,
          email: data.attendeeEmail,
          phone: data.attendeePhone || "",
          ageCategory: data.ageCategory,
          sex: data.sex,
          visitorStatus: data.visitorStatus,
          leadershipRole: data.leadershipRole,
        },
        event: {
          id: data.eventId,
          title: eventRow.title,
          date: eventRow.event_date,
          location: eventRow.location,
          maxCapacity: eventRow.max_capacity,
        },
        qrCode: {
          token: qrCode.token,
          scanUrl: `https://sgbc-management-system.vercel.app/event-check-in/${qrCode.token}`,
        },
      })
      .catch((e) => console.error("[PublicRegister] n8n webhook failed:", e));

    return {
      id: registration.id,
      attendeeName: registration.attendeeName,
      qrToken: qrCode.token,
      message: "Registration successful! Your QR code has been sent to your email.",
    };
  });
