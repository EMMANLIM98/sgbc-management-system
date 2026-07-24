/**
 * POST /api/v1/organizations/:orgId/events
 *
 * Create a new event for the organization
 * @body EventCreateRequest with title, description, date, location, etc.
 * @returns 201 Created with EventDTO
 */

import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { ApiResponse, extractValidationErrors } from "@/lib/api/request-schemas";
import { toEventDTO } from "@/lib/api/dto/events.dto";
import { EventService } from "@/modules/events/application/event.service";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

// Event creation schema
const createEventSchema = z.object({
  churchId: z.string().uuid("Invalid church ID format"),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  eventDate: z.string().datetime("Invalid date format"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(500, "Location must be 500 characters or less").optional(),
  maxCapacity: z.number().int().positive("Capacity must be positive").optional(),
  allowMultipleCheckins: z.boolean().default(false),
});

type CreateEventRequest = z.infer<typeof createEventSchema>;

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      setResponseStatus(event, 400);
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Get authenticated user
    const userId = event.context.user?.id;
    if (!userId) {
      setResponseStatus(event, 401);
      return ApiResponse.unauthorized("Authentication required");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(errors, "Invalid event data");
    }

    const eventData = validation.data as CreateEventRequest;

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

    // Create event
    const createdEvent = await eventService.createEvent({
      churchId: eventData.churchId,
      organizationId: orgId,
      title: eventData.title,
      description: eventData.description,
      eventDate: eventData.eventDate,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      location: eventData.location,
      maxCapacity: eventData.maxCapacity,
      allowMultipleCheckins: eventData.allowMultipleCheckins,
      createdBy: userId,
    });

    // Convert to DTO
    const eventDTO = toEventDTO(createdEvent);

    // Set response headers
    setResponseStatus(event, 201);
    setHeader(event, "Location", `/api/v1/organizations/${orgId}/events/${createdEvent.id}`);

    return ApiResponse.created(eventDTO);
  } catch (error: any) {
    console.error("Error creating event:", error);

    // Handle specific error cases
    if (error.message?.includes("not found")) {
      setResponseStatus(event, 404);
      return ApiResponse.notFound("Church or organization not found");
    }

    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to create event",
      "CREATE_EVENT_FAILED"
    );
  }
});

function setHeader(event: any, name: string, value: string) {
  event.node.res.setHeader(name, value);
}
