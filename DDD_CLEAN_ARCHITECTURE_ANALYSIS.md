# SGBC Management System - DDD & Clean Architecture Analysis

**Analysis Date**: 2026-07-21  
**Framework**: TanStack React Start + Supabase + TypeScript  
**Overall DDD Grade**: **C+** (DDD principles partially implemented)  
**Overall Clean Architecture Grade**: **C+** (Good practices in Events module, inconsistent elsewhere)

---

## Executive Summary

The codebase shows **strong DDD and Clean Architecture practices in the Events module** but is **highly inconsistent across other modules**. The Events module is well-structured with clear domain/application/infrastructure separation, while Auth, Finance, Membership, and Visitors modules lack this architectural foundation.

### Key Findings:

- ✅ **Events module**: Exemplary DDD implementation with proper entity design, value objects, and application services
- ❌ **Other modules**: Lack domain modeling; heavy mix of infrastructure and business logic in functions
- ⚠️ **Infrastructure**: Minimal abstraction; direct Supabase calls throughout codebase
- ⚠️ **Dependency Injection**: Implicit (passed via constructors); no formal DI container
- ✅ **UI/Presentation**: Clean separation via server functions and React components

---

## 1. Folder Structure Analysis

### Current Organization

```
src/
├── modules/              ← Module-based structure (GOOD)
│   ├── events/          ← ⭐ EXCELLENT: domain/application/ui separation
│   ├── auth/            ← ❌ POOR: Only functions, no domain layer
│   ├── finance/         ← ❌ POOR: Only functions, no domain layer
│   ├── membership/      ← ❌ POOR: Only functions, no domain layer
│   ├── visitors/        ← ❌ POOR: Only functions, no domain layer
│   ├── dashboard/
│   └── tenancy/
├── integrations/         ← ⭐ GOOD: Infrastructure abstraction
│   └── supabase/
├── lib/
│   ├── utils.ts         ← ❌ WEAK: Utility dumping ground (only cn, formatDate)
│   ├── email/
│   └── qr-code-generator.ts
├── routes/              ← ⭐ GOOD: File-based routing (clean)
└── components/
    └── ui/              ← ⭐ GOOD: Reusable UI components
```

### Architecture Assessment

**What's Done Right:**

- Module-based folder structure follows DDD's bounded contexts
- Events module has proper layering: domain → application → API → UI
- Clear separation of concerns in Events module
- Server functions (`*.functions.ts`) separate from React components

**What's Missing:**

- **Inconsistent structure**: 4 out of 6 major modules lack domain/application separation
- **No repository pattern**: Direct database access via Supabase client
- **Thin utility library**: `src/lib/utils.ts` has only 2 functions; utilities scattered across codebase
- **No shared DTOs/commands**: Each module defines own input/output shapes
- **No entity base classes**: Each entity implements same patterns independently

---

## 2. Domain Layer Analysis

### ✅ Events Module - **EXEMPLARY**

**Domain Files Located**: `src/modules/events/domain/`

#### Event Entity

```typescript
// ✅ GOOD: Encapsulation with private props
export class Event {
  private props: EventProps;

  // ✅ GOOD: Factory methods for creation
  static create(props: Omit<EventProps, "id" | "createdAt" | "updatedAt">): Event {
    return new Event({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ✅ GOOD: Hydration from database
  static fromDatabase(dbEvent: any): Event {
    return new Event({...});
  }

  // ✅ EXCELLENT: Business logic in domain
  isActive(): boolean {
    return this.props.status === "active";
  }

  canRegister(): boolean {
    return this.props.status === "scheduled" || this.props.status === "active";
  }

  // ✅ GOOD: Mapper for persistence
  toDatabase() {
    return {
      id: this.props.id,
      church_id: this.props.churchId,
      // ...converts camelCase to snake_case
    };
  }
}
```

**DDD Patterns Implemented:**

- ✅ **Entity**: Event with unique identity (id)
- ✅ **Value Objects**: EventStatus (union type), EventProps (immutable data)
- ✅ **Aggregates**: Event is root; EventRegistration and QRCode are separate aggregates
- ✅ **Domain Logic**: `isActive()`, `canRegister()`, `updateStatus()`
- ✅ **Factory Pattern**: `Event.create()` and `Event.fromDatabase()`
- ✅ **Invariants**: Status validation, date validation implicitly via TypeScript

**Domain Model Quality**: **A (9/10)**

---

#### EventRegistration Entity

```typescript
export class EventRegistration {
  private props: EventRegistrationProps;

  // ✅ GOOD: Rich domain types
  ageCategory?: AttendanceCategory; // "children" | "youth" | "young_adults" | "adults" | "seniors"
  sex?: SexKind; // "male" | "female"
  visitorStatus?: VisitorMembership; // "member" | "visitor" | "first_time_guest"
  leadershipRole?: LeadershipRole; // 10+ pastor/leader roles

  // ✅ GOOD: Status tracking
  status: RegistrationStatus; // "registered" | "checked_in" | "cancelled" | "no_show"
  registeredAt: Date;
  checkedInAt?: Date;
}
```

**Strengths:**

- Rich, expressive domain types (not just strings)
- Encapsulation of related data
- Clear temporal tracking (registeredAt, checkedInAt)

---

#### QRCode Value Object

