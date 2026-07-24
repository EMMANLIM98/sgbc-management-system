/**
 * REST API v1 - List Public Events
 *
 * Endpoint: GET /api/v1/events
 * Description: Retrieve all public/active events
 * Authentication: None (public)
 *
 * Query Parameters:
 *   - page: number (default 1, min 1)
 *   - pageSize: number (default 10, min 1, max 100)
 *   - fromDate: ISO date string (optional)
 *   - status: "scheduled" | "active" (optional)
 *   - sortBy: "eventDate" | "title" (default eventDate)
 *   - order: "asc" | "desc" (default asc)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { ApiResponse, calculatePagination } from "@/lib/api/response";
import { eventListQuerySchema, extractValidationErrors } from "@/lib/api/request-schemas";

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
    // Parse and validate query parameters
    const query = getQuery(event);
    const validation = eventListQuerySchema.safeParse(query);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        details,
        "Invalid query parameters"
      );
    }

    const params = validation.data;
    const supabase = createAdminClient();
    const fromDate =
      params.fromDate || new Date().toISOString().split("T")[0];
    const offset = (params.page - 1) * params.pageSize;
    const sortOrder = params.order === "desc" ? false : true;

    // Fetch events with count
    let query_builder = supabase
      .from("events")
      .select(
        "id, title, description, event_date, start_time, end_time, location, max_capacity, status, church_id, organization_id, created_at, updated_at",
        { count: "exact" }
      )
      .in("status", params.status ? [params.status] : ["scheduled", "active"])
      .gte("event_date", fromDate)
      .order(params.sortBy === "title" ? "title" : "event_date", {
        ascending: sortOrder
      })
      .range(offset, offset + params.pageSize - 1);

    const { data: events, error, count: total } = await query_builder;

    if (error) {
      console.error("Events query error:", error);
      setResponseStatus(event, 500);
      return ApiResponse.error(
        new Error(error.message || "Failed to load events"),
        500
      );
    }

    // Map to response format
    const eventDTOs = (events ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description || "",
      eventDate: e.event_date,
      startTime: e.start_time,
      endTime: e.end_time,
      location: e.location || "",
      maxCapacity: e.max_capacity || 0,
      status: e.status,
      churchId: e.church_id,
      organizationId: e.organization_id,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    const pagination = calculatePagination(
      total || 0,
      params.page,
      params.pageSize
    );

    setResponseStatus(event, 200);
    setResponseHeader(event, "content-type", "application/json");

    return ApiResponse.paginated(eventDTOs, pagination, 200);
  } catch (error) {
    console.error("Events list error:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred"
    );
  }
});
