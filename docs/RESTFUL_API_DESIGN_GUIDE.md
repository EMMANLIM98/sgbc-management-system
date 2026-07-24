# RESTful API Design Guide - SGBC Management System

## Executive Summary

This document outlines the comprehensive RESTful API design standards for the SGBC Management System, ensuring:

- ✅ Consistency across all endpoints
- ✅ Proper HTTP semantics
- ✅ DDD-aligned response structures
- ✅ Clean error handling
- ✅ API versioning strategy
- ✅ Scalability and maintainability

---

## 1. API Versioning Strategy

### Version Format

```
/api/v1/resource
/api/v2/resource
```

### Current Version: v1

- All new endpoints use `/api/v1` prefix
- Breaking changes increment version
- Maintain backward compatibility within version

### Migration Path

```
v1 → v2 (breaking changes)
├─ Old behavior removed
├─ New contracts established
└─ 6-month deprecation notice
```

---

## 2. RESTful Resource Design

### Resource Naming (Nouns, Not Verbs)

```
✅ CORRECT
POST   /api/v1/events/{eventId}/registrations
GET    /api/v1/events/{eventId}/registrations/{registrationId}
PATCH  /api/v1/events/{eventId}/registrations/{registrationId}
DELETE /api/v1/events/{eventId}/registrations/{registrationId}

❌ WRONG
POST   /api/v1/registerForEvent
POST   /api/v1/events/register
POST   /api/v1/events/{eventId}/validate-qr (action verb)
```

### HTTP Methods & Status Codes

```
GET    /resource              → 200 OK or 404 Not Found
GET    /resource?filter       → 200 OK (array, empty if none)
POST   /resource              → 201 Created (with Location header)
PUT    /resource/{id}         → 200 OK or 201 Created
PATCH  /resource/{id}         → 200 OK
DELETE /resource/{id}         → 204 No Content or 200 OK
HEAD   /resource/{id}         → 200 OK (no body)
```

### Status Code Reference

```
2xx - Success
  200 OK - Successful request, response body included
  201 Created - Resource created, include Location header
  202 Accepted - Request accepted, processing async
  204 No Content - Successful, no response body (DELETE, empty PUT)

4xx - Client Error
  400 Bad Request - Invalid parameters, validation failed
  401 Unauthorized - Missing/invalid authentication
  403 Forbidden - Authenticated but lacks permission
  404 Not Found - Resource doesn't exist
  409 Conflict - State conflict (duplicate, race condition)
  422 Unprocessable Entity - Validation error with details
  429 Too Many Requests - Rate limit exceeded

5xx - Server Error
  500 Internal Server Error - Unexpected error
  503 Service Unavailable - Maintenance/temporary outage
```

---

## 3. Unified Response Format

### Success Response

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

### Paginated Response

