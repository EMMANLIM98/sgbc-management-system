# 📱 Mobile REST API Documentation

## Overview

Complete REST API for mobile apps to connect with SGBC Management System. All endpoints are production-ready and reuse existing DDD service layer.

**Base URL:** `https://sgbc-management-system.vercel.app/api`

---

## 🚀 Endpoints

### 1. List Public Events

```http
GET /api/events
```

**Description:** Retrieve all active events with pagination

**Query Parameters:**

| Parameter | Type     | Default | Description                  |
| --------- | -------- | ------- | ---------------------------- |
| limit     | number   | 50      | Results per page (1-100)     |
| offset    | number   | 0       | Pagination offset            |
| fromDate  | ISO date | today   | Filter events from this date |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "Sunday Service",
        "description": "Weekly worship service",
        "eventDate": "2026-07-27",
        "startTime": "09:00",
        "endTime": "11:00",
        "location": "Main Sanctuary",
        "maxCapacity": 500,
        "status": "scheduled"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "Failed to load events",
  "message": "Database error details"
}
```

---

### 2. Get Event Details

```http
GET /api/events/:eventId
```

**Description:** Get full details for a specific event including capacity info

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| eventId   | UUID | Yes      | Event ID    |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Sunday Service",
    "description": "Weekly worship service",
    "eventDate": "2026-07-27",
    "startTime": "09:00",
    "endTime": "11:00",
    "location": "Main Sanctuary",
    "maxCapacity": 500,
    "registeredCount": 342,
    "remainingCapacity": 158,
    "status": "scheduled",
    "churchId": "uuid",
    "organizationId": "uuid"
  }
}
```

**Error (404):**

```json
{
  "success": false,
  "error": "Event not found or is not accepting registrations"
}
```

---

### 3. Register for Event

```http
POST /api/events/:eventId/register
```

**Description:** Register an attendee for an event (public, no authentication)

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| eventId   | UUID | Yes      | Event ID    |

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "ageCategory": "adults",
  "sex": "male",
  "visitorStatus": "member",
  "leadershipRole": "pastor"
}
```

**Field Details:**

| Field          | Type   | Required | Options                                                                                                                            |
| -------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| firstName      | string | Yes      | 1-80 chars                                                                                                                         |
| lastName       | string | Yes      | 1-80 chars                                                                                                                         |
| email          | string | Yes      | Valid email                                                                                                                        |
| phone          | string | No       | Max 40 chars                                                                                                                       |
| ageCategory    | enum   | No       | children, youth, young_adults, adults, seniors                                                                                     |
| sex            | enum   | No       | male, female                                                                                                                       |
| visitorStatus  | enum   | No       | member, visitor, first_time_guest (default: first_time_guest)                                                                      |
| leadershipRole | enum   | No       | pastor, pastor_wife, pastor_children, associate_pastor, elder, deacon, preacher, evangelist, ministry_leader, none (default: none) |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "registration-uuid",
    "attendeeName": "John Doe",
    "qrToken": "qr-code-token-here",
    "message": "Registration successful! Your QR code has been sent to your email"
  }
}
```

**Response (429) - Rate Limited:**

```json
{
  "success": false,
  "error": "Too many registration attempts",
  "message": "Please wait a few minutes and try again"
}
```

**Response (409) - Duplicate/Full:**

```json
{
  "success": false,
  "error": "Already registered",
  "message": "This email is already registered for this event"
}
```

**Response (400) - Validation Error:**

```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["firstName"],
      "message": "Expected string, received number"
    }
  ]
}
```

---

### 4. Check-In with QR Code

```http
POST /api/events/:eventId/check-in
```

**Description:** Process check-in by scanning QR code from registration

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| eventId   | UUID | Yes      | Event ID    |

**Request Body:**