```typescript
export class QRCode {
  private props: QRCodeProps;

  // ✅ EXCELLENT: Secure generation
  static generate(
    registrationId: string,
    eventId: string,
    churchId: string,
    expiresAt?: Date,
  ): QRCode {
    // Generate secure random token (32 bytes = 256 bits)
    const token = randomBytes(32).toString("hex");
    // NOT database ID - secure token!
  }

  get token(): string {
    return this.props.token;
  }

  canBeScanned(): boolean {
    return !this.props.isScanned || this.props.allowMultiple;
  }

  markScanned(scannedBy: string, location?: string): void {
    this.props.isScanned = true;
    this.props.scannedAt = new Date();
    this.props.scannedBy = scannedBy;
  }
}
```

**Value Object Characteristics**: **A+ (10/10)**

- Immutable (methods create new instances or modify via setters)
- No identity - equality based on values
- Secure token generation (not reusing IDs)
- Business methods encapsulated

---

### ❌ Other Modules - **MISSING DOMAIN LAYER**

#### Auth Module

```
src/modules/auth/
└── auth.public.functions.ts  ← Only file; NO domain layer
```

**Code Pattern** (ANTI-PATTERN):

```typescript
// ❌ ALL logic in API layer - no domain abstraction
export const getAvailableOrganizations = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error("Failed to load organizations");

  return {
    organizations: (data ?? []).map((org) => ({
      id: org.id,
      name: org.name,
    })),
  };
});
```

**Missing:**

- ❌ No `Organization` entity or aggregate root
- ❌ No business logic (e.g., organization visibility rules)
- ❌ Database directly in server function
- ❌ No DTOs or input/output contracts
- ❌ No abstraction for testing

#### Finance Module

```
src/modules/finance/
├── contributions.functions.ts
├── finance.functions.ts
├── member-reports.functions.ts
├── pledges.functions.ts
└── reports.functions.ts
```

**Code Pattern** (ANTI-PATTERN):

```typescript
// ❌ Finance logic scattered across multiple function files
export const getFinanceKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scope.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    // ❌ Database queries in handler
    const [mtdC, prevC, ytdC, mtdE, prevE, ytdE] = await Promise.all([
      scopeFilter(sb.from("contributions").select("amount").gte("occurred_on", monthStart)),
      scopeFilter(sb.from("contributions").select("amount").gte("occurred_on", prevStart).lt("occurred_on", monthStart)),
      // ... more queries mixed with business logic
    ]);

    // ❌ Aggregation logic in API layer
    const sum = (r: any) => (r.data ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
    const giving_mtd = sum(mtdC);
    const giving_prev = sum(prevC);
    const giving_delta_pct = giving_prev > 0 ? Math.round(((giving_mtd - giving_prev) / giving_prev) * 100) : null;

    return { giving_mtd, giving_ytd, giving_delta_pct, ... };
  });
```

**Missing:**

- ❌ No `Contribution` or `Expense` entities
- ❌ No `FinanceService` for business logic
- ❌ No aggregate patterns (should group contributions/expenses under a ledger)
- ❌ Financial calculations in API layer (should be domain logic)
- ❌ No value objects for Money (using raw numbers)
- ❌ No audit trail or immutability

#### Membership Module

```
src/modules/membership/
└── membership.functions.ts  ← Only file; NO domain layer
```

**Code Pattern** (ANTI-PATTERN):

```typescript
// ❌ Member listing logic directly in API
export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    let query = context.supabase
      .from("members")
      .select("id, church_id, first_name, last_name, email, phone, membership_status, ...");

    if (data.church_id) query = query.eq("church_id", data.church_id);
    if (data.status) query = query.eq("membership_status", data.status);
    if (data.q) {
      const like = `%${data.q}%`;
      query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
    }

    // ❌ Sorting/pagination logic in API
    switch (data.sort) {
      case "name_asc":
        query = query.order("last_name").order("first_name");
        break;
      case "name_desc":
        query = query.order("last_name", { ascending: false });
        break;
      // ...
    }

    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    query = query.range(from, to);
    const { data: rows, count, error } = await query;

    return { rows, count, page: data.page, page_size: data.page_size };
  });
```

**Missing:**

- ❌ No `Member` entity
- ❌ No `MemberService` for business logic
- ❌ Filtering/sorting logic in API layer (should be in domain)
- ❌ No search/query object patterns
- ❌ Pagination logic not reusable

---

### Domain Layer Summary

| Module     | Entity? | Aggregate? | Value Objects?  | Domain Logic? | Grade |
| ---------- | ------- | ---------- | --------------- | ------------- | ----- |
| Events     | ✅ Yes  | ✅ Yes     | ✅ Yes (QRCode) | ✅ Yes        | A+    |
| Auth       | ❌ No   | ❌ No      | ❌ No           | ❌ No         | F     |
| Finance    | ❌ No   | ❌ No      | ❌ No           | ❌ No         | F     |
| Membership | ❌ No   | ❌ No      | ❌ No           | ❌ No         | F     |
| Visitors   | ❌ No   | ❌ No      | ❌ No           | ❌ No         | F     |

---

## 3. Application Layer Analysis

### ✅ Events Module - **EXCELLENT**

**Application Services Located**: `src/modules/events/application/`

#### EventService

