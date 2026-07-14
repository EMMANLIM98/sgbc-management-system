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
    .enum([
      "pastor",
      "pastor_wife",
      "pastor_children",
      "associate_pastor",
      "elder",
      "deacon",
      "deaconess",
      "preacher",
      "evangelist",
      "ministry_leader",
      "none",
    ])
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

// ============ EVENT FUNCTIONS ============

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    scopeSchema.extend({ futureOnly: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const churchId = data.churchId || undefined;

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
    };
  });

export const getEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const event = await eventService.getEventById(data.id);

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

    const event = await eventService.createEvent({
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
      createdBy: context.supabase.auth.session()?.user.id || "",
    });

    return { id: event.id, message: "Event created successfully" };
  });

// ============ REGISTRATION FUNCTIONS ============

export const registerForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registerForEventSchema.parse(d))
  .handler(async ({ context, data }) => {
    const eventService = new EventService(context.supabase);
    const registrationService = new RegistrationService(context.supabase, eventService);

    const registration = await registrationService.registerForEvent({
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
      createdBy: context.supabase.auth.session()?.user.id || "",
    });

    return { id: registration.id, message: "Registration successful" };
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

    return {
      registrations: registrations.map((r) => ({
        id: r.id,
        name: r.attendeeName,
        email: r.attendeeEmail,
        phone: r.attendeePhone,
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
      checkedInBy: context.supabase.auth.session()?.user.id || "",
      deviceId: data.deviceId || undefined,
      deviceName: data.deviceName || undefined,
      location: data.location || undefined,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    return {
      success: true,
      message: result.message,
      attendeeName: result.registration?.attendeeName,
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
      context.supabase.auth.session()?.user.id || "",
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
        prizeName: w.prizeName,
        drawnAt: w.drawnAt.toISOString(),
        drawnBy: w.drawnBy,
      })),
    };
  });
