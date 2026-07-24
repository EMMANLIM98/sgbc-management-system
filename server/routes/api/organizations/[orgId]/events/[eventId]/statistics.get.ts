/**
 * GET /api/v1/organizations/:orgId/events/:eventId/statistics
 *
 * Get event statistics and analytics
 * @param eventId - Event ID
 * @returns Event statistics including attendance, demographics, etc.
 */

import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { ApiResponse } from "@/lib/api/response";
import { EventService } from "@/modules/events/application/event.service";
import { AttendanceAnalyticsService } from "@/modules/events/application/attendance-analytics.service";
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

    // Get analytics
    const analyticsService = new AttendanceAnalyticsService(supabase);
    const metrics = await analyticsService.getEventMetrics(eventId);
    const byCategory = await analyticsService.getAttendanceByCategory(eventId);
    const byMembership = await analyticsService.getAttendanceByMembership(eventId);

    // Build statistics response
    const statistics = {
      eventId,
      eventName: existingEvent.title,
      eventDate: existingEvent.eventDate?.toISOString() || "",
      metrics: {
        totalRegistered: metrics.totalRegistered,
        totalCheckedIn: metrics.totalCheckedIn,
        attendancePercentage: metrics.attendancePercentage,
        remainingAttendees: metrics.remainingAttendees,
        capacityUtilization: existingEvent.maxCapacity
          ? Math.round((metrics.totalRegistered / existingEvent.maxCapacity) * 100)
          : null,
      },
      demographics: {
        byAgeCategory: byCategory.map((cat) => ({
          category: cat.category,
          count: cat.count,
          percentage: cat.percentage,
        })),
        byMembership: byMembership.map((m) => ({
          status: m.membership,
          count: m.count,
          percentage: m.percentage,
        })),
      },
      registration: {
        visitorCount: metrics.visitorCount,
        memberCount: metrics.memberCount,
      },
    };

    setResponseStatus(event, 200);
    return ApiResponse.success(statistics);
  } catch (error) {
    console.error("Error fetching event statistics:", error);
    setResponseStatus(event, 500);
    return ApiResponse.serverError(
      "Failed to fetch statistics",
      "FETCH_STATISTICS_FAILED"
    );
  }
});