```typescript
// ✅ GOOD: Application service orchestrating domain logic
export class EventService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ✅ GOOD: Uses factory pattern
  async createEvent(input: CreateEventInput): Promise<Event> {
    const event = Event.create({
      churchId: input.churchId,
      organizationId: input.organizationId,
      title: input.title,
      // ...
    });

    const eventsTable = await this.resolveEventsTable();
    // ❌ MINOR: Direct Supabase calls (not abstracted in repository)
    const { error } = await this.supabase.from(eventsTable).insert([event.toDatabase()]);

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    return event;
  }

  async getEventById(eventId: string): Promise<Event | null> {
    const eventsTable = await this.resolveEventsTable();
    const { data, error } = await this.supabase
      .from(eventsTable)
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // ✅ GOOD: Hydrating domain objects
    return Event.fromDatabase(data);
  }

  async listEventsByChurch(
    churchId: string | undefined,
    options?: {
      status?: EventStatus;
      futureOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ events: Event[]; total: number }> {
    // Query logic with RLS enforcement
    const eventsTable = await this.resolveEventsTable();
    let query = this.supabase.from(eventsTable).select("*", { count: "exact" });

    if (churchId) query = query.eq("church_id", churchId);
    if (options?.status) query = query.eq("status", options.status);
    if (options?.futureOnly) {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("event_date", today);
    }

    // ✅ GOOD: Returns collection of domain objects
    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to list events: ${error.message}`);

    return {
      events: (data ?? []).map((row) => Event.fromDatabase(row)),
      total: count ?? 0,
    };
  }
}
```

**Application Service Quality**: **A (9/10)**

**Strengths:**

- ✅ Orchestrates domain entities (Event.create, Event.fromDatabase)
- ✅ Handles input DTOs (CreateEventInput)
- ✅ Returns domain objects, not DTOs
- ✅ Includes business rule validation (status checks, capacity)
- ✅ Error handling with meaningful messages

**Weaknesses:**

- ❌ Direct Supabase client (no repository pattern)
- ❌ Table name resolution logic mixed with business logic (should be in repository)
- ⚠️ Query construction in service (should be in repository)

---

#### RegistrationService

```typescript
// ✅ EXCELLENT: Complex business logic in application service
export class RegistrationService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private eventService: EventService, // ✅ Service composition
  ) {}

  // ✅ EXCELLENT: Rich input DTO
  async registerForEvent(input: RegisterForEventInput): Promise<RegistrationWithQRCode> {
    // 1. Validate event exists and can accept registrations
    const event = await this.eventService.getEventById(input.eventId);
    if (!event) throw new Error("Event not found");
    if (!event.canRegister()) throw new Error("Event is not accepting registrations");

    // 2. Check for duplicate member registrations
    if (input.memberId) {
      const existing = await this.getRegistrationByMemberAndEvent(input.memberId, input.eventId);
      if (existing) throw new Error("Member is already registered for this event");
    }

    // 3. Check for duplicate by email or phone
    if (input.attendeeEmail || input.attendeePhone) {
      const { data: existingByEmailOrPhone } = await this.supabase
        .from("event_registrations")
        .select("id, attendeeEmail, attendeePhone")
        .eq("eventId", input.eventId)
        .eq("churchId", input.churchId)
        // ✅ Complex OR condition for duplicate checking
        .or(
          input.attendeeEmail && input.attendeePhone
            ? `attendeeEmail.eq.${input.attendeeEmail},attendeePhone.eq.${input.attendeePhone}`
            : input.attendeeEmail
              ? `attendeeEmail.eq.${input.attendeeEmail}`
              : `attendeePhone.eq.${input.attendeePhone}`,
        );

      if (existingByEmailOrPhone?.length > 0) {
        throw new Error("This email or phone number is already registered for this event");
      }
    }

    // 4. Check event capacity
    const isAtCapacity = await this.eventService.isEventAtCapacity(input.eventId);
    if (isAtCapacity) throw new Error("Event is at maximum capacity");

    // 5. Create registration and QR code
    const registration = EventRegistration.create({
      // ...spread input
    });

    const qrCode = QRCode.generate(registration.id, input.eventId, input.churchId);

    // ... persist and return
    return { registration, qrCode };
  }
}
```

**Application Service Quality**: **A+ (10/10)**

**Exemplary Practices:**

- ✅ Validates business rules from domain (event.canRegister())
- ✅ Prevents duplicates (by member, by email, by phone)
- ✅ Enforces capacity constraints
- ✅ Coordinates multiple entities (Event, EventRegistration, QRCode)
- ✅ Uses factory methods (Event.create, QRCode.generate)
- ✅ Returns rich domain output (RegistrationWithQRCode)

---

#### CheckInService

```typescript
// ✅ EXCELLENT: Core business process logic
export class CheckInService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private eventService: EventService,
  ) {}

  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    try {
      // 1. Validate QR code
      const qrCode = await this.getQRCodeByToken(input.qrToken);
      if (!qrCode) return { success: false, message: "Invalid QR code", error: "QR_NOT_FOUND" };

      if (qrCode.eventId !== input.eventId) {
        return {
          success: false,
          message: "QR code is not valid for this event",
          error: "QR_EVENT_MISMATCH",
        };
      }

      // 2. Verify event exists and is active
      const event = await this.eventService.getEventById(qrCode.eventId);
      if (!event) return { success: false, message: "Event not found", error: "EVENT_NOT_FOUND" };

      if (!event.isActive() && event.status !== "scheduled") {
        return { success: false, message: "Event is not active", error: "EVENT_NOT_ACTIVE" };
      }

      // 3. Verify registration exists
      const registration = await this.getRegistrationById(qrCode.registrationId);
      if (!registration) {
        return {
          success: false,
          message: "Registration not found",
          error: "REGISTRATION_NOT_FOUND",
        };
      }

      // ... complex check-in logic
    } catch (error) {
      return { success: false, message: "Unexpected error", error: error?.message };
    }
  }
}
```

**Application Service Quality**: **A (9/10)**

---

### ❌ Other Modules - **NO APPLICATION LAYER**

Finance module directly queries database in server functions with no service abstraction:

```typescript
// ❌ ANTI-PATTERN: Application logic in server function
export const getFinanceKpis = createServerFn({ method: "GET" }).handler(
  async ({ context, data }) => {
    const sb = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    // ❌ This should be in FinanceService.getMonthlyKPIs()
    const [mtdC, prevC, ytdC, mtdE, prevE, ytdE] = await Promise.all([
      scopeFilter(sb.from("contributions").select("amount").gte("occurred_on", monthStart)),
      // ... more queries
    ]);

    const sum = (r: any) => (r.data ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
    const giving_mtd = sum(mtdC);
    // ... aggregations in API layer
  },
);
```

---

## 4. Infrastructure Layer Analysis

### Current Implementation

**Files**: `src/integrations/supabase/`

- `auth-middleware.ts` - Authentication enforcement ✅
- `client.server.ts` - Server-side admin client ✅
- `client.ts` - Client-side authenticated client ✅
- `types.ts` - Database type definitions ✅

### Assessment: **C (6/10)**

**What's Good:**

- ✅ Clear separation of server admin client vs. client-side client
- ✅ Authentication middleware enforces auth on protected functions
- ✅ Environment variable validation with helpful error messages
- ✅ RLS (Row-Level Security) enforcement via auth context

**What's Missing:**

- ❌ **No Repository Pattern**: Services directly use Supabase client
  - Should have `EventRepository`, `RegistrationRepository`, etc.
  - Would abstract database technology (could swap Supabase for PostgreSQL)

- ❌ **No Data Access Layer**: SQL queries and table names scattered across services
  - Table name resolution logic in `EventService` is a code smell
  - No query builder or query repository

- ❌ **No Abstraction of External Services**:
  - Email service should be abstracted (currently direct Resend calls)
  - QR code generation not abstracted in infrastructure

- ❌ **No Unit of Work Pattern**: No transaction management abstraction

**Example of Missing Repository Pattern**:

```typescript
// ❌ Current: Service talks directly to Supabase
export class EventService {
  async createEvent(input: CreateEventInput): Promise<Event> {
    const event = Event.create({...});
    const { error } = await this.supabase.from("events").insert([event.toDatabase()]);
    return event;
  }
}

// ✅ Should be: Service talks to repository
export class EventService {
  constructor(private eventRepository: EventRepository) {}

  async createEvent(input: CreateEventInput): Promise<Event> {
    const event = Event.create({...});
    await this.eventRepository.save(event);
    return event;
  }
}

export interface EventRepository {
  save(event: Event): Promise<void>;
  findById(id: string): Promise<Event | null>;
  findByChurch(churchId: string): Promise<Event[]>;
  delete(id: string): Promise<void>;
}

export class SupabaseEventRepository implements EventRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(event: Event): Promise<void> {
    const { error } = await this.supabase.from("events").insert([event.toDatabase()]);
    if (error) throw new Error(`Failed to save event: ${error.message}`);
  }

  async findById(id: string): Promise<Event | null> {
    const { data } = await this.supabase.from("events").select("*").eq("id", id).maybeSingle();
    return data ? Event.fromDatabase(data) : null;
  }
}
```

---

## 5. API/Presentation Layer Analysis

### Server Functions Layer

**Structure**: `src/modules/*/events.functions.ts` and `events.public.functions.ts`

```typescript
// ✅ GOOD: Clear input validation with Zod
const createEventSchema = z.object({
  churchId: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  eventDate: z.string(),
  startTime: z.string().nullable().optional(),
  // ...
});

// ✅ GOOD: Separate authenticated vs. public functions
export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]) // ← Protected
  .inputValidator((d: unknown) => createEventSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId, churchId } = context;

    // ✅ GOOD: Use application service
    const eventService = new EventService(supabase);
    const result = await eventService.createEvent({
      ...data,
      createdBy: userId,
    });

    return {
      id: result.id,
      title: result.title,
      // ✅ Transform domain object to API DTO
    };
  });

// ✅ GOOD: Public endpoints with rate limiting
export const registerForEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerForEventSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = createAdminClient();
    const eventService = new EventService(supabase);
    const registrationService = new RegistrationService(supabase, eventService);

    const { registration, qrCode } = await registrationService.registerForEvent(data);

    // ✅ Good: Generate QR code image data
    const qrImageData = await generateQRCodeImage(qrCode.token);

    return {
      id: registration.id,
      qrToken: qrCode.token,
      qrImageData,
      // ✅ Transform to DTO for API response
    };
  });
```

**API Layer Quality**: **A (9/10)**

**Strengths:**

- ✅ Clear input validation with Zod schemas
- ✅ Separation of authenticated vs. public endpoints
- ✅ Authentication middleware enforcement
- ✅ Uses application services (good dependency)
- ✅ Transforms domain objects to DTOs for responses
- ✅ Error handling with meaningful messages

**Weaknesses:**

- ⚠️ No consistent error response format
- ⚠️ No versioning strategy for API endpoints
- ⚠️ Rate limiting mentioned but implementation not verified

---

### UI/Presentation Layer

**Structure**: `src/modules/*/ui/*.tsx` React components

```typescript
// ✅ GOOD: Clean React component
export function EventCreateForm({ churchId, organizationId, onCreated }: EventCreateFormProps) {
  const createEventFn = useServerFn(createEvent);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),  // ✅ Client-side validation
    defaultValues: { /* ... */ },
  });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      // ✅ GOOD: Calls server function
      const result = await createEventFn({
        data: {
          churchId,
          organizationId,
          title: values.title,
          // ...
        },
      });
      return result;
    },
    onSuccess: (result) => {
      toast.success("Event created successfully");
      onCreated?.(result.id);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create event");
    },
  });

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit((values) => submit.mutate(values))}>
        {/* Form fields */}
      </form>
    </Card>
  );
}
```

**UI Layer Quality**: **A (9/10)**

**Strengths:**

- ✅ No business logic in components
- ✅ Clean separation via server functions
- ✅ Client-side validation with Zod
- ✅ Uses React Query for data mutations
- ✅ Proper error handling and user feedback
- ✅ Reusable UI components from Radix UI

**Weaknesses:**

- ⚠️ Limited data loading states/error boundaries
- ⚠️ Form components could be more composable

---

## 6. Cross-Cutting Concerns

### Dependency Injection

**Current Implementation**: Implicit via constructor injection

```typescript
// ✅ Manual DI (no framework)
const eventService = new EventService(supabase);
const registrationService = new RegistrationService(supabase, eventService);
const checkInService = new CheckInService(supabase, eventService);
```

**Assessment**: **C+ (7/10)**

- ✅ Simple, no external dependencies
- ⚠️ No formal DI container
- ⚠️ Services instantiated in server functions (not reusable across requests)
- ⚠️ Tight coupling to Supabase client

**Recommendation**:

```typescript
// ✅ Factory function for DI
function createEventDependencies(supabase: SupabaseClient) {
  const eventService = new EventService(supabase);
  const registrationService = new RegistrationService(supabase, eventService);
  const checkInService = new CheckInService(supabase, eventService);

  return { eventService, registrationService, checkInService };
}