```json
{
  "qrToken": "token-from-qr-scan",
  "checkedInBy": "staff-member-id",
  "deviceId": "mobile-device-uuid",
  "deviceName": "iPad Pro",
  "location": "Main Entrance"
}
```

**Field Details:**

| Field       | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| qrToken     | string | Yes      | QR token from registration         |
| checkedInBy | string | Yes      | Staff ID or device identifier      |
| deviceId    | string | No       | Mobile device UUID for audit trail |
| deviceName  | string | No       | Device name (iPhone, iPad, etc.)   |
| location    | string | No       | Check-in location (entrance, etc.) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Successfully checked in John Doe",
    "registration": {
      "id": "registration-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "checked_in",
      "ageCategory": "adults",
      "sex": "male"
    },
    "checkedInAt": "2026-07-27T14:30:45.123Z"
  }
}
```

**Response (400) - Invalid QR:**

```json
{
  "success": false,
  "error": "Invalid QR code",
  "errorCode": "QR_NOT_FOUND"
}
```

**Error Codes:**

| Code                         | Meaning                                      |
| ---------------------------- | -------------------------------------------- |
| QR_NOT_FOUND                 | QR code doesn't exist                        |
| QR_EVENT_MISMATCH            | QR code for different event                  |
| EVENT_NOT_FOUND              | Event doesn't exist                          |
| EVENT_NOT_ACTIVE             | Event not active for check-ins               |
| REGISTRATION_NOT_FOUND       | Registration doesn't exist                   |
| REGISTRATION_CANCELLED       | Registration was cancelled                   |
| REGISTRATION_ALREADY_CHECKED | Already checked in (if multiple not allowed) |

---

### 5. Validate QR Code

```http
POST /api/events/:eventId/validate-qr
```

**Description:** Validate a QR code without checking in (preview/verification)

**Path Parameters:**

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| eventId   | UUID | Yes      | Event ID    |

**Request Body:**

```json
{
  "qrToken": "token-from-qr-scan"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "QR code is valid",
    "registration": {
      "id": "registration-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "isCheckedIn": false
    }
  }
}
```

**Response (400) - Invalid:**

```json
{
  "success": false,
  "error": "Invalid QR code"
}
```

---

## 📲 Mobile App Integration Examples

### Flutter Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class EventAPI {
  static const String baseUrl = 'https://sgbc-management-system.vercel.app/api';

  // List events
  static Future<List<Event>> getEvents({int limit = 50, int offset = 0}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/events?limit=$limit&offset=$offset'),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return (json['data']['events'] as List)
          .map((e) => Event.fromJson(e))
          .toList();
    }
    throw Exception('Failed to load events');
  }

  // Register for event
  static Future<RegistrationResponse> registerForEvent(
    String eventId,
    String firstName,
    String lastName,
    String email,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/events/$eventId/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'visitorStatus': 'visitor',
        'leadershipRole': 'none',
      }),
    );

    if (response.statusCode == 201) {
      final json = jsonDecode(response.body);
      return RegistrationResponse.fromJson(json['data']);
    }
    throw Exception('Registration failed');
  }

  // Check-in
  static Future<CheckInResponse> checkIn(
    String eventId,
    String qrToken,
    String staffId,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/events/$eventId/check-in'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'qrToken': qrToken,
        'checkedInBy': staffId,
      }),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return CheckInResponse.fromJson(json['data']);
    }
    throw Exception('Check-in failed');
  }
}
```

### React Native Example

```javascript
const eventAPI = {
  baseURL: "https://sgbc-management-system.vercel.app/api",

  async getEvents(limit = 50, offset = 0) {
    const response = await fetch(`${this.baseURL}/events?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    return data.data.events;
  },

  async registerForEvent(eventId, { firstName, lastName, email, phone }) {
    const response = await fetch(`${this.baseURL}/events/${eventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        visitorStatus: "visitor",
        leadershipRole: "none",
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async checkIn(eventId, qrToken, staffId) {
    const response = await fetch(`${this.baseURL}/events/${eventId}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrToken,
        checkedInBy: staffId,
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },
};
```

### Swift Example

```swift
import Foundation

