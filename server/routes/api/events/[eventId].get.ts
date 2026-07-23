/**
 * Mobile REST API - Get Event Details
 * 
 * Endpoint: GET /api/events/:eventId
 * Description: Retrieve full details for a specific event
 * Authentication: None (public)
 * 
 * Response includes:
 *   - Event details
 *   - Current registration count
 *   - Remaining capacity
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

    const supabase = createAdminClient();

    // Fetch event
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, title, description, event_date, start_time, end_time, location, max_capacity, status, church_id, organization_id")
      .eq("id", eventId)
      .in("status", ["scheduled", "active"])
      .maybeSingle();

    if (eventError) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "Failed to fetch event",
        message: eventError.message,
      };
    }

    if (!eventData) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: "Event not found or is not accepting registrations",
      };
    }

    // Count current registrations
    const { count: registered } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact" })
      .eq("event_id", eventId)
      .not("status", "eq", "cancelled");

    const remaining =
      eventData.max_capacity != null ? Math.max(0, eventData.max_capacity - (registered || 0)) : null;

    setResponseHeader(event, "content-type", "application/json");
    return {
      success: true,
      data: {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        eventDate: eventData.event_date,
        startTime: eventData.start_time,
        endTime: eventData.end_time,
        location: eventData.location,
        maxCapacity: eventData.max_capacity,
        registeredCount: registered || 0,
        remainingCapacity: remaining,
        status: eventData.status,
        churchId: eventData.church_id,
        organizationId: eventData.organization_id,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setResponseStatus(event, 500);
    return {
      success: false,
      error: "Internal server error",
      message,
    };
  }
});
