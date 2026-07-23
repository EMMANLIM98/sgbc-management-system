/**
 * Mobile REST API - List Public Events
 * 
 * Endpoint: GET /api/events
 * Description: Retrieve all public/active events for mobile apps
 * Authentication: None (public)
 * 
 * Query Parameters:
 *   - limit: number (1-100, default 50)
 *   - offset: number (default 0)
 *   - fromDate: ISO date string (optional)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  fromDate: z.string().datetime().optional(),
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
    // Parse query parameters
    const query = getQuery(event);
    const params = querySchema.parse(query);

    const supabase = createAdminClient();
    const fromDate = params.fromDate || new Date().toISOString().split("T")[0];

    // Fetch events
    const { data: events, error } = await supabase
      .from("events")
      .select("id, title, description, event_date, start_time, end_time, location, max_capacity, status")
      .in("status", ["scheduled", "active"])
      .gte("event_date", fromDate)
      .order("event_date", { ascending: true })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "Failed to load events",
        message: error.message,
      };
    }

    // Get total count
    const { count: total } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "active"])
      .gte("event_date", fromDate);

    setResponseHeader(event, "content-type", "application/json");
    return {
      success: true,
      data: {
        events: (events ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          eventDate: e.event_date,
          startTime: e.start_time,
          endTime: e.end_time,
          location: e.location,
          maxCapacity: e.max_capacity,
          status: e.status,
        })),
        pagination: {
          total: total ?? 0,
          limit: params.limit,
          offset: params.offset,
          hasMore: (params.offset + params.limit) < (total ?? 0),
        },
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
