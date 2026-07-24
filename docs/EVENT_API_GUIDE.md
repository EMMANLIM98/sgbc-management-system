# Event Management RESTful API

## Overview

Complete REST API for event management with full CRUD operations, attendee management, and event statistics. This API allows authorized users to create, read, update, and delete events, as well as manage event registrations and view detailed analytics.

## Base URL

```
/api/v1/organizations/:orgId/events
```

---

## Endpoints

### 1. List Events

**Request:**
```
GET /api/v1/organizations/:orgId/events
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (min: 1) |
| pageSize | number | No | 20 | Items per page (1-100) |
| status | enum | No | - | Filter by status: `scheduled`, `active`, `completed`, `cancelled` |
| futureOnly | boolean | No | true | Filter to future events only |
| sortBy | string | No | eventDate | Sort field: `eventDate`, `title`, `createdAt` |
| order | string | No | asc | Sort order: `asc`, `desc` |

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "title": "Sunday Service",
      "description": "Weekly worship service",
      "eventDate": "2026-07-25T10:00:00Z",
      "startTime": "10:00",
      "endTime": "11:30",
      "location": "Main Hall",
      "maxCapacity": 500,
      "remainingCapacity": 450,
      "registrationCount": 50,
      "status": "scheduled",
      "churchId": "uuid",
      "organizationId": "uuid",
      "createdAt": "2026-07-24T12:00:00Z",
      "updatedAt": "2026-07-24T12:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 15,
      "count": 20,
      "page": 1,
      "pageSize": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "timestamp": "2026-07-24T12:00:00Z",
    "version": "v1"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid organization ID
- `401 Unauthorized` - Authentication required
- `422 Unprocessable Entity` - Invalid query parameters
- `500 Internal Server Error` - Server error

---

### 2. Create Event

**Request:**
```
POST /api/v1/organizations/:orgId/events
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "churchId": "uuid",
  "title": "Sunday Service",
  "description": "Weekly worship service",
  "eventDate": "2026-07-25T10:00:00Z",
  "startTime": "10:00",
  "endTime": "11:30",
  "location": "Main Hall",
  "maxCapacity": 500,
  "allowMultipleCheckins": false
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| churchId | UUID | Yes | Must be valid UUID |
| title | string | Yes | 1-200 characters |
| description | string | No | Max 2000 characters |
| eventDate | ISO 8601 | Yes | Valid datetime |
| startTime | string | No | HH:MM format |
| endTime | string | No | HH:MM format |
| location | string | No | Max 500 characters |
| maxCapacity | number | No | Positive integer |
| allowMultipleCheckins | boolean | No | Default: false |

**Response (201 Created):**
```json
{
  "status": "created",
  "code": 201,
  "data": {
    "id": "uuid",
    "title": "Sunday Service",
    "description": "Weekly worship service",
    "eventDate": "2026-07-25T10:00:00Z",
    "startTime": "10:00",
    "endTime": "11:30",
    "location": "Main Hall",
    "maxCapacity": 500,
    "remainingCapacity": 500,
    "registrationCount": 0,
    "status": "scheduled",
    "churchId": "uuid",
    "organizationId": "uuid",
    "createdAt": "2026-07-24T12:00:00Z",
    "updatedAt": "2026-07-24T12:00:00Z"
  },
  "meta": {
    "timestamp": "2026-07-24T12:00:00Z",
    "version": "v1"
  }
}
```

**Headers in Response:**
```
Location: /api/v1/organizations/:orgId/events/:eventId
```

**Status Codes:**
- `201 Created` - Event created successfully
- `400 Bad Request` - Missing organization ID
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Church or organization not found
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Server error

---

### 3. Get Event Details

**Request:**
```
GET /api/v1/organizations/:orgId/events/:eventId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "id": "uuid",
    "title": "Sunday Service",
    "description": "Weekly worship service",
    "eventDate": "2026-07-25T10:00:00Z",
    "startTime": "10:00",
    "endTime": "11:30",
    "location": "Main Hall",
    "maxCapacity": 500,
    "remainingCapacity": 450,
    "registrationCount": 50,
    "status": "scheduled",
    "churchId": "uuid",
    "organizationId": "uuid",
    "createdAt": "2026-07-24T12:00:00Z",
    "updatedAt": "2026-07-24T12:00:00Z",
    "registrationDeadline": "2026-07-24T23:59:59Z",
    "mobileRegLink": "https://app.example.com/event-register/uuid",
    "checkInLink": "https://app.example.com/check-in/uuid",
    "statistics": {
      "totalRegistered": 50,
      "checkedIn": 45,
      "cancelled": 2,
      "noShow": 3,
      "byAgeCategory": {
        "children": 10,
        "high_school": 8,
        "college": 12,
        "career": 15,
        "adults": 3,
        "seniors": 2
      },
      "byStatus": {
        "registered": 5,
        "checked_in": 45
      }
    }
  },
  "meta": {
    "timestamp": "2026-07-24T12:00:00Z",
    "version": "v1"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid IDs
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Event not found
- `500 Internal Server Error` - Server error

---

### 4. Update Event

**Request:**
```
PATCH /api/v1/organizations/:orgId/events/:eventId
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (All fields optional):**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "eventDate": "2026-07-26T10:00:00Z",
  "startTime": "10:00",
  "endTime": "11:30",
  "location": "Updated Location",
  "maxCapacity": 600,
  "status": "active",
  "allowMultipleCheckins": true
}
```

**Status Update Values:**
- `draft` - Draft status
- `scheduled` - Scheduled for future
- `active` - Currently ongoing
- `completed` - Finished
- `cancelled` - Cancelled

**Response (200 OK):**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "description": "Updated description",
    "eventDate": "2026-07-26T10:00:00Z",
    "startTime": "10:00",
    "endTime": "11:30",
    "location": "Updated Location",
    "maxCapacity": 600,
    "remainingCapacity": 550,
    "registrationCount": 50,
    "status": "active",
    "churchId": "uuid",
    "organizationId": "uuid",
    "createdAt": "2026-07-24T12:00:00Z",
    "updatedAt": "2026-07-24T12:30:00Z"
  },
  "meta": {
    "timestamp": "2026-07-24T12:30:00Z",
    "version": "v1"
  }
}
```