class EventAPI {
    static let baseURL = "https://sgbc-management-system.vercel.app/api"

    static func getEvents(limit: Int = 50, offset: Int = 0) async throws -> [Event] {
        let url = URL(string: "\(baseURL)/events?limit=\(limit)&offset=\(offset)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(EventResponse.self, from: data)
        return response.data.events
    }

    static func registerForEvent(
        eventId: String,
        firstName: String,
        lastName: String,
        email: String,
        phone: String? = nil
    ) async throws -> RegistrationResponse {
        let url = URL(string: "\(baseURL)/events/\(eventId)/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "firstName": firstName,
            "lastName": lastName,
            "email": email,
            "phone": phone,
            "visitorStatus": "visitor",
            "leadershipRole": "none",
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(RegisterResponse.self, from: data)
        return response.data
    }

    static func checkIn(
        eventId: String,
        qrToken: String,
        staffId: String
    ) async throws -> CheckInResponse {
        let url = URL(string: "\(baseURL)/events/\(eventId)/check-in")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = [
            "qrToken": qrToken,
            "checkedInBy": staffId,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(CheckInResponseWrapper.self, from: data)
        return response.data
    }
}
```

---

## ✅ Rate Limiting & Security

### Rate Limiting

- **Registration endpoint:** Max 3 registrations per email address per 5 minutes
- **Other endpoints:** No limit (suitable for mobile apps)

### Best Practices

1. **Store QR tokens securely** - Don't expose in logs
2. **Use HTTPS only** - All requests must be encrypted
3. **Validate email addresses** - Mobile apps should confirm emails
4. **Handle network errors** - Implement retry logic with backoff
5. **Cache events locally** - Reduce API calls for event lists

### Error Handling

All endpoints follow standard error response format:

```json
{
  "success": false,
  "error": "Error title",
  "message": "Detailed error message"
}
```

---

## 🔄 Workflows

### Registration Workflow

```
1. User opens mobile app
2. User sees list: GET /api/events
3. User selects event: GET /api/events/:eventId
4. User fills registration form
5. User submits: POST /api/events/:eventId/register
6. Get QR token + confirmation email
```

### Check-In Workflow

```
1. Staff member scans QR code
2. QR scanner decodes token
3. Staff confirms event ID
4. Send: POST /api/events/:eventId/check-in
5. Show success with attendee details
6. Audit trail recorded automatically
```

### QR Verification Workflow

```
1. Staff scans QR
2. Verify before full check-in: POST /api/events/:eventId/validate-qr
3. Show registration details for confirmation
4. If correct, proceed with check-in
```

---

## 📊 Automatic Features

These happen automatically after registration:

- ✅ **Confirmation email** sent to attendee
- ✅ **QR code email** with scannable code
- ✅ **n8n webhook** triggered (CRM sync, email lists, etc.)
- ✅ **Duplicate prevention** across all registrations
- ✅ **Capacity enforcement** at registration time
- ✅ **Audit trail** for all check-ins

---

## 🆘 Troubleshooting

| Issue                  | Solution                                           |
| ---------------------- | -------------------------------------------------- |
| 429 Too Many Requests  | Wait 5 minutes before retrying same email          |
| 409 Already Registered | Email already registered for this event            |
| 404 Event Not Found    | Event doesn't exist or not accepting registrations |
| Invalid QR Code        | QR code expired or incorrect event                 |
| Validation errors      | Check field types and required fields              |

---

## 📞 Support

For issues or questions:

1. Check endpoint response format matches examples
2. Verify all required fields are provided
3. Ensure HTTP method is correct (GET vs POST)
4. Check QR token format from registration response

**API Status:** ✅ Production Ready
**Last Updated:** 2026-07-23
**Version:** 1.0
