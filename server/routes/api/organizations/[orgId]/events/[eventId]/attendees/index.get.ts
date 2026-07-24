/**
 * GET /api/v1/organizations/:orgId/events/:eventId/attendees
 *
 * List all attendees/registrations for an event with pagination
 * @param eventId - Event ID
 * @queryParam page - Page number (default: 1)
 * @queryParam pageSize - Items per page (default: 20, max: 100)
 * @queryParam status - Filter by registration status (registered|checked_in|no_show|cancelled)
 * @returns Paginated list of EventRegistrationDTO
 */

import { defineEventHandler, getRouterParam, getQuery, setResponseStatus } from "h3";
import { paginationQuerySchema, extractValidationErrors } from "@/lib/api/request-schemas";
import { ApiResponse } from "@/lib/api/response";
import { EventService } from "@/modules/events/application/event.service";
import { RegistrationService } from "@/modules/events/application/registration.service";
import { toEventRegistrationDTO } from "@/lib/api/dto/events.dto";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

// Extended pagination schema with filters
const listAttendeesSchema = paginationQuerySchema.extend({
  status: z.enum(["registered", "checked_in", "no_show", "cancelled"]).optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const eventId = getRouterParam(event, "eventId");

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      setResponseStatus(event, 400);
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!eventId || typeof eventId !== "string") {
      setResponseStatus(event, 400);
      return ApiResponse.badRequest("Event ID is required");
    }

    // Get and validate query parameters
    const queryParams = getQuery(event);
    const validation = listAttendeesSchema.safeParse({
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize as string) : 20,
      sortBy: queryParams.sortBy || "registeredAt",
      order: queryParams.order || "desc",
      status: queryParams.status,
    });

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(errors, "Invalid query parameters");
    }

    const { page, pageSize, status } = validation.data;

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

    // Get events service to verify event exists
    const eventService = new EventService(supabase);
    const existingEvent = await eventService.getEventById(eventId);

    if (!existingEvent) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Event not found");
    }

    if (existingEvent.organizationId !== orgId) {
      setResponseStatus(event, 403);
      return ApiResponse.forbidden("You do not have access to this event");
    }

    // Get registrations
    const registrationService = new RegistrationService(supabase, eventService);
    const { registrations, total } = await registrationService.listRegistrationsByEvent(eventId, {
      status: status as any,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // Convert to DTOs
    const registrationDTOs = registrations.map(toEventRegistrationDTO);

    // Calculate pagination info
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    setResponseStatus(event, 200);
    return ApiResponse.paginated(registrationDTOs, {
      total,
      count: registrationDTOs.length,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    });
  } catch (error) {
    console.error("Error listing attendees:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to fetch attendees",
      "FETCH_ATTENDEES_FAILED"
    );
  }
});
