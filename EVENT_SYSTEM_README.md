# SGBC Church Management System - Event Registration & Analytics System

## 🎯 Project Status: PHASE 1 COMPLETE ✅

### Phase 1: Foundation (Completed)

- ✅ Email Service Infrastructure (Resend)
- ✅ Event Registration Database Schema
- ✅ Domain Models (DDD Pattern)
- ✅ Application Services (Clean Architecture)
- ✅ Server Functions (API Layer)
- ✅ QR Code System (Secure Tokens)
- ✅ Check-In System (Validation Logic)
- ✅ Analytics Engine (Real-time Metrics)
- ✅ Raffle System (Drawing Logic)

**Build Status:** ✅ No errors, production-ready code

---

## 🏗️ Architecture

### Layer Structure

```
PRESENTATION (React Components)
        ↓
API (TanStack Server Functions)
        ↓
APPLICATION (Business Services)
        ↓
DOMAIN (Pure Models - DDD)
        ↓
INFRASTRUCTURE (Supabase, Resend)
        ↓
DATABASE (PostgreSQL + RLS)
```

### Core Principles

- **Clean Architecture**: Separation of concerns across layers
- **Domain-Driven Design**: Business logic in domain models
- **Dependency Injection**: Loose coupling, high testability
- **Security First**: QR codes use secure tokens (not IDs), RLS enforced
- **SOLID Principles**: Applied throughout

---

## 📧 Email Service

### Features Implemented

1. Account Verification
2. Welcome Email
3. Password Reset
4. Email Change Confirmation
5. Event Registration Confirmation
6. QR Code Delivery
7. Event Reminders
8. Attendance Confirmation
9. Raffle Winner Notification
10. Church Announcements
11. Bulk Email Support

### Files

- `src/integrations/resend/resend-client.ts` - Resend SDK
- `src/integrations/resend/types.ts` - Email types
- `src/lib/email/email-service.interface.ts` - Abstract interface
- `src/lib/email/email-templates.ts` - HTML email templates
- `src/lib/email/email-service.ts` - Resend implementation
- `src/lib/email/index.ts` - Public API

### Usage

```typescript
import { emailService } from "@/lib/email";

await emailService.sendEventRegistrationConfirmation({
  to: "user@example.com",
  recipientName: "John Doe",
  eventName: "Sunday Service",
  eventDate: "2026-07-20",
  eventLocation: "Main Hall",
  registrationId: "uuid-123",
});
```

---

## 🎪 Event Registration System

### Database Schema

**New Tables:**

- `events` - Event details (title, date, capacity, status)
- `event_registrations` - Attendee records with demographics
- `qr_codes` - Unique secure tokens per registration
- `event_checkins` - Audit trail of check-ins
- `raffle_entries` - Raffle participants
- `raffle_draws` - Drawing history

**New Enums:**

- `event_status` - draft, scheduled, active, completed, cancelled
- `registration_status` - registered, checked_in, cancelled, no_show
- `attendance_category` - children, youth, young_adults, adults, seniors
- `leadership_role` - 10+ church roles
- `visitor_membership` - member, visitor, first_time_guest

### Security Features

- ✅ Row-Level Security (RLS) on all tables
- ✅ QR codes contain secure random tokens (NOT database IDs)
- ✅ Role-based access control
- ✅ Church-scoped data isolation
- ✅ Complete audit trail
- ✅ Server-side validation

### Files

- `supabase/migrations/20260714120000_events-registration-system.sql`

---

## 🏛️ Domain Models

### Event Entity

```typescript
class Event {
  // Properties
  id: string;
  churchId: string;
  title: string;
  eventDate: Date;
  status: EventStatus;
  allowMultipleCheckins: boolean;

  // Methods
  isActive(): boolean;
  isUpcoming(): boolean;
  canRegister(): boolean;
  updateStatus(status): void;
  toDatabase(): object;
}
```

### EventRegistration Entity

```typescript
class EventRegistration {
  // Properties
  id: string;
  eventId: string;
  memberId?: string;
  attendeeName: string;
  status: RegistrationStatus;

  // Methods
  isCheckedIn(): boolean;
  recordCheckIn(userId, device, location): void;
  markNoShow(): void;
  cancel(): void;
}
```