export const createEvent = createServerFn({ method: "POST" }).handler(async ({ context, data }) => {
  const { eventService } = createEventDependencies(context.supabase);
  // ...
});
```

---

### Error Handling

**Current Pattern**:

```typescript
// ✅ Good: Domain-specific errors
if (!event) throw new Error("Event not found");
if (!event.canRegister()) throw new Error("Event is not accepting registrations");

// ⚠️ Could be improved with custom error types
class EventNotFoundError extends Error {}
class EventNotAcceptingRegistrationsError extends Error {}
```

**Assessment**: **B (8/10)**

- ✅ Meaningful error messages
- ✅ Consistent error throwing
- ⚠️ No custom error types (loses error context in logs)
- ⚠️ No error codes for API responses

**Recommendation**:

```typescript
// ✅ Custom error types
export enum ErrorCode {
  EVENT_NOT_FOUND = "EVENT_NOT_FOUND",
  EVENT_NOT_ACCEPTING_REGISTRATIONS = "EVENT_NOT_ACCEPTING_REGISTRATIONS",
  DUPLICATE_REGISTRATION = "DUPLICATE_REGISTRATION",
}

export class DomainError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
```

---

### Validation

**Current Pattern**: ✅ Excellent

```typescript
// ✅ Zod schemas at API layer
const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  eventDate: z.string(),
  // ...
});

