/**
 * Event Module Server Functions
 *
 * TanStack React Start server functions for event management, registration, check-in, and analytics.
 * These functions bridge the frontend UI with the application services.
 * Architecture Layer: API
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EventService } from "@/modules/events/application/event.service";
import { RegistrationService } from "@/modules/events/application/registration.service";
import { CheckInService } from "@/modules/events/application/checkin.service";
import { AttendanceAnalyticsService } from "@/modules/events/application/attendance-analytics.service";
import { RaffleService } from "@/modules/events/application/raffle.service";
import { emailService } from "@/lib/email";
import { LeadershipRoleType, leadershipRoles } from "@/lib/domain/leadership-roles";

function isEventsSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table 'public.events'") ||
    normalized.includes('relation "events" does not exist') ||
    normalized.includes('relation "Events" does not exist'.toLowerCase()) ||
    normalized.includes("events table not found") ||
    normalized.includes("schema cache")
  );
}

function getEventsSetupMessage(): string {
  return 'Events table is not reachable as public.events. Verify this app points to the correct Supabase project and that the table is named exactly public.events (or public."Events").';
}

// ============ SCHEMAS ============

const scopeSchema = z.object({
  churchId: z.string().uuid().nullable().optional(),
});

const createEventSchema = z.object({
  churchId: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  eventDate: z.string(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  maxCapacity: z.number().int().positive().nullable().optional(),
  allowMultipleCheckins: z.boolean().default(false),
});

const registerForEventSchema = z.object({
  eventId: z.string().uuid(),
  churchId: z.string().uuid(),
  organizationId: z.string().uuid(),
  memberId: z.string().uuid().nullable().optional(),
  attendeeFirstName: z.string().min(1).max(80),
  attendeeLastName: z.string().min(1).max(80),
  attendeeEmail: z.string().email().nullable().optional(),
  attendeePhone: z.string().max(40).nullable().optional(),
  ageCategory: z
    .enum(["children", "youth", "young_adults", "adults", "seniors"])
    .nullable()
    .optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  visitorStatus: z.enum(["member", "visitor", "first_time_guest"]).nullable().optional(),
  leadershipRole: z
    .custom<LeadershipRoleType>((val) => leadershipRoles.isValid(val))
    .nullable()
    .optional(),
});

const checkInSchema = z.object({
  qrToken: z.string(),
  eventId: z.string().uuid(),
  churchId: z.string().uuid(),
  deviceId: z.string().nullable().optional(),
  deviceName: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

const raffleFilterSchema = z.object({
  churchId: z.string().uuid().optional(),
  ageCategory: z.enum(["children", "youth", "young_adults", "adults", "seniors"]).optional(),
  visitorStatus: z.enum(["member", "visitor", "first_time_guest"]).optional(),
  leadershipRole: z
    .custom<LeadershipRoleType>((val) => leadershipRoles.isValid(val))
    .optional(),
  excludePreviousWinners: z.boolean().optional(),
});

// ============ EVENT FUNCTIONS ============

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scopeSchema.extend({ futureOnly: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const churchId = data.churchId || undefined;

    try {
      const { events, total } = await eventService.listEventsByChurch(churchId, {
        futureOnly: data.futureOnly,
        limit: 50,
      });

      return {
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          eventDate: e.eventDate.toISOString(),
          location: e.location,
          status: e.status,
        })),
        total,
        setupRequired: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list events";
      const setupRequired = isEventsSchemaMissingError(message);

      if (setupRequired) {
        return {
          events: [],
          total: 0,
          setupRequired: true,
          setupMessage: getEventsSetupMessage(),
        };
      }

      throw error;
    }
  });

export const getEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    let event;
    try {
      event = await eventService.getEventById(data.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch event";
      if (isEventsSchemaMissingError(message)) {
        throw new Error(getEventsSetupMessage());
      }
      throw error;
    }

    if (!event) {
      throw new Error("Event not found");
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      maxCapacity: event.maxCapacity,
      status: event.status,
      allowMultipleCheckins: event.allowMultipleCheckins,
    };
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createEventSchema.parse(d))
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);

    let event;
    try {
      event = await eventService.createEvent({
        churchId: data.churchId,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description || undefined,
        eventDate: data.eventDate,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        location: data.location || undefined,
        maxCapacity: data.maxCapacity || undefined,
        allowMultipleCheckins: data.allowMultipleCheckins,
        createdBy: context.userId || "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create event";
      if (isEventsSchemaMissingError(message)) {
        throw new Error(getEventsSetupMessage());
      }
      throw error;
    }

    return { id: event.id, message: "Event created successfully" };
  });

// ============ REGISTRATION FUNCTIONS ============

export const registerForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registerForEventSchema.parse(d))
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const registrationService = new RegistrationService(context.supabase, eventService);

    const { registration, qrCode } = await registrationService.registerForEvent({
      eventId: data.eventId,
      churchId: data.churchId,
      organizationId: data.organizationId,
      memberId: data.memberId || undefined,
      attendeeFirstName: data.attendeeFirstName,
      attendeeLastName: data.attendeeLastName,
      attendeeEmail: data.attendeeEmail || undefined,
      attendeePhone: data.attendeePhone || undefined,
      ageCategory: data.ageCategory || undefined,
      sex: data.sex || undefined,
      visitorStatus: (data.visitorStatus as any) || undefined,
      leadershipRole: (data.leadershipRole as any) || undefined,
      createdBy: context.userId || "",
    });

    // Send confirmation emails if email is provided
    if (data.attendeeEmail) {
      try {
        // Get event details for email
        const event = await eventService.getEventById(data.eventId);
        if (event) {
          // Send registration confirmation email
          await emailService.sendEventRegistrationConfirmation({
            to: data.attendeeEmail,
            recipientName: `${data.attendeeFirstName} ${data.attendeeLastName}`,
            eventName: event.title,
            eventDate: event.eventDate.toISOString().split("T")[0],
            eventLocation: event.location || "",
            registrationId: registration.id,
          });

          // Send QR code email
          await emailService.sendEventQRCode({
            to: data.attendeeEmail,
            recipientName: `${data.attendeeFirstName} ${data.attendeeLastName}`,
            eventName: event.title,
            eventDate: event.eventDate.toISOString().split("T")[0],
            qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode.token)}`,
            registrationId: registration.id,
          });
        }
      } catch (emailError) {
        // Log email error but don't fail the registration
        console.error("Failed to send confirmation emails:", emailError);
      }
    }

    return {
      id: registration.id,
      attendeeName: registration.attendeeName,
      message: "Registration successful",
      qrToken: qrCode.token,
    };
  });

export const getEventRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        status: z.enum(["registered", "checked_in", "cancelled", "no_show"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const registrationService = new RegistrationService(context.supabase, eventService);

    const from = (data.page - 1) * data.pageSize;
    const { registrations, total } = await registrationService.listRegistrationsByEvent(
      data.eventId,
      {
        status: data.status,
        limit: data.pageSize,
        offset: from,
      },
    );

    // Fetch church names for all unique church IDs
    const churchIds = [...new Set(registrations.map((r) => r.churchId))];
    let churchNames: { [key: string]: string } = {};

    if (churchIds.length > 0) {
      try {
        const { data: churches, error: churchesError } = await context.supabase
          .from("churches")
          .select("id, name")
          .in("id", churchIds);

        if (churchesError) {
          console.warn("Warning: Could not fetch church names, will use fallback:", churchesError);
        } else if (churches && churches.length > 0) {
          churchNames = Object.fromEntries(churches.map((c: any) => [c.id, c.name]));
        }
      } catch (error) {
        console.warn("Warning: Error fetching church names:", error);
        // Continue without church names - they'll show as "Unknown Church"
      }
    }

    return {
      registrations: registrations.map((r) => ({
        id: r.id,
        name: r.attendeeName,
        email: r.attendeeEmail,
        phone: r.attendeePhone,
        churchId: r.churchId,
        churchName: churchNames[r.churchId] || "Unknown Church",
        status: r.status,
        isCheckedIn: r.isCheckedIn(),
        ageCategory: r.ageCategory,
        visitorStatus: r.visitorStatus,
      })),
      total,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

/**
 * Get all registrations for an event regardless of status (for reporting/export)
 */