```json
{
  "status": "success",
  "code": 200,
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "pagination": {
    "total": 150,
    "count": 10,
    "page": 1,
    "pageSize": 10,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

### Error Response

```json
{
  "status": "error",
  "code": 400,
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      },
      {
        "field": "age",
        "message": "Must be positive",
        "code": "INVALID_AGE"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1",
    "traceId": "req-12345"
  }
}
```

### Created Response (201)

```json
{
  "status": "success",
  "code": 201,
  "data": {
    "id": "resource-uuid",
    "name": "New Resource"
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

Headers:

```
Location: /api/v1/resource/resource-uuid
Content-Type: application/json
```

---

## 4. Request Standards

### Query Parameters

```
GET /api/v1/events?page=1&pageSize=10&sortBy=date&order=asc&status=active

Standard Query Parameters:
- page: number (default 1, min 1)
- pageSize: number (default 10, min 1, max 100)
- sortBy: string (field name)
- order: "asc" | "desc" (default asc)
- filter: resource-specific filters

Pagination Calculation:
- offset = (page - 1) * pageSize
- limit = pageSize
- totalPages = ceil(total / pageSize)
```

### Request Body Validation

```typescript
// Use Zod schemas consistently
const createEventRegistrationSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  ageCategory: z.enum([...]).optional(),
  // ... other fields
});
```

### Request Headers

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
X-API-Version: v1 (optional, for explicit versioning)
X-Request-ID: {uuid} (for tracing)
```

---

## 5. DDD-Aligned API Layer

### API Response DTOs (Data Transfer Objects)

Each aggregate should have corresponding DTOs:

```typescript
// Domain Entity
class Event extends AggregateRoot<EventProps> {
  // Domain logic
}

// API DTO - What we return to clients
interface EventDTO {
  id: string;
  title: string;
  description: string;
  eventDate: string; // ISO date
  location: string;
  remainingCapacity: number;
  registrationDeadline: string;
}

// API Request DTO
interface CreateEventRequest {
  title: string;
  description: string;
  eventDate: string;
  location: string;
  maxCapacity: number;
}

// Mapper (converts domain → DTO)
function toEventDTO(event: Event): EventDTO {
  return {
    id: event.id,
    title: event.title.value,
    eventDate: event.eventDate.toISOString(),
    // ...
  };
}
```

### API Response Builder Pattern

```typescript
class ApiResponse {
  static success<T>(data: T, code: number = 200) {
    return {
      status: "success",
      code,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    };
  }

  static paginated<T>(data: T[], pagination: PaginationMeta, code: number = 200) {
    return {
      status: "success",
      code,
      data,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    };
  }

  static error(error: DomainError | ValidationError, code: number = 400) {
    return {
      status: "error",
      code,
      error: {
        type: error.constructor.name,
        message: error.message,
        details: error.details || [],
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    };
  }
}
```

---

## 6. Events Module - Proposed RESTful Structure

### Public API (No Auth)

```
GET    /api/v1/events
       ├─ Query: page, pageSize, fromDate, status
       └─ Returns: EventDTO[]

GET    /api/v1/events/{eventId}
       └─ Returns: EventDetailDTO (with capacity info)

POST   /api/v1/events/{eventId}/registrations
       ├─ Body: { firstName, lastName, email, phone, ... }
       └─ Returns: 201 Created, RegistrationDTO

POST   /api/v1/events/{eventId}/registrations/{regId}/validate
       ├─ Body: { qrToken }
       └─ Returns: { valid: boolean, registration: RegistrationDTO }

POST   /api/v1/events/{eventId}/registrations/{regId}/check-in
       ├─ Body: { checkedInBy, deviceId? }
       └─ Returns: { status: "checked_in", checkedInAt: ISO }

DELETE /api/v1/events/{eventId}/registrations/{regId}
       └─ Returns: 204 No Content
```

### Authenticated API (Church Admin)

```
GET    /api/v1/organizations/{orgId}/events
       ├─ Query: page, pageSize, status
       └─ Returns: EventDTO[]

POST   /api/v1/organizations/{orgId}/events
       ├─ Body: { title, description, eventDate, ... }
       └─ Returns: 201 Created, EventDTO

PATCH  /api/v1/organizations/{orgId}/events/{eventId}
       ├─ Body: { title?, description?, ... }
       └─ Returns: 200 OK, EventDTO

DELETE /api/v1/organizations/{orgId}/events/{eventId}
       └─ Returns: 204 No Content

GET    /api/v1/organizations/{orgId}/events/{eventId}/registrations
       ├─ Query: page, pageSize, status
       └─ Returns: RegistrationDTO[]

GET    /api/v1/organizations/{orgId}/events/{eventId}/statistics
       └─ Returns: { totalRegistrations, checkedIn, cancelled, ... }
```

---

## 7. Finance Module - Proposed RESTful Structure

### Contributions

```
GET    /api/v1/organizations/{orgId}/contributions
       ├─ Query: page, pageSize, memberId?, dateFrom?, dateTo?
       └─ Returns: ContributionDTO[]

POST   /api/v1/organizations/{orgId}/contributions
       ├─ Body: { memberId, amount, category, date, ... }
       └─ Returns: 201 Created, ContributionDTO

GET    /api/v1/organizations/{orgId}/contributions/{id}
       └─ Returns: ContributionDTO

PATCH  /api/v1/organizations/{orgId}/contributions/{id}
       ├─ Body: { amount?, category?, ... }
       └─ Returns: 200 OK, ContributionDTO

DELETE /api/v1/organizations/{orgId}/contributions/{id}
       └─ Returns: 204 No Content

GET    /api/v1/organizations/{orgId}/contributions/summary
       └─ Returns: { totalContributions, byCategory, trend, ... }
```

### Pledges

```
POST   /api/v1/organizations/{orgId}/pledges
       ├─ Body: { memberId, amount, frequency, startDate, ... }
       └─ Returns: 201 Created, PledgeDTO

GET    /api/v1/organizations/{orgId}/pledges
       ├─ Query: page, pageSize, status
       └─ Returns: PledgeDTO[]

PATCH  /api/v1/organizations/{orgId}/pledges/{id}
       ├─ Body: { frequency?, amount?, ... }
       └─ Returns: 200 OK, PledgeDTO

POST   /api/v1/organizations/{orgId}/pledges/{id}/fulfill
       ├─ Body: { amount, date }
       └─ Returns: 200 OK, { fulfilled: boolean, remaining: Money }

POST   /api/v1/organizations/{orgId}/pledges/{id}/cancel
       ├─ Body: { reason }
       └─ Returns: 200 OK, { status: "cancelled" }
```

---

## 8. Membership Module - Proposed RESTful Structure

```
GET    /api/v1/organizations/{orgId}/members
       ├─ Query: page, pageSize, status, search
       └─ Returns: MemberDTO[]

POST   /api/v1/organizations/{orgId}/members
       ├─ Body: { firstName, lastName, email, ... }
       └─ Returns: 201 Created, MemberDTO

GET    /api/v1/organizations/{orgId}/members/{memberId}
       └─ Returns: MemberDetailDTO

PATCH  /api/v1/organizations/{orgId}/members/{memberId}
       ├─ Body: { firstName?, status?, ... }
       └─ Returns: 200 OK, MemberDTO

DELETE /api/v1/organizations/{orgId}/members/{memberId}
       └─ Returns: 204 No Content

GET    /api/v1/organizations/{orgId}/members/{memberId}/history
       ├─ Query: page, pageSize, type
       └─ Returns: HistoryEntryDTO[]
```

---

## 9. Error Handling Strategy

### Validation Errors (400/422)

```json
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "ValidationError",
    "message": "Validation failed for event registration",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL",
        "value": "invalid-email"
      },
      {
        "field": "phone",
        "message": "Phone must be valid",
        "code": "INVALID_PHONE"
      }
    ]
  }
}
```

### Business Logic Errors (409/422)

```json
{
  "status": "error",
  "code": 409,
  "error": {
    "type": "BusinessRuleViolation",
    "message": "Cannot register: event is full",
    "code": "EVENT_CAPACITY_EXCEEDED",
    "details": {
      "maxCapacity": 100,
      "currentRegistrations": 100
    }
  }
}
```

### Not Found Errors (404)

```json
{
  "status": "error",
  "code": 404,
  "error": {
    "type": "NotFoundError",
    "message": "Event not found",
    "code": "EVENT_NOT_FOUND"
  }
}
```

### Rate Limit (429)

```json
{
  "status": "error",
  "code": 429,
  "error": {
    "type": "RateLimitError",
    "message": "Too many requests",
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "meta": {
    "retryAfter": 60
  }
}
```

---

## 10. Implementation Checklist

### Phase 1: Infrastructure (2 hours)

- [x] Create API Response DTO layer
- [ ] Create unified error handler
- [ ] Create API request validators
- [ ] Create pagination utilities

### Phase 2: Events Module (3 hours)

- [ ] Refactor `/api/v1/events` (GET, POST)
- [ ] Refactor event registrations (POST, PATCH, DELETE)
- [ ] Refactor QR validation/check-in
- [ ] Add EventDTO and mappers

### Phase 3: Finance Module (3 hours)

- [ ] Refactor contributions endpoints
- [ ] Refactor pledges endpoints
- [ ] Add ContributionDTO, PledgeDTO mappers
- [ ] Implement summary endpoints

### Phase 4: Membership Module (2 hours)

- [ ] Refactor members endpoints
- [ ] Add MemberDTO mappers
- [ ] Implement search/filter

### Phase 5: Tenancy Module (2 hours)

- [ ] Create organization endpoints
- [ ] Create user role endpoints
- [ ] Add TenantDTO mappers

### Phase 6: Documentation (2 hours)

- [ ] Generate OpenAPI/Swagger docs
- [ ] Create API client generation
- [ ] Create examples for each endpoint

---

## 11. Quick Reference: Common Patterns

### Creating a New RESTful Endpoint

```typescript
// 1. Define Request DTO
interface CreateContributionRequest {
  memberId: string;
  amount: number;
  category: string;
  date: string;
}

// 2. Define Response DTO
interface ContributionDTO {
  id: string;
  memberId: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

// 3. Create Validation Schema
const createContributionSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string().datetime(),
});

