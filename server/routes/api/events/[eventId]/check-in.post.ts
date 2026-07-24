/**
 * REST API v1 - Check-In with QR Code
 *
 * Endpoint: POST /api/v1/events/:eventId/registrations/check-in
 * Description: Process check-in by scanning QR code
 *
 * Request Body:
 * {
 *   "qrToken": "token-from-qr-code",
 *   "checkedInBy": "user-id-or-device-id",
 *   "deviceId": "mobile-device-uuid",
 *   "deviceName": "iPhone 14",
 *   "location": "Main Entrance"
 * }
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiResponse } from "@/lib/api/response";
import { checkInSchema, extractValidationErrors } from "@/lib/api/request-schemas";
import { toCheckInResponseDTO } from "@/lib/api/dto/events.dto";
import { EventService } from "@/modules/events/application/event.service";
import { CheckInService } from "@/modules/events/application/checkin.service";

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
    const validation = checkInSchema.safeParse(body);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(details, "Invalid check-in request");
    }

    const data = validation.data;
    const supabase = createAdminClient();

    // Get event to find church_id
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, church_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !eventData) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Event not found");
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
      location: data.location
    });

    if (!result.success) {
      setResponseStatus(event, 400);
      return ApiResponse.error(
        new Error(result.message || "Check-in failed"),
        400
      );
    }

    setResponseStatus(event, 200);
    setResponseHeader(event, "content-type", "application/json");

    const responseData = toCheckInResponseDTO(
      result.registration as any,
      data.checkedInBy
    );
    return ApiResponse.success(responseData, 200);
  } catch (error) {
    console.error("[API v1] Check-in error:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      error instanceof Error
        ? error.message
        : "Check-in failed"
    );
  }
});
