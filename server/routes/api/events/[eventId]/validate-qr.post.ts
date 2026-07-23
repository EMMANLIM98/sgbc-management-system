/**
 * Mobile REST API - Validate QR Code
 * 
 * Endpoint: POST /api/events/:eventId/validate-qr
 * Description: Validate a QR code without checking in (preview/verification)
 * 
 * Request Body:
 * {
 *   "qrToken": "token-from-qr-code"
 * }
 * 
 * Response:
 * {
 *   "valid": true,
 *   "message": "QR code is valid",
 *   "registration": {
 *     "id": "registration-uuid",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "isCheckedIn": false
 *   }
 * }
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { EventService } from "@/modules/events/application/event.service";
import { CheckInService } from "@/modules/events/application/checkin.service";

const validateSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
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
      data = validateSchema.parse(body);
    } catch (validationError) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "Validation error",
        details: validationError instanceof z.ZodError ? validationError.errors : [],
      };
    }

    const supabase = createAdminClient();

    // Validate QR code using CheckInService
    const eventService = new EventService(supabase);
    const checkInService = new CheckInService(supabase, eventService);

    const result = await checkInService.validateQRCode(data.qrToken, eventId);

    if (!result.valid) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: result.message,
      };
    }

    setResponseStatus(event, 200);
    setResponseHeader(event, "content-type", "application/json");
    return {
      success: true,
      data: {
        valid: true,
        message: result.message,
        registration: result.registration,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[MobileAPI] QR validation error:", message);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: "Validation failed",
      message,
    };
  }
});