### QRCode Value Object

```typescript
class QRCode {
  // Properties
  token: string (secure, random)
  isScanned: boolean
  expiresAt?: Date

  // Methods
  isValid(allowMultipleScan): boolean
  markAsScanned(userId): void
  hasExpired(): boolean
  toQRData(): string
}
```

### Files

- `src/modules/events/domain/event.ts`
- `src/modules/events/domain/event-registration.ts`
- `src/modules/events/domain/qr-code.ts`

---

## 💼 Application Services

### EventService

```typescript
// Create/read/update/delete events
createEvent(input): Promise<Event>
getEventById(id): Promise<Event>
listEventsByChurch(churchId, options): Promise<{events, total}>
updateEvent(input): Promise<Event>
deleteEvent(eventId): Promise<void>

// Capacity management
getRegistrationCount(eventId): Promise<number>
getCheckedInCount(eventId): Promise<number>
isEventAtCapacity(eventId): Promise<boolean>
```

### RegistrationService

```typescript
// Registration management
registerForEvent(input): Promise<EventRegistration>
getRegistrationById(id): Promise<EventRegistration>
listRegistrationsByEvent(eventId, options): Promise<{registrations, total}>
updateRegistration(input): Promise<EventRegistration>
cancelRegistration(registrationId): Promise<void>

// Demographics
getRegistrationsByFilter(eventId, filter): Promise<EventRegistration[]>
```

### CheckInService

```typescript
// Main check-in operation
checkIn(input): Promise<CheckInResult>

// Validation
validateQRCode(token, eventId): Promise<ValidationResult>
getCheckInHistory(registrationId): Promise<CheckInRecord[]>
```

### AttendanceAnalyticsService

```typescript
// Real-time metrics
getEventMetrics(eventId): Promise<EventAttendanceMetrics>

// Demographic breakdowns
getAttendanceByCategory(eventId): Promise<AttendanceByCategory[]>
getAttendanceByMembership(eventId): Promise<AttendanceByMembership[]>
getAttendanceByLeadership(eventId): Promise<AttendanceByLeadership[]>
getAttendanceByGender(eventId): Promise<AttendanceByGender[]>

// Trends
getHourlyArrivals(eventId): Promise<HourlyArrival[]>
getAttendancePerChurch(eventId): Promise<ChurchAttendance[]>

// Refresh
refreshAnalytics(): Promise<void>
```

### RaffleService

```typescript
// Entry management
addRaffleEntry(data): Promise<string>
populateRaffleFromEvent(eventId, filter): Promise<number>
getRaffleEntries(eventId, options): Promise<{entries, total}>

// Drawing
drawWinner(eventId, prize, drawnBy, filter): Promise<DrawResult>
drawMultipleWinners(eventId, prizes, drawnBy, filter): Promise<DrawResult[]>
rerollWinners(eventId, prize, count, drawnBy, filter): Promise<DrawResult[]>

// History
getRaffleWinners(eventId): Promise<RaffleDrawRecord[]>
```

### Files

- `src/modules/events/application/event.service.ts`
- `src/modules/events/application/registration.service.ts`
- `src/modules/events/application/checkin.service.ts`
- `src/modules/events/application/attendance-analytics.service.ts`
- `src/modules/events/application/raffle.service.ts`

---

## 🔌 API / Server Functions

### Event Endpoints

```
GET  /api/events/list
GET  /api/events/{id}
POST /api/events/create
```

### Registration Endpoints

```
POST /api/events/{id}/register
GET  /api/events/{id}/registrations
```

### Check-In Endpoints

```
POST /api/events/checkin        (process QR scan)
POST /api/events/validate-qr    (preview QR)
```

### Analytics Endpoints

```
GET /api/events/{id}/analytics
GET /api/events/{id}/metrics
```

### Raffle Endpoints

```
POST /api/events/{id}/raffle/draw
GET  /api/events/{id}/raffle/winners
```

### File

- `src/modules/events/events.functions.ts`

---

## 🎬 Next Phase: UI Components

### Phase 2 Tasks (Recommended Order)