**Status Codes:**
- `200 OK` - Updated successfully
- `400 Bad Request` - Invalid IDs
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Event not found
- `422 Unprocessable Entity` - Validation errors or no fields to update
- `500 Internal Server Error` - Server error

---

### 5. Delete Event

**Request:**
```
DELETE /api/v1/organizations/:orgId/events/:eventId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```
204 No Content
```

**Status Codes:**
- `204 No Content` - Deleted successfully
- `400 Bad Request` - Invalid IDs
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Event not found
- `500 Internal Server Error` - Server error

---

### 6. List Event Attendees

**Request:**
```
GET /api/v1/organizations/:orgId/events/:eventId/attendees
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (min: 1) |
| pageSize | number | No | 20 | Items per page (1-100) |
| status | enum | No | - | Filter by status: `registered`, `checked_in`, `no_show`, `cancelled` |
| sortBy | string | No | registeredAt | Sort field |
| order | string | No | desc | Sort order: `asc`, `desc` |

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "attendeeId": "uuid",
      "attendeeName": "John Doe",
      "attendeeEmail": "john@example.com",
      "attendeePhone": "+1234567890",
      "ageCategory": "adults",
      "sex": "male",
      "visitorStatus": "member",
      "leadershipRole": "none",
      "qrToken": "secure-token",
      "status": "checked_in",
      "registeredAt": "2026-07-24T12:00:00Z",
      "checkedInAt": "2026-07-25T10:15:00Z",
      "createdAt": "2026-07-24T12:00:00Z",
      "updatedAt": "2026-07-25T10:15:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 50,
      "count": 20,
      "page": 1,
      "pageSize": 20,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "timestamp": "2026-07-24T12:00:00Z",
    "version": "v1"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid IDs
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Event not found
- `422 Unprocessable Entity` - Invalid query parameters
- `500 Internal Server Error` - Server error

---

### 7. Get Event Statistics

**Request:**
```
GET /api/v1/organizations/:orgId/events/:eventId/statistics
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "code": 200,
  "data": {
    "eventId": "uuid",
    "eventName": "Sunday Service",
    "eventDate": "2026-07-25T10:00:00Z",
    "metrics": {
      "totalRegistered": 50,
      "totalCheckedIn": 45,
      "attendancePercentage": 90,
      "remainingAttendees": 5,
      "capacityUtilization": 10
    },
    "demographics": {
      "byAgeCategory": [
        {
          "category": "children",
          "count": 10,
          "percentage": 20
        },
        {
          "category": "high_school",
          "count": 8,
          "percentage": 16
        },
        {
          "category": "college",
          "count": 12,
          "percentage": 24
        },
        {
          "category": "career",
          "count": 15,
          "percentage": 30
        },
        {
          "category": "adults",
          "count": 3,
          "percentage": 6
        },
        {
          "category": "seniors",
          "count": 2,
          "percentage": 4
        }
      ],
      "byMembership": [
        {
          "status": "member",
          "count": 40,
          "percentage": 80
        },
        {
          "status": "visitor",
          "count": 8,
          "percentage": 16
        },
        {
          "status": "first_time_guest",
          "count": 2,
          "percentage": 4
        }
      ]
    },
    "registration": {
      "visitorCount": 10,
      "memberCount": 40
    }
  },
  "meta": {
    "timestamp": "2026-07-24T12:00:00Z",
    "version": "v1"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid IDs
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Event not found
- `500 Internal Server Error` - Server error

---

## Error Responses

All error responses follow this format:

```json
{
  "status": "error",
  "code": 400,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-07-24T12:00:00Z",
    "version": "v1"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Invalid request format |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Field validation failed |
| CONFLICT | 409 | Invalid state or duplicate |
| SERVER_ERROR | 500 | Internal server error |

---

## Authentication

All endpoints (except public registration endpoints) require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

---

## Rate Limiting

- No rate limit implemented yet
- Subject to change based on deployment environment

---

## Pagination

List endpoints support pagination with the following parameters:

```
?page=1&pageSize=20&sortBy=eventDate&order=asc
```

**Default values:**
- `page`: 1
- `pageSize`: 20
- `sortBy`: depends on endpoint
- `order`: asc

**Constraints:**
- Minimum pageSize: 1
- Maximum pageSize: 100

---

## Example Usage

### List all upcoming events
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/api/v1/organizations/org-id/events?futureOnly=true&pageSize=10"
```

### Create a new event
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "churchId": "church-id",
    "title": "Sunday Service",
    "eventDate": "2026-07-25T10:00:00Z",
    "location": "Main Hall"
  }' \
  "https://api.example.com/api/v1/organizations/org-id/events"
```

### Get event statistics
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/api/v1/organizations/org-id/events/event-id/statistics"
```

---

## Implementation Notes

- All timestamps are in ISO 8601 format (UTC)
- All IDs are UUIDs (v4)
- Event access is scoped to the organization
- Event deletion is permanent
- Multiple check-ins are controlled by `allowMultipleCheckins` flag
- Attendance statistics are computed in real-time

**Commit**: See repository for latest implementation
