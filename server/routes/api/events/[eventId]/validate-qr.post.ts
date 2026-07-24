/**
 * REST API v1 - Validate QR Code
 *
 * Endpoint: POST /api/v1/events/:eventId/registrations/validate
 * Description: Validate a QR code without checking in (preview/verification)
 *
 * Request Body:
 * {
 *   "qrToken": "token-from-qr-code"
 * }
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiResponse } from "@/lib/api/response";
import { validateQrSchema, extractValidationErrors } from "@/lib/api/request-schemas";
import { toQrValidationDTO } from "@/lib/api/dto/events.dto";
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
    const validation = validateQrSchema.safeParse(body);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(details, "Invalid QR validation request");
    }

    const data = validation.data;
    const supabase = createAdminClient();

    // Validate QR code using CheckInService
    const eventService = new EventService(supabase);
    const checkInService = new CheckInService(supabase, eventService);

    const result = await checkInService.validateQRCode(
      data.qrToken,
      eventId
    );

    if (!result.valid) {
      setResponseStatus(event, 400);
      return ApiResponse.conflict(
        result.message || "Invalid QR code",
        "INVALID_QR_CODE"
      );
    }

    setResponseStatus(event, 200);
    setResponseHeader(event, "content-type", "application/json");

    const responseData = toQrValidationDTO(true, result.registration);
    return ApiResponse.success(responseData, 200);
  } catch (error) {
    console.error("[API v1] QR validation error:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      error instanceof Error
        ? error.message
        : "QR code validation failed"
    );
  }
});
