/**
 * DELETE /api/v1/organizations/:orgId/events/:eventId
 *
 * Delete an event
 * @param eventId - Event ID
 * @returns 204 No Content
 */

import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { ApiResponse } from "@/lib/api/response";
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

    // Get authenticated user
    const userId = event.context.user?.id;
    if (!userId) {
      setResponseStatus(event, 401);
      return ApiResponse.unauthorized("Authentication required");
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

    // Verify event exists and belongs to organization
    const existingEvent = await eventService.getEventById(eventId);
    if (!existingEvent) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Event not found");
    }

    if (existingEvent.organizationId !== orgId) {
      setResponseStatus(event, 403);
      return ApiResponse.forbidden("You do not have access to this event");
    }

    // Delete event
    await eventService.deleteEvent(eventId);

    // Return 204 No Content (no response body)
    setResponseStatus(event, 204);
    return null;
  } catch (error: any) {
    console.error("Error deleting event:", error);

    if (error.message?.includes("not found")) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Event not found");
    }

    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to delete event",
      "DELETE_EVENT_FAILED"
    );
  }
});
