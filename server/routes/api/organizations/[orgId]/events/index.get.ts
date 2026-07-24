/**
 * GET /api/v1/organizations/:orgId/events
 *
 * List all events for an organization with pagination and filters
 * @queryParam page - Page number (default: 1)
 * @queryParam pageSize - Items per page (default: 20, max: 100)
 * @queryParam status - Filter by status (scheduled|active|completed|cancelled)
 * @queryParam futureOnly - Filter to future events only (default: true)
 * @queryParam sortBy - Sort field (eventDate|title|createdAt)
 * @queryParam order - Sort order (asc|desc)
 * @returns Paginated list of EventDTO
 */

import { defineEventHandler, getQuery, setResponseStatus } from "h3";
import { paginationQuerySchema, extractValidationErrors } from "@/lib/api/request-schemas";
import { ApiResponse } from "@/lib/api/response";
import { EventService } from "@/modules/events/application/event.service";
import { toEventDTO } from "@/lib/api/dto/events.dto";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

// Extended pagination schema with event-specific filters
const listEventsSchema = paginationQuerySchema.extend({
  status: z.enum(["scheduled", "active", "completed", "cancelled"]).optional(),
  futureOnly: z.boolean().default(true),
});

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      setResponseStatus(event, 400);
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Get and validate query parameters
    const queryParams = getQuery(event);
    const validation = listEventsSchema.safeParse({
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize as string) : 20,
      sortBy: queryParams.sortBy || "eventDate",
      order: queryParams.order || "asc",
      status: queryParams.status,
      futureOnly: queryParams.futureOnly !== "false",
    });

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(errors, "Invalid query parameters");
    }

    const { page, pageSize, sortBy, order, status, futureOnly } = validation.data;

    // Validate pagination
    if (page < 1) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        { page: "Page must be at least 1" },
        "Invalid pagination"
      );
    }

    if (pageSize < 1 || pageSize > 100) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        { pageSize: "Page size must be between 1 and 100" },
        "Invalid page size"
      );
    }

    // Create Supabase client
    const supabase = createServerClient<Database>(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll: () => event.node.req.headers.cookie?.split("; ").map(c => {
            const [key, value] = c.split("=");
            return { name: key, value };
          }) || [],
          setAll: () => {},
        },
      }
    );

    // Get events service
    const eventService = new EventService(supabase);

    // Fetch events with options
    const { events, total } = await eventService.listEventsByChurch(orgId, {
      status: status as any,
      futureOnly,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // Convert to DTOs
    const eventDTOs = events.map(toEventDTO);

    // Calculate pagination info
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    setResponseStatus(event, 200);
    return ApiResponse.paginated(eventDTOs, {
      total,
      count: eventDTOs.length,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    });
  } catch (error) {
    console.error("Error listing events:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to fetch events",
      "FETCH_EVENTS_FAILED"
    );
  }
});
