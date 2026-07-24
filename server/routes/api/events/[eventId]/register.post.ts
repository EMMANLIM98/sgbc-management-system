/**
 * REST API v1 - Register for Event
 *
 * Endpoint: POST /api/v1/events/:eventId/registrations
 * Description: Register an attendee for an event (public endpoint)
 * Authentication: None (public)
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
 * Returns: 201 Created
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiResponse } from "@/lib/api/response";
import {
  createEventRegistrationSchema,
  extractValidationErrors
} from "@/lib/api/request-schemas";
import {
  toEventRegistrationConfirmationDTO,
  type EventRegistrationConfirmationDTO
} from "@/lib/api/dto/events.dto";
import { EventService } from "@/modules/events/application/event.service";
import { RegistrationService } from "@/modules/events/application/registration.service";
import { emailService } from "@/lib/email";
import { webhookService } from "@/lib/webhooks";

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Server configuration error. Missing Supabase credentials."
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false }
  });
}

export default defineEventHandler(async (event) => {
  try {
    const eventId = getRouterParam(event, "eventId");

    if (!eventId || !eventId.match(/^[0-9a-f\-]+$/i)) {
      setResponseStatus(event, 400);
      return ApiResponse.validationError(
        [{ field: "eventId", message: "Invalid event ID format", code: "INVALID_ID" }],
        "Invalid event ID"
      );
    }

    // Parse and validate request body
    const body = await readBody(event);
    const validation = createEventRegistrationSchema.safeParse(body);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(details, "Invalid registration data");
    }

    const data = validation.data;
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
      return ApiResponse.rateLimited(
        "Too many registration attempts. Please wait before trying again.",
        300
      );
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
      return ApiResponse.conflict(
        "This email is already registered for this event",
        "ALREADY_REGISTERED",
        { email: data.email }
      );
    }

    // ── Fetch event ──
    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select(
        "id, church_id, organization_id, title, event_date, location, status, max_capacity"
      )
      .eq("id", eventId)
      .in("status", ["scheduled", "active"])
      .maybeSingle();

    if (eventErr || !eventRow) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound(
        "Event not found or is not accepting registrations"
      );
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
        return ApiResponse.conflict(
          "Event is at full capacity",
          "EVENT_FULL",
          {
            maxCapacity: eventRow.max_capacity,
            currentRegistrations: currentCount || 0
          }
        );
      }
    }

    // ── Register and generate QR ──
    const eventService = new EventService(supabase);
    const registrationService = new RegistrationService(
      supabase,
      eventService
    );

    const { registration, qrCode } =
      await registrationService.registerForEvent({
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
        leadershipRole: data.leadershipRole
      });

    // ── Generate confirmation code ──
    const confirmationCode = `REG-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

    // ── Send confirmation emails (non-blocking) ──
    emailService
      .sendEventRegistrationConfirmation({
        to: data.email,
        recipientName: `${data.firstName} ${data.lastName}`,
        eventName: eventRow.title,
        eventDate: eventRow.event_date,
        eventLocation: eventRow.location || "",
        registrationId: registration.id,
        confirmationCode
      })
      .catch((e) =>
        console.error("[API v1] Confirmation email failed:", e)
      );

    emailService
      .sendEventQRCode({
        to: data.email,
        recipientName: `${data.firstName} ${data.lastName}`,
        eventName: eventRow.title,
        eventDate: eventRow.event_date,
        qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode.token)}`,
        registrationId: registration.id
      })
      .catch((e) =>
        console.error("[API v1] QR email failed:", e)
      );

    // ── Trigger n8n webhook for external automation (non-blocking) ──
    webhookService
      .trigger("event.registration.created", {
        registration: {
          id: registration.id,
          status: registration.status,
          createdAt: registration.createdAt
        },
        attendee: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || "",
          ageCategory: data.ageCategory,
          sex: data.sex,
          visitorStatus: data.visitorStatus,
          leadershipRole: data.leadershipRole
        },
        event: {
          id: eventId,
          title: eventRow.title,
          date: eventRow.event_date,
          location: eventRow.location,
          maxCapacity: eventRow.max_capacity
        },
        qrCode: {
          token: qrCode.token,
          scanUrl: `${process.env.VITE_APP_URL || "http://localhost:5173"}/event-check-in/${qrCode.token}`
        }
      })
      .catch((e) =>
        console.error("[API v1] n8n webhook failed:", e)
      );

    // Build response DTO
    const responseData: EventRegistrationConfirmationDTO = {
      id: registration.id,
      attendeeName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      eventTitle: eventRow.title,
      eventDate: eventRow.event_date,
      location: eventRow.location || "",
      qrToken: qrCode.token,
      confirmationCode,
      message: "Thank you for registering! Your confirmation and QR code have been sent to your email."
    };

    setResponseStatus(event, 201);
    setResponseHeader(event, "content-type", "application/json");
    setResponseHeader(event, "Location", `/api/v1/events/${eventId}/registrations/${registration.id}`);

    return ApiResponse.created(responseData);
  } catch (error) {
    console.error("[API v1] Registration error:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      error instanceof Error
        ? error.message
        : "Registration failed"
    );
  }
});