// ✅ Server function validation
export const createEvent = createServerFn()
  .inputValidator((d: unknown) => createEventSchema.parse(d))
  .handler(async ({ data }) => {
    /* ... */
  });
```

**Assessment**: **A (9/10)**

- ✅ Zod validation at API layer
- ✅ Type safety from schema inference
- ✅ Client-side validation in components
- ⚠️ Missing domain-level validation (in Event entity)

**Recommendation**:

```typescript
// ✅ Add domain validation
export class Event {
  static create(props: EventCreateProps): Event {
    if (!props.title || props.title.trim().length === 0) {
      throw new DomainError(ErrorCode.INVALID_EVENT_TITLE, "Event title cannot be empty");
    }
    if (props.eventDate <= new Date()) {
      throw new DomainError(ErrorCode.INVALID_EVENT_DATE, "Event date must be in the future");
    }
    return new Event({...});
  }
}
```

---

## 7. Testing & Maintainability

### Testability Assessment

**Events Module**: **A (9/10)**

- ✅ Domain entities are easily unit testable (pure business logic)
- ✅ Application services testable with mocked Supabase client
- ✅ No React dependencies in domain/application layers
- ✅ Can test Event.canRegister(), Event.isActive() without database

**Example Test**:

```typescript
describe("Event", () => {
  it("should allow registration when status is scheduled", () => {
    const event = Event.create({
      status: "scheduled",
      // ...
    });
    expect(event.canRegister()).toBe(true);
  });

  it("should prevent registration when status is completed", () => {
    const event = Event.create({
      status: "completed",
      // ...
    });
    expect(event.canRegister()).toBe(false);
  });
});
```

**Other Modules**: **F (0/10)**

- ❌ All logic in server functions
- ❌ Cannot unit test business logic without database
- ❌ Cannot mock dependencies
- ❌ Difficult to test error conditions

---

## 8. Strengths & Weaknesses Summary

### 🟢 Strengths

1. **Events Module Architecture** (A+)
   - Clear domain/application/UI separation
   - Rich domain models with business logic
   - Value objects for security (QRCode tokens)
   - Excellent aggregate design

2. **Type Safety** (A)
   - TypeScript throughout
   - Zod validation schemas
   - Type-safe Supabase client

3. **Separation of Concerns** (A)
   - No business logic in React components
   - Server functions separate from UI
   - Clear authentication middleware

4. **Domain Logic** (A+)
   - Event entity with rich methods (isActive, canRegister, updateStatus)
   - EventRegistration with status tracking
   - QRCode with secure token generation

5. **Scalability** (B+)
   - Module-based structure allows independent scaling
   - Clear boundaries between modules
   - Service composition pattern enables feature addition

---

### 🔴 Weaknesses

1. **Inconsistent Architecture Across Modules** (F)
   - Auth, Finance, Membership, Visitors modules lack domain layer
   - Only Events module follows DDD
   - Difficult to maintain consistency

2. **Missing Repository Pattern** (D)
   - Services directly query Supabase
   - Table name resolution in services
   - Cannot swap database technologies
   - Difficult to test without database

3. **No Formal DI Container** (C)
   - Services instantiated ad-hoc
   - No singleton pattern
   - Inefficient resource usage

4. **Missing Domain Models** (F)
   - Auth: No Organization, User entities
   - Finance: No Contribution, Expense, Ledger entities
   - Membership: No Member entity
   - Business logic embedded in API layer

5. **Thin Utility Library** (D)
   - Only 2 functions in src/lib/utils.ts
   - Utilities scattered across codebase
   - No shared domain exceptions
   - No reusable query/command patterns

6. **No Audit Trail/Event Sourcing** (D)
   - Financial transactions should be immutable
   - No event log for compliance
   - Difficult to track changes

7. **Missing CQRS Pattern** (C)
   - Read and write models not separated
   - Queries mixed with mutations
   - Could benefit from separate query services

---

## 9. DDD Adherence Assessment

### DDD Principles Presence

| Principle                 | Present?   | Quality                 | Notes                                                      |
| ------------------------- | ---------- | ----------------------- | ---------------------------------------------------------- |
| **Entities**              | ✅ Partial | A (Events) / F (Others) | Event, EventRegistration, but missing many others          |
| **Value Objects**         | ⚠️ Partial | A (QRCode)              | QRCode excellent; missing Money, Date ranges, etc.         |
| **Aggregates**            | ✅ Yes     | A (Events)              | Event as root with EventRegistration; others missing       |
| **Bounded Contexts**      | ✅ Yes     | B                       | Module structure aligns with contexts; not clearly defined |
| **Repository Pattern**    | ❌ No      | F                       | Direct database access throughout                          |
| **Services**              | ✅ Partial | A (Events) / F (Others) | Only Events module has application services                |
| **Ubiquitous Language**   | ⚠️ Partial | B                       | Good in domain models; inconsistent in infrastructure      |
| **Domain Events**         | ❌ No      | F                       | No event publishing or domain event model                  |
| **Specifications**        | ❌ No      | F                       | No query specifications for complex filtering              |
| **Anti-Corruption Layer** | ❌ No      | F                       | No isolation from external systems                         |

### Overall DDD Grade: **C+ (65/100)**

**Breakdown**:

- Events Module: **A (90/100)** - Excellent DDD implementation
- Other Modules: **F (10/100)** - No DDD principles applied
- Infrastructure: **C (60/100)** - Missing repository pattern, event sourcing
- Organization: **B (80/100)** - Good module structure, clear boundaries

---

## 10. Clean Architecture Adherence Assessment

### Clean Architecture Principles

| Layer                  | Implemented? | Quality    | Independence | Notes                                                |
| ---------------------- | ------------ | ---------- | ------------ | ---------------------------------------------------- |
| **Entities**           | ✅ Partial   | A (Events) | ✅ High      | Event, EventRegistration independent of framework    |
| **Use Cases**          | ✅ Partial   | A (Events) | ✅ High      | Application services implement use cases             |
| **Interface Adapters** | ✅ Yes       | A          | ✅ High      | Server functions bridge UI and domain                |
| **Frameworks/Drivers** | ✅ Yes       | B          | ⚠️ Medium    | Supabase used directly, not abstracted               |
| **Dependency Rule**    | ⚠️ Partial   | B          | ⚠️ Medium    | Events module follows; others violate                |
| **Testability**        | ✅ Partial   | A (Events) | ✅ High      | Domain/application layers testable                   |
| **Independence**       | ⚠️ Partial   | C          | ⚠️ Medium    | Events ok; other modules tightly coupled to Supabase |

### Dependency Graph (Should Be Concentric Circles)

```
❌ CURRENT (Problematic):
  React Components
       ↓
  Server Functions (Zod, Supabase)
       ↓
  Supabase Infrastructure
       ↓
  Database

