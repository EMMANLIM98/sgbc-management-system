/**
 * Mobile REST API - Register for Event
 * 
 * Endpoint: POST /api/events/:eventId/register
 * Description: Register an attendee for an event (public, no authentication required)
 * 
 * Request Body:
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@example.com",
 *   "phone": "+1234567890",
 *   "ageCategory": "adults",
 *   "sex": "male",
 *   "visitorStatus": "member",
 *   "leadershipRole": "pastor"
 * }
 * 
 * Response:
 * {
 *   "id": "registration-uuid",
 *   "attendeeName": "John Doe",
 *   "qrToken": "qr-code-token",
 *   "message": "Registration successful!"
 * }
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { EventService } from "@/modules/events/application/event.service";
import { RegistrationService } from "@/modules/events/application/registration.service";
import { emailService } from "@/lib/email";
import { webhookService } from "@/lib/webhooks";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Valid email is required").max(200),
  phone: z.string().max(40).optional(),
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

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Server configuration error. Missing Supabase credentials.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export default defineEventHandler(async (event) => {
  try {
    const eventId = getRouterParam(event, "eventId");

    if (!eventId) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "Event ID is required",
      };
    }

    // Parse and validate request body
    const body = await readBody(event);
    let data;
    try {
      data = registerSchema.parse(body);
    } catch (validationError) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "Validation error",
        details: validationError instanceof z.ZodError ? validationError.errors : [],
      };
    }

    const supabase = createAdminClient();

    // ── Rate limiting: max 3 registrations per email in last 5 minutes ──
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact" })
      .ilike("attendee_email", data.email)
      .gte("created_at", fiveMinsAgo);

    if ((recentCount || 0) >= 3) {
      setResponseStatus(event, 429);
      return {
        success: false,
        error: "Too many registration attempts",
        message: "Please wait a few minutes and try again",
      };
    }

    // ── Duplicate check ──
    const { data: existing } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .ilike("attendee_email", data.email)
      .not("status", "eq", "cancelled")
      .maybeSingle();

    if (existing) {
      setResponseStatus(event, 409);
      return {
        success: false,
        error: "Already registered",
        message: "This email is already registered for this event",
      };
    }

    // ── Fetch event + church/org IDs ──
    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, church_id, organization_id, title, event_date, location, status, max_capacity")
      .eq("id", eventId)
      .in("status", ["scheduled", "active"])
      .maybeSingle();

    if (eventErr || !eventRow) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: "Event not found",
        message: "Event not found or is not accepting registrations",
      };
    }

    // ── Capacity check ──
    if (eventRow.max_capacity != null) {
      const { count: currentCount } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact" })
        .eq("event_id", eventId)
        .not("status", "eq", "cancelled");

      if ((currentCount || 0) >= eventRow.max_capacity) {
        setResponseStatus(event, 409);
        return {
          success: false,
          error: "Event full",
          message: "Sorry, this event is at full capacity",
        };
      }
    }

    // ── Register and generate QR ──
    const eventService = new EventService(supabase);
    const registrationService = new RegistrationService(supabase, eventService);

    const { registration, qrCode } = await registrationService.registerForEvent({
      eventId: eventId,
      churchId: eventRow.church_id,
      organizationId: eventRow.organization_id,
      attendeeFirstName: data.firstName,
      attendeeLastName: data.lastName,
      attendeeEmail: data.email,
      attendeePhone: data.phone,
      ageCategory: data.ageCategory,
      sex: data.sex,
      visitorStatus: data.visitorStatus,
      leadershipRole: data.leadershipRole,
    });

    // ── Send emails (non-blocking) ──
    emailService
      .sendEventRegistrationConfirmation({
        to: data.email,
        recipientName: `${data.firstName} ${data.lastName}`,
        eventName: eventRow.title,
        eventDate: eventRow.event_date,
        eventLocation: eventRow.location || "",
        registrationId: registration.id,
      })
      .catch((e) => console.error("[MobileAPI] Confirmation email failed:", e));

    emailService
      .sendEventQRCode({
        to: data.email,
        recipientName: `${data.firstName} ${data.lastName}`,
        eventName: eventRow.title,
        eventDate: eventRow.event_date,
        qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode.token)}`,
        registrationId: registration.id,
      })
      .catch((e) => console.error("[MobileAPI] QR email failed:", e));

    // ── Trigger n8n webhook for external automation (non-blocking) ──
    webhookService
      .trigger("event.registration.created", {
        registration: {
          id: registration.id,
          status: registration.status,
          createdAt: registration.createdAt,
        },
        attendee: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || "",
          ageCategory: data.ageCategory,
          sex: data.sex,
          visitorStatus: data.visitorStatus,
          leadershipRole: data.leadershipRole,
        },
        event: {
          id: eventId,
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
      .catch((e) => console.error("[MobileAPI] n8n webhook failed:", e));

    setResponseStatus(event, 201);
    setResponseHeader(event, "content-type", "application/json");
    return {
      success: true,
      data: {
        id: registration.id,
        attendeeName: registration.attendeeName,
        qrToken: qrCode.token,
        message: "Registration successful! Your QR code has been sent to your email",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[MobileAPI] Registration error:", message);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: "Registration failed",
      message,
    };
  }
});
