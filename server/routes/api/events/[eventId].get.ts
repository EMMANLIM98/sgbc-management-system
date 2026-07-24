/**
 * REST API v1 - Get Event Details
 *
 * Endpoint: GET /api/v1/events/:eventId
 * Description: Retrieve full details for a specific event
 * Authentication: None (public)
 *
 * Response includes:
 *   - Event details
 *   - Current registration count
 *   - Remaining capacity
 *   - Registration deadline
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiResponse } from "@/lib/api/response";

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

    const supabase = createAdminClient();

    // Fetch event
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(
        "id, title, description, event_date, start_time, end_time, location, max_capacity, status, church_id, organization_id, created_at, updated_at"
      )
      .eq("id", eventId)
      .in("status", ["scheduled", "active"])
      .maybeSingle();

    if (eventError) {
      console.error("Event fetch error:", eventError);
      setResponseStatus(event, 500);
      return ApiResponse.serverError("Failed to fetch event");
    }

    if (!eventData) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound(
        "Event not found or is not accepting registrations"
      );
    }

    // Count current registrations
    const { count: registeredCount } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact" })
      .eq("event_id", eventId)
      .not("status", "eq", "cancelled");

    const registrationCount = registeredCount || 0;
    const maxCapacity = eventData.max_capacity || 0;
    const remainingCapacity = Math.max(0, maxCapacity - registrationCount);

    const eventDTO = {
      id: eventData.id,
      title: eventData.title,
      description: eventData.description || "",
      eventDate: eventData.event_date,
      startTime: eventData.start_time,
      endTime: eventData.end_time,
      location: eventData.location || "",
      maxCapacity,
      registrationCount,
      remainingCapacity,
      registrationDeadline: new Date(
        new Date(eventData.event_date).getTime() - 24 * 60 * 60 * 1000
      ).toISOString(), // 24 hours before event
      status: eventData.status,
      churchId: eventData.church_id,
      organizationId: eventData.organization_id,
      createdAt: eventData.created_at,
      updatedAt: eventData.updated_at,
      mobileRegLink: `${process.env.VITE_APP_URL || "http://localhost:5173"}/event-register/${eventData.id}`,
      capacityPercentage:
        maxCapacity > 0 ? Math.round(
          (registrationCount / maxCapacity) * 100
        ) : 0
    };

    setResponseStatus(event, 200);
    setResponseHeader(event, "content-type", "application/json");

    return ApiResponse.success(eventDTO, 200);
  } catch (error) {
    console.error("Event details error:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred"
    );
  }
});