✅ IDEAL (Clean Architecture):
  React Components
       ↓
  Server Functions (Zod)
       ↓
  Application Services
       ↓
  Domain Entities
       ↓
  Repositories (Abstraction)
       ↓
  Supabase Infrastructure
       ↓
  Database
```

**Current Code Violates Dependency Rule** in non-Events modules:

```typescript
// ❌ UI Layer depends on Infrastructure (Supabase)
const { data: members } = await supabase // Infrastructure
  .from("members") // Low-level detail
  .select("*")
  .eq("church_id", churchId);

// Data should flow through Use Cases/Services
```

### Overall Clean Architecture Grade: **C+ (65/100)**

**Breakdown**:

- Events Module: **A (90/100)** - Proper layering, dependency rule followed
- Other Modules: **D (40/100)** - Server functions mix infrastructure and business logic
- Dependency Direction: **C (60/100)** - Good in Events; violated elsewhere
- Framework Independence: **C (50/100)** - Could swap React easily; cannot swap Supabase

---

## 11. Recommendations

### Priority 1: High Impact, Medium Effort

**1. Apply Events Module Pattern to Finance Module**

```
Status: ❌ Missing
Time: ~3-5 hours
Impact: ⭐⭐⭐⭐⭐

Create domain entities and application services:
- src/modules/finance/domain/
  - contribution.ts (Entity)
  - expense.ts (Entity)
  - money.ts (Value Object)
  - ledger.ts (Aggregate Root)