// 4. Implement Endpoint
export default defineEventHandler(async (event) => {
  const orgId = getRouterParam(event, "orgId");
  const body = await readBody(event);

  // Validate
  const validation = createContributionSchema.safeParse(body);
  if (!validation.success) {
    return ApiResponse.error(new ValidationError(validation.error.errors), 422);
  }

  // Business Logic via Service
  try {
    const financeContext = createFinanceContext(supabase);
    const contribution = await financeContext.contributionService.recordContribution({
      organizationId: orgId,
      ...validation.data,
    });

    return ApiResponse.success(toContributionDTO(contribution), 201);
  } catch (error) {
    return ApiResponse.error(error, 400);
  }
});

// 5. Create DTO Mapper
function toContributionDTO(contribution: Contribution): ContributionDTO {
  return {
    id: contribution.id,
    memberId: contribution.memberId.value,
    amount: contribution.amount.value,
    category: contribution.category.value,
    date: contribution.date.toISOString(),
    createdAt: contribution.createdAt.toISOString(),
  };
}
```

---

## 12. Testing the API

### Unit Tests

```typescript
describe("Create Contribution API", () => {
  it("should return 201 on success", async () => {
    const response = await POST("/api/v1/organizations/org-1/contributions", {
      memberId: "member-1",
      amount: 1000,
      category: "tithe",
    });
    expect(response.status).toBe(201);
    expect(response.data.id).toBeDefined();
  });

  it("should return 422 on validation error", async () => {
    const response = await POST("/api/v1/organizations/org-1/contributions", {
      memberId: "invalid",
      amount: -100,
    });
    expect(response.status).toBe(422);
    expect(response.error.type).toBe("ValidationError");
  });
});
```

---

## Next Steps

1. **Create API Response/Error layer** (1 hour)
2. **Implement DTOs for each module** (2 hours)
3. **Refactor existing endpoints** (8 hours)
4. **Add API documentation** (2 hours)
5. **Create API client library** (2 hours)

**Estimated Total: 15 hours to full RESTful API compliance**

---

_Last Updated: 2026-07-24_
_Status: Implementation Guide Ready_
