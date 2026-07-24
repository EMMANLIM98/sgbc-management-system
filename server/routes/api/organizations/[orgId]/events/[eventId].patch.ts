/**
 * PATCH /api/v1/organizations/:orgId/events/:eventId
 *
 * Update an event (partial update allowed)
 * @param eventId - Event ID
 * @body Partial EventUpdateRequest
 * @returns 200 OK with updated EventDTO
 */

import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { ApiResponse, extractValidationErrors } from "@/lib/api/request-schemas";
import { toEventDTO } from "@/lib/api/dto/events.dto";
import { EventService } from "@/modules/events/application/event.service";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

// Event update schema (all fields optional for PATCH)
const updateEventSchema = z.object({
  title: z.string().min(1, "Title must not be empty").max(200, "Title must be 200 characters or less").optional(),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  eventDate: z.string().datetime("Invalid date format").optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(500, "Location must be 500 characters or less").optional(),
  maxCapacity: z.number().int().positive("Capacity must be positive").optional(),
  status: z.enum(["draft", "scheduled", "active", "completed", "cancelled"]).optional(),
  allowMultipleCheckins: z.boolean().optional(),
});

type UpdateEventRequest = z.infer<typeof updateEventSchema>;

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

    // Read and validate request body
    const body = await readBody(event);
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(errors, "Invalid update data");
    }

    const updateData = validation.data as UpdateEventRequest;

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        { body: "At least one field must be updated" },
        "No fields to update"
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

    // Update event
    const updatedEvent = await eventService.updateEvent({
      id: eventId,
      title: updateData.title,
      description: updateData.description,
      eventDate: updateData.eventDate,
      startTime: updateData.startTime,
      endTime: updateData.endTime,
      location: updateData.location,
      maxCapacity: updateData.maxCapacity,
      status: updateData.status as any,
      allowMultipleCheckins: updateData.allowMultipleCheckins,
    });

    // Convert to DTO
    const eventDTO = toEventDTO(updatedEvent);

    setResponseStatus(event, 200);
    return ApiResponse.success(eventDTO);
  } catch (error: any) {
    console.error("Error updating event:", error);

    if (error.message?.includes("not found")) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Event not found");
    }

    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to update event",
      "UPDATE_EVENT_FAILED"
    );
  }
});