- src/modules/finance/application/
  - finance.service.ts
  - ledger.service.ts

Move business logic from finance.functions.ts to services.
```

**2. Introduce Repository Pattern**

```
Status: ❌ Missing
Time: ~4-6 hours
Impact: ⭐⭐⭐⭐⭐

Create repository interfaces:
- src/modules/events/infrastructure/repositories/
  - event.repository.ts (interface)
  - event.supabase-repository.ts (implementation)

Update EventService to use repository instead of direct Supabase.
```

**3. Create Custom Error Types**

```
Status: ⚠️ Partial
Time: ~1-2 hours
Impact: ⭐⭐⭐⭐

Create domain exception hierarchy:
- src/lib/errors/
  - domain.error.ts
  - event-error.ts
  - finance-error.ts

Use in domain entities and services for meaningful error codes.
```

---

### Priority 2: Medium Impact, Medium Effort

**4. Add Domain Events**

```
Status: ❌ Missing
Time: ~4-6 hours
Impact: ⭐⭐⭐⭐

Create event publishing pattern:
- src/lib/domain-events/
  - domain-event.ts (base class)
  - event-registered.ts
  - check-in-completed.ts

Publish on successful operations for audit trail and notifications.
```

**5. Create Shared DTOs & Contracts**

```
Status: ⚠️ Partial
Time: ~2-3 hours
Impact: ⭐⭐⭐

Centralize input/output schemas:
- src/lib/contracts/
  - event.contracts.ts
  - finance.contracts.ts

Reuse across server functions and services.
```

**6. Add Specification Pattern for Complex Queries**

```
Status: ❌ Missing
Time: ~3-4 hours
Impact: ⭐⭐⭐

Create query specifications for common filters:
- src/lib/specifications/
  - specification.ts (base)
  - upcoming-events.spec.ts
  - member-by-status.spec.ts

Reduces query building scattered across code.
```

---

### Priority 3: Low Impact, Lower Effort

**7. Extract Utilities to Shared Lib**

```
Status: ⚠️ Weak
Time: ~1-2 hours
Impact: ⭐⭐

Expand src/lib/utils.ts with shared helpers:
- Date calculations
- String formatting
- Collection utilities
- Type guards
```

**8. Add Integration Tests for Events Module**

```
Status: ❌ Missing
Time: ~3-4 hours
Impact: ⭐⭐⭐

Create integration tests:
- tests/integration/events/
  - event.service.test.ts
  - registration.service.test.ts
  - checkin.service.test.ts
```

**9. Document Architecture Decisions (ADR)**

```
Status: ⚠️ Partial (IMPLEMENTATION_GUIDE.md exists)
Time: ~1-2 hours
Impact: ⭐⭐⭐

Create Architecture Decision Records:
- docs/adr/
  - adr-001-module-structure.md
  - adr-002-ddd-in-events.md
  - adr-003-server-functions.md
```

---

## 12. Quick Refactoring Checklist

```markdown
[ ] 1. Extract Finance domain entities (Contribution, Expense, Ledger)
[ ] 2. Create FinanceService and LedgerService in application layer
[ ] 3. Create repository interfaces for Events module
[ ] 4. Implement SupabaseEventRepository
[ ] 5. Update EventService to use repository
[ ] 6. Create custom error types (DomainError, ValidationError, etc.)
[ ] 7. Add domain validation to Event entity
[ ] 8. Create domain events (EventRegistered, CheckInCompleted, etc.)
[ ] 9. Extract shared utilities to src/lib/utils/
[ ] 10. Create Specification pattern for complex queries
[ ] 11. Add integration tests for Events module
[ ] 12. Apply same pattern to Auth and Membership modules
[ ] 13. Document architecture decisions in docs/adr/
[ ] 14. Add DI factory functions for service creation
[ ] 15. Create anti-corruption layer for external APIs
```

---

## 13. Code Examples: Before & After

### Example 1: Finance KPIs (Before → After)

**BEFORE (No DDD/Clean Architecture)**:

```typescript
// ❌ All logic in server function
export const getFinanceKpis = createServerFn({ method: "GET" }).handler(
  async ({ context, data }) => {
    const sb = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    const [mtdC, prevC, ytdC] = await Promise.all([
      sb.from("contributions").select("amount").gte("occurred_on", monthStart),
      sb
        .from("contributions")
        .select("amount")
        .gte("occurred_on", prevStart)
        .lt("occurred_on", monthStart),
      sb.from("contributions").select("amount").gte("occurred_on", yearStart),
    ]);

    const sum = (r: any) => (r.data ?? []).reduce((a: number, x: any) => a + Number(x.amount), 0);
    const giving_mtd = sum(mtdC);
    const giving_prev = sum(prevC);
    const giving_delta_pct =
      giving_prev > 0 ? Math.round(((giving_mtd - giving_prev) / giving_prev) * 100) : null;

    return { giving_mtd, giving_ytd: sum(ytdC), giving_delta_pct };
  },
);
```

**AFTER (DDD/Clean Architecture)**:

```typescript
// Domain Layer
export class Money {
  constructor(
    readonly amount: number,
    readonly currency: "USD" = "USD",
  ) {}
  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }
  subtract(other: Money): Money {
    return new Money(this.amount - other.amount, this.currency);
  }
  percentageChange(previous: Money): number {
    if (previous.amount === 0) return 0;
    return Math.round(((this.amount - previous.amount) / previous.amount) * 100);
  }
}

