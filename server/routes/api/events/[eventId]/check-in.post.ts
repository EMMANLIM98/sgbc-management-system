/**
 * Mobile REST API - Check-In with QR Code
 *
 * Endpoint: POST /api/events/:eventId/check-in
 * Description: Process check-in by scanning QR code
 *
 * Request Body:
 * {
 *   "qrToken": "token-from-qr-code",
 *   "checkedInBy": "user-id-or-device-id"
 * }
 *
 * Optional:
 * {
 *   "deviceId": "mobile-device-uuid",
 *   "deviceName": "iPhone 14",
 *   "location": "Main Entrance"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "registration": {
 *     "id": "registration-uuid",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "status": "checked_in"
 *   },
 *   "checkedInAt": "2026-07-23T14:30:45Z"
 * }
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { EventService } from "@/modules/events/application/event.service";
import { CheckInService } from "@/modules/events/application/checkin.service";

const checkInSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
  checkedInBy: z.string().min(1, "Checked in by is required"),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  location: z.string().optional(),
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
      data = checkInSchema.parse(body);
    } catch (validationError) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "Validation error",
        details: validationError instanceof z.ZodError ? validationError.errors : [],
      };
    }

    const supabase = createAdminClient();

    // Get event to find church_id
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, church_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !eventData) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Process check-in using CheckInService
    const eventService = new EventService(supabase);
    const checkInService = new CheckInService(supabase, eventService);

    const result = await checkInService.checkIn({
      qrToken: data.qrToken,
      eventId: eventId,
      churchId: eventData.church_id,
      checkedInBy: data.checkedInBy,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      location: data.location,
    });

    if (!result.success) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: result.message,
        errorCode: result.error,
      };
    }

    setResponseStatus(event, 200);
    setResponseHeader(event, "content-type", "application/json");
    return {
      success: true,
      data: {
        message: result.message,
        registration: result.registration
          ? {
              id: result.registration.id,
              name: result.registration.attendeeName,
              email: result.registration.attendeeEmail,
              phone: result.registration.attendeePhone,
              status: result.registration.status,
              ageCategory: result.registration.ageCategory,
              sex: result.registration.sex,
            }
          : undefined,
        checkedInAt: result.checkedInAt,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[MobileAPI] Check-in error:", message);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: "Check-in failed",
      message,
    };
  }
});
