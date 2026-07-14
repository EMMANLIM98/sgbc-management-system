/**

- SGBC Church Management System - Event Registration & Analytics
-
- Production-Ready Implementation Guide
-
- This document explains the architecture, usage, and integration points
- for the Event Registration System with QR code check-in and analytics.
  */

// ============================================================
// ARCHITECTURE OVERVIEW
// ============================================================

/*
The Event Registration System follows Clean Architecture with DDD:

PRESENTATION LAYER (React Components)
↓
API LAYER (Server Functions - TanStack React Start)
↓
APPLICATION LAYER (Services with business logic)
↓
DOMAIN LAYER (Pure domain models)
↓
INFRASTRUCTURE LAYER (Supabase, Resend, external services)
↓
DATA LAYER (PostgreSQL with RLS)

Key Principle: Business logic is NEVER in React components.
All logic is in Application Services, called from Server Functions.
*/

// ============================================================
// EMAIL SERVICE INTEGRATION
// ============================================================

// Usage: The email service is initialized in src/lib/email/index.ts

import { emailService } from "@/lib/email";

// Send account verification email
await emailService.sendAccountVerification({
to: "user@example.com",
verificationLink: "https://app.com/verify?token=xxx",
recipientName: "John Doe",
});

// Send event registration confirmation
await emailService.sendEventRegistrationConfirmation({
to: "user@example.com",
recipientName: "John Doe",
eventName: "Sunday Service",
eventDate: "2026-07-20",
eventLocation: "Main Hall",
registrationId: "uuid-123",
});

// Send QR code via email
await emailService.sendEventQRCode({
to: "user@example.com",
recipientName: "John Doe",
eventName: "Sunday Service",
eventDate: "2026-07-20",
qrCodeImage: "data:image/png;base64,...", // Base64 encoded QR image
registrationId: "uuid-123",
});

// ============================================================
// EVENT SERVICE USAGE
// ============================================================

// Server-side only (in events.functions.ts or services)

import { EventService } from "@/modules/events/application/event.service";

// In server function handler:
const eventService = new EventService(context.supabase);

// Create event
const event = await eventService.createEvent({
churchId: "uuid",
organizationId: "uuid",
title: "Sunday Worship Service",
eventDate: "2026-07-20",
startTime: "09:00",
location: "Main Sanctuary",
maxCapacity: 500,
allowMultipleCheckins: false,
createdBy: userId,
});

// List events
const { events, total } = await eventService.listEventsByChurch(churchId, {
futureOnly: true,
limit: 50,
});

// ============================================================
// REGISTRATION SERVICE USAGE
// ============================================================

import { RegistrationService } from "@/modules/events/application/registration.service";

const registrationService = new RegistrationService(context.supabase, eventService);

// Register member for event (auto-generates QR code)
const registration = await registrationService.registerForEvent({
eventId: "uuid",
churchId: "uuid",
organizationId: "uuid",
memberId: "uuid", // optional - can be guest registration
attendeeFirstName: "John",
attendeeLastName: "Doe",
attendeeEmail: "john@example.com",
ageCategory: "adults",
visitorStatus: "member",
leadershipRole: "pastor",
createdBy: userId,
});

// Get registrations for event
const { registrations, total } = await registrationService.listRegistrationsByEvent(
eventId,
{ status: "registered", limit: 25 }
);

// Cancel registration
await registrationService.cancelRegistration(registrationId);

// ============================================================
// CHECK-IN SERVICE USAGE (QR Code Scanning)
// ============================================================

import { CheckInService } from "@/modules/events/application/checkin.service";

const checkInService = new CheckInService(context.supabase, eventService);

// Process check-in by scanning QR code
const result = await checkInService.checkIn({
qrToken: scannedToken, // From QR code - NOT a database ID
eventId: "uuid",
churchId: "uuid",
checkedInBy: userId,
deviceId: "device123",
deviceName: "iPad Pro",
location: "Main Entrance",
});

if (result.success) {
console.log(`${result.registration?.attendeeName} checked in`);
} else {
console.error(result.message); // "Already checked in", "QR expired", etc.
}

// Validate QR code without checking in (for preview)
const validation = await checkInService.validateQRCode(qrToken, eventId);

// ============================================================
// ATTENDANCE ANALYTICS SERVICE
// ============================================================

import { AttendanceAnalyticsService } from "@/modules/events/application/attendance-analytics.service";

const analyticsService = new AttendanceAnalyticsService(context.supabase);

// Get complete analytics for event
const analytics = await analyticsService.getCompleteEventAnalytics(eventId);

// Returns:
// {
// metrics: {
// eventId, eventName, eventDate,
// totalRegistered, totalCheckedIn, attendancePercentage,
// remainingAttendees, visitorCount, memberCount,
// childrenCount, youthCount, youngAdultsCount, adultsCount, seniorsCount
// },
// byCategory: [ { category, count, percentage }, ... ],
// byMembership: [ { membership, count, percentage }, ... ],
// byLeadership: [ { role, count, percentage }, ... ],
// byGender: [ { gender, count, percentage }, ... ],
// hourlyArrivals: [ { hour, count }, ... ],
// perChurch: [ { churchId, churchName, registrationCount, checkedInCount }, ... ]
// }