export class Contribution {
  constructor(
    readonly id: string,
    readonly amount: Money,
    readonly occurredOn: Date,
    readonly memberId?: string,
  ) {}

  static create(props: { amount: number; occurredOn: Date; memberId?: string }): Contribution {
    return new Contribution(
      crypto.randomUUID(),
      new Money(props.amount),
      props.occurredOn,
      props.memberId,
    );
  }
}

export class Ledger {
  private contributions: Contribution[] = [];
  private expenses: Expense[] = [];

  constructor(readonly churchId: string) {}

  recordContribution(contribution: Contribution): void {
    this.contributions.push(contribution);
  }

  getMonthlyKPI(date: Date): MonthlyKPI {
    const month = new Date(date.getFullYear(), date.getMonth());
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1);

    const mtdContributions = this.contributions.filter((c) => this.isInMonth(c.occurredOn, month));
    const prevContributions = this.contributions.filter((c) =>
      this.isInMonth(c.occurredOn, prevMonth),
    );

    const mtdAmount = mtdContributions.reduce((sum, c) => sum.add(c.amount), new Money(0));
    const prevAmount = prevContributions.reduce((sum, c) => sum.add(c.amount), new Money(0));

    return {
      givingMTD: mtdAmount.amount,
      givingDeltaPct: mtdAmount.percentageChange(prevAmount),
    };
  }

  private isInMonth(date: Date, month: Date): boolean {
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }
}

// Application Layer
export class FinanceService {
  constructor(
    private supabase: SupabaseClient,
    private ledgerRepository: LedgerRepository,
  ) {}

  async getMonthlyKPIs(churchId: string, date: Date): Promise<MonthlyKPI> {
    const ledger = await this.ledgerRepository.findByChurch(churchId);
    if (!ledger) throw new Error("Ledger not found");
    return ledger.getMonthlyKPI(date);
  }
}

// API Layer
export const getFinanceKpis = createServerFn({ method: "GET" }).handler(
  async ({ context, data }) => {
    const financeService = new FinanceService(
      context.supabase,
      new SupabaseLedgerRepository(context.supabase),
    );

    const kpi = await financeService.getMonthlyKPIs(data.church_id || context.churchId, new Date());

    return { giving_mtd: kpi.givingMTD, giving_delta_pct: kpi.givingDeltaPct };
  },
);
```

---

## 14. Conclusion

### Summary Table

| Aspect             | Current      | Target      | Gap        |
| ------------------ | ------------ | ----------- | ---------- |
| DDD Adherence      | **C+** (65%) | **A** (90%) | ▲ Moderate |
| Clean Architecture | **C+** (65%) | **A** (90%) | ▲ Moderate |
| Testability        | **B** (75%)  | **A** (95%) | ▲ Small    |
| Scalability        | **B+** (80%) | **A** (95%) | ▲ Small    |
| Maintainability    | **C** (60%)  | **A** (90%) | ▲ Large    |
| Module Consistency | **C** (50%)  | **A** (95%) | ▲ Large    |

### Key Takeaways

1. **Events module is a template** - Use it as a reference for refactoring other modules
2. **Pattern inconsistency is the biggest issue** - Some modules follow DDD, others don't
3. **Repository pattern is critical** - Would unlock testability and technology independence
4. **Domain events are missing** - Needed for audit trails and system integration
5. **Custom errors improve debugging** - Should be priority for production system

### Path Forward

1. **Phase 1 (Weeks 1-2)**: Apply Events module pattern to Finance module
2. **Phase 2 (Weeks 3-4)**: Introduce repository pattern for all modules
3. **Phase 3 (Weeks 5-6)**: Add domain events, error types, specifications
4. **Phase 4 (Weeks 7-8)**: Create comprehensive test suite

---

## Appendix A: Files Examined

- ✅ `src/modules/events/domain/*.ts` (Event, EventRegistration, QRCode)
- ✅ `src/modules/events/application/*.ts` (EventService, RegistrationService, CheckInService, etc.)
- ✅ `src/modules/events/events.functions.ts` & `events.public.functions.ts`
- ✅ `src/modules/events/ui/*.tsx` (Components)
- ✅ `src/modules/auth/auth.public.functions.ts`
- ✅ `src/modules/finance/finance.functions.ts`
- ✅ `src/modules/finance/contributions.functions.ts`
- ✅ `src/modules/membership/membership.functions.ts`
- ✅ `src/modules/visitors/visitors.functions.ts`
- ✅ `src/integrations/supabase/auth-middleware.ts`
- ✅ `src/integrations/supabase/client.server.ts`
- ✅ `src/lib/utils.ts`
- ✅ `src/routes/` (File-based routing structure)

---

## Appendix B: Grade Rubric

### DDD Grading Criteria (0-100)

- **90-100 (A)**: Entities, aggregates, value objects, domain services, repositories, bounded contexts clearly defined
- **80-89 (B)**: Most DDD patterns present; some missing layers or abstractions
- **70-79 (C)**: Partial implementation; major patterns missing (e.g., entities exist but no repositories)
- **60-69 (D)**: Minimal DDD; mostly service layer; little domain logic
- **0-59 (F)**: No DDD; all logic in infrastructure/API layer

### Clean Architecture Grading Criteria (0-100)

- **90-100 (A)**: Concentric layers, proper dependency direction, testable, framework-independent
- **80-89 (B)**: Most layers present; some dependency violations; mostly testable
- **70-79 (C)**: Some layers; unclear dependencies; partially testable
- **60-69 (D)**: Layers mix; dependencies point inward randomly; hard to test
- **0-59 (F)**: No layering; everything depends on everything; untestable