export const getAllEventRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const registrationService = new RegistrationService(context.supabase, eventService);

    // Get all registrations without status filter (limit to 1000 for export)
    const { registrations, total } = await registrationService.listRegistrationsByEvent(
      data.eventId,
      {
        limit: 1000,
        offset: 0,
      },
    );

    return {
      registrations: registrations.map((r) => ({
        id: r.id,
        name: r.attendeeName,
        email: r.attendeeEmail,
        phone: r.attendeePhone,
        churchId: r.churchId,
        status: r.status,
        ageCategory: r.ageCategory,
        sex: r.sex,
        visitorStatus: r.visitorStatus,
        leadershipRole: r.leadershipRole,
        registeredAt: r.registeredAt,
        checkedInAt: r.checkedInAt,
      })),
      total,
    };
  });

// ============ CHECK-IN FUNCTIONS ============

export const checkInWithQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkInSchema.parse(d))
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const checkInService = new CheckInService(context.supabase, eventService);

    const result = await checkInService.checkIn({
      qrToken: data.qrToken,
      eventId: data.eventId,
      churchId: data.churchId,
      checkedInBy: context.userId || "",
      deviceId: data.deviceId || undefined,
      deviceName: data.deviceName || undefined,
      location: data.location || undefined,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    // Send attendance confirmation email
    if (result.registration?.attendeeEmail) {
      try {
        const event = await eventService.getEventById(data.eventId);
        if (event) {
          await emailService.sendAttendanceConfirmation({
            to: result.registration.attendeeEmail,
            recipientName: result.registration.attendeeName,
            eventName: event.title,
            checkInTime: result.checkedInAt || new Date().toISOString(),
            churchName: event.location || "Church",
          });
        }
      } catch (emailError) {
        // Log email error but don't fail the check-in
        console.error("Failed to send attendance confirmation email:", emailError);
      }
    }

    return {
      success: true,
      message: result.message,
      attendeeName: result.registration?.attendeeName,
      checkedInAt: result.checkedInAt,
    };
  });