// Get specific analytics
const metricsOnly = await analyticsService.getEventMetrics(eventId);
const byAge = await analyticsService.getAttendanceByCategory(eventId);
const hourly = await analyticsService.getHourlyArrivals(eventId);

// Refresh materialized view (for faster queries)
await analyticsService.refreshAnalytics();

// ============================================================
// RAFFLE SERVICE
// ============================================================

import { RaffleService } from "@/modules/events/application/raffle.service";

const raffleService = new RaffleService(context.supabase);

// Add raffle entry (must be checked-in attendee)
const entryId = await raffleService.addRaffleEntry({
eventId: "uuid",
registrationId: "uuid",
churchId: "uuid",
participantName: "John Doe",
participantEmail: "john@example.com",
ageCategory: "adults",
visitorStatus: "member",
});

// Draw single winner
const winner = await raffleService.drawWinner(
eventId,
"iPad Pro",
userId,
{ ageCategory: "adults" } // Optional filter
);

// Draw multiple winners
const winners = await raffleService.drawMultipleWinners(
eventId,
[
{ name: "iPad Pro", count: 1 },
{ name: "$50 Gift Card", count: 3 },
{ name: "Free Registration", count: 5 },
],
userId
);

// Get raffle winners
const draws = await raffleService.getRaffleWinners(eventId);

// ============================================================
// SERVER FUNCTIONS (FROM CLIENT)
// ============================================================

// Import server functions
import {
listEvents,
getEvent,
createEvent,
registerForEvent,
getEventRegistrations,
checkInWithQR,
validateQRCode,
getEventAnalytics,
getAttendanceMetrics,
drawRaffleWinner,
getRaffleWinners,
} from "@/modules/events/events.functions";

// Usage in React component (client-side):
const { data: events } = await listEvents.useQuery({
queryKey: ["events"],
queryFn: () => listEvents({ churchId: null }),
});

// Register for event
const result = await registerForEvent({
eventId: "uuid",
churchId: "uuid",
organizationId: "uuid",
attendeeFirstName: "John",
attendeeLastName: "Doe",
attendeeEmail: "john@example.com",
ageCategory: "adults",
});

// ============================================================
// QR CODE GENERATION
// ============================================================

/*
QR codes are generated automatically when registrations are created.
The token is a secure random string (not a database ID).

To display QR codes in UI:

1. Install: npm install qrcode.react
2. Import: import QRCode from "qrcode.react"
3. Use: <QRCode value={qrToken} size={256} level="H" />

To scan QR codes:

1. Install: npm install @react-qr-code/core
2. Use QR code scanner component (see UI components)
3. Pass scanned token to checkInWithQR server function
   */

// ============================================================
// SECURITY CONSIDERATIONS
// ============================================================

/*
✅ QR Code Security:

- Token is random, not database ID
- Cannot guess or reverse-engineer
- Single use (unless event allows multiple)
- Can expire

✅ Access Control:

- Row-level security on all tables
- Users only see their church data
- Role-based permissions enforced

✅ Data Validation:

- Server-side validation (Zod)
- Type checking (TypeScript)
- Business logic validation

✅ Audit Trail:

- All check-ins logged
- User/device/location recorded
- Draw history maintained
  */

// ============================================================
// DATABASE QUERIES
// ============================================================

// Raw Supabase query (if needed):
// Note: Most queries should go through Services, not directly

const { data: registrations } = await supabase
.from("event_registrations")
.select("*")
.eq("event_id", eventId)
.eq("status", "checked_in");

// ============================================================
// ERROR HANDLING
// ============================================================

/*
All services throw descriptive errors:

- "Event not found"
- "Event is not accepting registrations"
- "Member is already registered for this event"
- "Event is at maximum capacity"
- "Invalid QR code"
- "QR code has expired"
- "Already checked in"

Handle in server functions with try/catch:
*/

try {
await checkInService.checkIn(input);
} catch (error) {
throw new Error(error instanceof Error ? error.message : "Check-in failed");
}

// ============================================================
// TESTING CONSIDERATIONS
// ============================================================

/*
Services are testable because:

1. Pure domain models with no side effects
2. Dependency injection via constructor
3. Mockable Supabase client
4. Clear input/output contracts

Example test setup:

```
const mockSupabase = createMockSupabaseClient();
const eventService = new EventService(mockSupabase);
const event = await eventService.getEventById("test-id");
expect(event).toBeDefined();
```

*/

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

/*
Required in .env.local:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- RESEND_API_KEY
- EMAIL_FROM_ADDRESS (optional, defaults to noreply@sgbcmanagement.com)
  */

// ============================================================
// MIGRATION & DEPLOYMENT
// ============================================================

/*

1. Run database migration:
   $ supabase migration up

2. Install Resend dependency:
   $ npm install resend

3. Set environment variables in production

4. Build and deploy:
   $ npm run build
   $ npm run preview
   */