1. **QR Code Generation Component** (1 hour)
   - Package: `qrcode.react`
   - Display QR code from registration
   - Print/export options

2. **Event Listing UI** (1-2 hours)
   - Table with events
   - Filter by status
   - Create event button
   - Edit/delete actions

3. **Event Registration Form** (1-2 hours)
   - Guest or member registration
   - Demographics fields
   - Validation with Zod
   - Success notification

4. **Check-In Scanner Page** (2-3 hours)
   - Camera access / QR scanner
   - Real-time attendee feedback
   - Check-in success/error states
   - Checked-in counter

5. **Analytics Dashboard** (2-3 hours)
   - KPI cards (registered, checked-in, %)
   - Charts using Recharts
   - Demographic breakdowns
   - Real-time metrics refresh

6. **Raffle Drawing UI** (1-2 hours)
   - Draw single/multiple winners
   - Filter options
   - Live drawing display
   - Winner notification

7. **Integration** (1-2 hours)
   - Email triggers on registration
   - QR code delivery via email
   - Attendance confirmation emails
   - Raffle winner emails

---

## 🔐 Security Checklist

- ✅ QR codes use secure tokens, never expose database IDs
- ✅ Row-Level Security (RLS) on all tables
- ✅ Server-side validation (Zod + domain logic)
- ✅ Authentication middleware on all functions
- ✅ Role-based access control
- ✅ Audit trail for all modifications
- ✅ Church-scoped data isolation
- ✅ Device/location/operator logging

---

## 🚀 Deployment

### Prerequisites

```bash
npm install resend              # Email service
npm install qrcode.react        # QR code display
npm install @react-qr-code/core # QR code scanning (Phase 2)
```

### Environment Variables

```env
# Required
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
RESEND_API_KEY=...

# Optional
EMAIL_FROM_ADDRESS=noreply@sgbcmanagement.com
```

### Database Migration

```bash
cd supabase
supabase migration up
```

### Build

```bash
npm run build    # Production build
npm run preview  # Test production build
```

---

## 📚 Documentation Files

- **IMPLEMENTATION_GUIDE.md** - Detailed API usage examples
- **AGENTS.md** - Lovable deployment notes
- **README.md** (this file) - Project overview

---

## 📊 Metrics & Analytics

### Real-Time Data Collection

- Total registered
- Total checked-in
- Attendance percentage
- Remaining attendees
- Demographic breakdowns (age, membership, leadership, gender)
- Hourly arrival patterns
- Per-church attendance

### Data Views

- Materialized view: `event_attendance_analytics`
- Function: `refresh_event_attendance_analytics()`
- Query performance: Optimized for real-time dashboards

---

## 🧪 Testing Notes

### Service Layer Testing

Services are designed for testability:

- Pure domain models
- Dependency injection
- Mockable Supabase client
- Clear input/output contracts

Example:

```typescript
const mockSupabase = createMockClient();
const service = new EventService(mockSupabase);
// Test service methods
```

---

## ✨ Key Features Implemented

1. ✅ **Multi-Event Support**: Multiple events per church
2. ✅ **Guest Registration**: Non-member event registration
3. ✅ **Demographic Tracking**: Age, gender, role, membership status
4. ✅ **Flexible Check-In**: Single or multiple check-ins per event
5. ✅ **Secure QR Codes**: Tokens not database IDs
6. ✅ **Real-Time Analytics**: Live attendance metrics
7. ✅ **Raffle System**: Winners with filtering
8. ✅ **Email Notifications**: 10+ email types
9. ✅ **Audit Trail**: Complete operation history
10. ✅ **Multi-Church Support**: Organization-level tenancy

---

## 🐛 Known Issues / Limitations

None currently identified. System is production-ready for Phase 2 UI development.

---

## 📞 Support

For questions or issues:

1. Review IMPLEMENTATION_GUIDE.md
2. Check existing service implementations
3. Refer to domain model documentation
4. Check database schema in migration file

---

## 📝 License

© 2026 SGBC Church Management System. All rights reserved.

---

## Changelog

### v0.1.0 - 2026-07-14

- Initial implementation
- Phase 1: Foundation complete
- Ready for UI component development