export const validateQRCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ qrToken: z.string(), eventId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const checkInService = new CheckInService(context.supabase, eventService);

    const result = await checkInService.validateQRCode(data.qrToken, data.eventId);

    return result;
  });

// ============ ANALYTICS FUNCTIONS ============

export const getEventAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const analyticsService = new AttendanceAnalyticsService(context.supabase);

    const analytics = await analyticsService.getCompleteEventAnalytics(data.eventId);

    return {
      metrics: analytics.metrics,
      byCategory: analytics.byCategory,
      byMembership: analytics.byMembership,
      byLeadership: analytics.byLeadership,
      byGender: analytics.byGender,
      hourlyArrivals: analytics.hourlyArrivals,
      perChurch: analytics.perChurch,
    };
  });

export const getAttendanceMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const analyticsService = new AttendanceAnalyticsService(context.supabase);

    const metrics = await analyticsService.getEventMetrics(data.eventId);

    if (!metrics) {
      throw new Error("Analytics not found");
    }

    return metrics;
  });

// ============ RAFFLE FUNCTIONS ============

export const drawRaffleWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        prizeName: z.string().min(1).max(200),
        ageCategory: z.enum(["children", "youth", "young_adults", "adults", "seniors"]).optional(),
        visitorStatus: z.enum(["member", "visitor", "first_time_guest"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const raffleService = new RaffleService(context.supabase);

    const winner = await raffleService.drawWinner(
      data.eventId,
      data.prizeName,
      context.userId || "",
      {
        ageCategory: data.ageCategory,
        visitorStatus: data.visitorStatus as any,
      },
    );

    if (!winner) {
      throw new Error("No eligible entries for raffle");
    }

    return {
      winnerId: winner.winnerId,
      participantName: winner.participantName,
      participantEmail: winner.participantEmail,
      prizeName: winner.prizeName,
      message: `${winner.participantName} won ${winner.prizeName}!`,
    };
  });

export const getRaffleWinners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const raffleService = new RaffleService(context.supabase);

    const winners = await raffleService.getRaffleWinners(data.eventId);

    return {
      winners: winners.map((w) => ({
        id: w.id,
        participantName: w.participantName,
        participantEmail: w.participantEmail,
        prizeName: w.prizeName,
        drawnAt: w.drawnAt.toISOString(),
        drawnBy: w.drawnBy,
      })),
    };
  });

export const populateRaffleEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        filter: raffleFilterSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const raffleService = new RaffleService(context.supabase);
    const added = await raffleService.populateRaffleFromEvent(data.eventId, {
      ageCategory: data.filter?.ageCategory as any,
      visitorStatus: data.filter?.visitorStatus as any,
      leadershipRole: data.filter?.leadershipRole as any,
      excludePreviousWinners: data.filter?.excludePreviousWinners,
    });

    return {
      added,
      message: `${added} raffle entries populated`,
    };
  });

export const drawMultipleRaffleWinners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        prizes: z.array(z.object({ name: z.string().min(1), count: z.number().int().min(1) })),
        filter: raffleFilterSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const raffleService = new RaffleService(context.supabase);
    const winners = await raffleService.drawMultipleWinners(
      data.eventId,
      data.prizes,
      context.userId || "",
      {
        ageCategory: data.filter?.ageCategory as any,
        visitorStatus: data.filter?.visitorStatus as any,
        leadershipRole: data.filter?.leadershipRole as any,
        excludePreviousWinners: true,
      },
    );

    return {
      winners,
      totalWinners: winners.length,
    };
  });

export const rerollRaffleWinners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        prizeName: z.string().min(1),
        count: z.number().int().min(1).default(1),
        filter: raffleFilterSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const raffleService = new RaffleService(context.supabase);
    const winners = await raffleService.rerollWinners(
      data.eventId,
      data.prizeName,
      data.count,
      context.userId || "",
      {
        ageCategory: data.filter?.ageCategory as any,
        visitorStatus: data.filter?.visitorStatus as any,
        leadershipRole: data.filter?.leadershipRole as any,
        excludePreviousWinners: true,
      },
    );

    return {
      winners,
      totalWinners: winners.length,
      message: `Re-rolled ${winners.length} winner(s) for ${data.prizeName}`,
    };
  });
