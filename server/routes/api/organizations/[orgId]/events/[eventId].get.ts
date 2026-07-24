/**
 * GET /api/v1/organizations/:orgId/events/:eventId
 *
 * Get detailed information about a specific event
 * @param eventId - Event ID
 * @returns EventDetailDTO with full details and statistics
 */

import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { ApiResponse } from "@/lib/api/response";
import { toEventDetailDTO } from "@/lib/api/dto/events.dto";
import { EventService } from "@/modules/events/application/event.service";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

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

    // Fetch event
    const foundEvent = await eventService.getEventById(eventId);

    if (!foundEvent) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Event not found");
    }

    // Verify event belongs to organization
    if (foundEvent.organizationId !== orgId) {
      setResponseStatus(event, 403);
      return ApiResponse.forbidden("You do not have access to this event");
    }

    // Get registration count for statistics
    const registrationCount = await eventService.getRegistrationCount(eventId);

    // Convert to detail DTO
    const eventDTO = toEventDetailDTO(foundEvent, {
      registrationCount,
    });

    setResponseStatus(event, 200);
    return ApiResponse.success(eventDTO);
  } catch (error) {
    console.error("Error fetching event:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to fetch event",
      "FETCH_EVENT_FAILED"
    );
  }
});
