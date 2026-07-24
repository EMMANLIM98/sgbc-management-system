# Membership Module API Documentation

**Version**: 1.0  
**Status**: Production Ready ⭐⭐⭐⭐⭐  
**Last Updated**: 2026-07-24

---

## Overview

The Membership Module API provides complete RESTful endpoints for managing church member records, including member CRUD operations, search, document management, and member lifecycle operations.

**Base URL**: `/api/v1/organizations/:orgId/members`

---

## Resource Models

### Member DTO
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1-234-567-8900",
  "dateOfBirth": "1990-01-15T00:00:00Z",
  "address": "123 Main St",
  "status": "active|inactive|transferred|deceased",
  "joinDate": "2023-01-01T00:00:00Z",
  "churchId": "uuid",
  "organizationId": "uuid",
  "leadershipRole": "deacon|deaconess|usher|etc",
  "createdAt": "2023-01-01T10:00:00Z",
  "updatedAt": "2023-06-01T15:30:00Z"
}
```

### Member Detail DTO (Extended)
```json
{
  ...MemberDTO,
  "totalContributions": 5000.50,
  "pledges": [
    {
      "id": "uuid",
      "amount": 1000.00,
      "frequency": "monthly",
      "status": "active"
    }
  ],
  "eventAttendance": 24,
  "lastAttendanceDate": "2026-07-20T10:00:00Z",
  "notes": "Faithful member"
}
```

### Member Summary DTO (Lightweight)
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active",
  "joinDate": "2023-01-01T00:00:00Z",
  "leadershipRole": "deacon"
}
```

### Member Document DTO
```json
{
  "id": "uuid",
  "memberId": "uuid",
  "documentType": "identification|certificate|etc",
  "fileName": "ID_Card.pdf",
  "fileUrl": "https://storage.example.com/...",
  "uploadedAt": "2023-06-15T12:00:00Z",
  "uploadedBy": "admin-user"
}
```

---

## Endpoints

### 1. List Members

**Endpoint**: `GET /api/v1/organizations/:orgId/members`

**Description**: Retrieve all members with pagination and filtering

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `pageSize` | integer | No | 20 | Items per page (max: 100) |
| `status` | string | No | - | Filter: active, inactive, transferred, deceased |
| `category` | string | No | - | Filter: member, visitor, prospect |
| `sortBy` | string | No | name | Sort field: name, joinDate, createdAt |
| `order` | string | No | asc | Sort order: asc, desc |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": 200,
  "data": [ /* MemberDTO array */ ],
  "pagination": {
    "total": 150,
    "count": 20,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl "http://localhost:5173/api/v1/organizations/{orgId}/members?page=1&pageSize=20&status=active"
```

---

### 2. Create Member

**Endpoint**: `POST /api/v1/organizations/:orgId/members`

**Description**: Create a new member record

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1-234-567-8900",
  "category": "member",
  "churchId": "uuid",
  "joinDate": "2026-07-24",
  "dateOfBirth": "1995-05-10",
  "gender": "female",
  "maritalStatus": "single",
  "occupation": "Engineer",
  "baptismDate": "2023-01-15"
}
```

**Validation Rules**:
- `name` - Required, minimum 2 characters
- `email` - Optional, must be valid email format
- `phone` - Optional
- `category` - Optional, defaults to "member"
- `joinDate` - Optional, defaults to today
- All date fields must be in ISO 8601 format

**Response** (201 Created):
```json
{
  "status": "success",
  "code": 201,
  "data": { /* MemberDTO */ },
  "meta": { /* ... */ }
}
```

**Headers**:
```
Location: /api/v1/organizations/{orgId}/members/{memberId}
```

**Error Responses**:
- `400 Bad Request` - Missing required fields
- `422 Unprocessable Entity` - Validation errors
- `409 Conflict` - Duplicate email
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X POST "http://localhost:5173/api/v1/organizations/{orgId}/members" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "category": "member",
    "churchId": "uuid"
  }'
```

---

### 3. Get Member Details

**Endpoint**: `GET /api/v1/organizations/:orgId/members/:memberId`

**Description**: Retrieve detailed information for a specific member

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `orgId` | UUID | Organization ID |
| `memberId` | UUID | Member ID |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": 200,
  "data": { /* MemberDetailDTO */ },
  "meta": { /* ... */ }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid ID format
- `404 Not Found` - Member not found
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}"
```

---

### 4. Update Member

**Endpoint**: `PATCH /api/v1/organizations/:orgId/members/:memberId`

**Description**: Update member information (partial update)

**Request Body** (all fields optional):
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1-987-654-3210",
  "dateOfBirth": "1992-03-20",
  "gender": "male",
  "maritalStatus": "married",
  "occupation": "Teacher"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "code": 200,
  "data": { /* Updated MemberDTO */ },
  "meta": { /* ... */ }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid ID format
- `404 Not Found` - Member not found
- `422 Unprocessable Entity` - Validation errors
- `409 Conflict` - Duplicate email
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X PATCH "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith Updated",
    "phone": "+1-987-654-3210"
  }'
```

---

### 5. Deactivate Member

**Endpoint**: `DELETE /api/v1/organizations/:orgId/members/:memberId`

**Description**: Soft delete (deactivate) a member

**Response** (204 No Content):
```
No response body
```

**Error Responses**:
- `400 Bad Request` - Invalid ID format
- `404 Not Found` - Member not found
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X DELETE "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}"
```

---

### 6. Reactivate Member

**Endpoint**: `POST /api/v1/organizations/:orgId/members/:memberId/activate`

**Description**: Reactivate an inactive member

**Request Body**: None required

**Response** (200 OK):
```json
{
  "status": "success",
  "code": 200,
  "data": { /* Reactivated MemberDTO */ },
  "meta": { /* ... */ }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid ID format
- `404 Not Found` - Member not found
- `409 Conflict` - Member already active
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X POST "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}/activate"
```

---

### 7. Search Members

**Endpoint**: `POST /api/v1/organizations/:orgId/members/search`

**Description**: Search members by name, email, or phone

**Query Parameters**:
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `page` | integer | No | 1 |
| `pageSize` | integer | No | 20 |

**Request Body**:
```json
{
  "searchTerm": "John"
}
```

**Validation Rules**:
- `searchTerm` - Required, minimum 2 characters, maximum 100

**Response** (200 OK):
```json
{
  "status": "success",
  "code": 200,
  "data": [ /* MemberSummaryDTO array */ ],
  "pagination": { /* ... */ },
  "meta": { /* ... */ }
}
```

**Error Responses**:
- `422 Unprocessable Entity` - Invalid search term
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X POST "http://localhost:5173/api/v1/organizations/{orgId}/members/search?page=1&pageSize=20" \
  -H "Content-Type: application/json" \
  -d '{ "searchTerm": "John" }'
```

---

### 8. Get Member Documents

**Endpoint**: `GET /api/v1/organizations/:orgId/members/:memberId/documents`

**Description**: Retrieve all documents for a member

**Response** (200 OK):
```json
{
  "status": "success",
  "code": 200,
  "data": [ /* MemberDocumentDTO array */ ],
  "meta": { /* ... */ }
}
```

**Error Responses**:
- `404 Not Found` - Member not found
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}/documents"
```

---

### 9. Upload Member Document

**Endpoint**: `POST /api/v1/organizations/:orgId/members/:memberId/documents`

**Description**: Upload a document for a member

**Request Body**:
```json
{
  "fileName": "ID_Card.pdf",
  "fileType": "application/pdf",
  "fileUrl": "https://storage.example.com/uploads/id_card.pdf",
  "documentType": "identification"
}
```

**Validation Rules**:
- `fileName` - Required, max 255 characters
- `fileType` - Required (MIME type)
- `fileUrl` - Required, must be valid URL
- `documentType` - Optional

**Response** (201 Created):
```json
{
  "status": "success",
  "code": 201,
  "data": { /* MemberDocumentDTO */ },
  "meta": { /* ... */ }
}
```

**Headers**:
```
Location: /api/v1/organizations/{orgId}/members/{memberId}/documents/{docId}
```

**Error Responses**:
- `404 Not Found` - Member not found
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X POST "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "ID_Card.pdf",
    "fileType": "application/pdf",
    "fileUrl": "https://storage.example.com/uploads/id_card.pdf",
    "documentType": "identification"
  }'
```

---

### 10. Delete Member Document

**Endpoint**: `DELETE /api/v1/organizations/:orgId/members/:memberId/documents/:docId`

**Description**: Delete a member document

**Response** (204 No Content):
```
No response body
```

**Error Responses**:
- `404 Not Found` - Member or document not found
- `500 Internal Server Error` - Server error

**cURL Example**:
```bash
curl -X DELETE "http://localhost:5173/api/v1/organizations/{orgId}/members/{memberId}/documents/{docId}"
```

---

## Error Response Format

All error responses follow this standard format:

```json
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-24T10:30:00Z",
    "version": "v1"
  }
}
```

**Error Types**:
- `ValidationError` - Field validation failed (422)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Duplicate or business rule violation (409)
- `BadRequestError` - Invalid request (400)
- `InternalServerError` - Unexpected error (500)

**Error Codes**:
- `INVALID_EMAIL` - Email format is invalid
- `INVALID_PHONE` - Phone format is invalid
- `DUPLICATE_EMAIL` - Email already exists
- `INVALID_DATE` - Date format or value is invalid
- `MEMBER_NOT_FOUND` - Member does not exist
- `ALREADY_ACTIVE` - Member is already active
- `INVALID_STATE_TRANSITION` - Cannot transition to this state

---

## Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PATCH operations |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid parameters or ID format |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate or business rule violation |
| 422 | Unprocessable Entity | Validation error with details |
| 500 | Server Error | Unexpected server error |

---

## Best Practices

### 1. Pagination
Always paginate large lists to avoid performance issues:
```bash
# Good: Paginated
curl "api/members?page=1&pageSize=20"

# Avoid: No pagination
curl "api/members"
```

### 2. Filtering
Filter on server side for better performance:
```bash
# Good: Filtered on server
curl "api/members?status=active&category=member"

# Avoid: Fetch all then filter on client
curl "api/members"
```

### 3. Partial Updates
Use PATCH for partial updates instead of PUT:
```bash
# Good: PATCH for partial updates
curl -X PATCH "api/members/{id}" -d '{"name": "New Name"}'

# Avoid: PUT requires all fields
curl -X PUT "api/members/{id}" -d '{...all fields}'
```

### 4. Search
Use POST for search with complex criteria:
```bash
# Good: POST for search
curl -X POST "api/members/search" -d '{"searchTerm": "John"}'
```

### 5. Error Handling
Always check error type and code in responses:
```json
if (error.type === "ValidationError") {
  // Handle validation errors with field-level details
  error.details.forEach(detail => {
    console.error(`${detail.field}: ${detail.message}`);
  });
} else if (error.code === "DUPLICATE_EMAIL") {
  // Handle duplicate email specifically
}
```

---

## Common Workflows

### Create and Verify Member
```bash
# 1. Create member
curl -X POST "api/members" \
  -d '{"name": "John", "email": "john@example.com"}'
# Response: 201 with Location header and MemberDTO

# 2. Get details using ID from response
curl "api/members/{memberId}"
# Response: 200 with MemberDetailDTO

# 3. Verify in list
curl "api/members?sortBy=joinDate&order=desc&pageSize=5"
```

### Update and Document
```bash
# 1. Update member
curl -X PATCH "api/members/{memberId}" \
  -d '{"phone": "+1-234-567-8900"}'
# Response: 200 with updated MemberDTO

# 2. Upload identification document
curl -X POST "api/members/{memberId}/documents" \
  -d '{"fileName": "ID.pdf", "documentType": "identification"}'
# Response: 201 with MemberDocumentDTO
```

### Search and Filter
```bash
# 1. Search by name
curl -X POST "api/members/search" \
  -d '{"searchTerm": "John"}'
# Response: 200 with paginated MemberSummaryDTO[]

# 2. Filter active members by category
curl "api/members?status=active&category=member&pageSize=50"
# Response: 200 with paginated MemberDTO[]
```

### Deactivate and Reactivate
```bash
# 1. Deactivate member
curl -X DELETE "api/members/{memberId}"
# Response: 204 No Content

# 2. Reactivate member
curl -X POST "api/members/{memberId}/activate"
# Response: 200 with reactivated MemberDTO
```

---

## Performance Considerations

### Response Size
- Use `pageSize=50` maximum for better performance
- DTOs exclude unnecessary fields (response ~1.5KB per member)
- Summary DTOs for lists (response ~0.5KB per member)
- Detail DTOs only when needed (includes statistics)

### Database Queries
- List endpoint: Single query with pagination
- Search endpoint: Index on name/email/phone
- Detail endpoint: Single query with joins for statistics
- Documents endpoint: Single query per member

### Caching Strategy
- Cache member list for 5 minutes
- Cache detail view for 15 minutes
- Invalidate cache on PATCH/POST/DELETE
- Search results not cached (real-time required)

---

## Integration Examples

### Frontend (JavaScript)
```javascript
// List members with pagination
const response = await fetch(
  '/api/v1/organizations/orgId/members?page=1&pageSize=20'
);
const { data, pagination } = await response.json();

// Create member
const newMember = await fetch(
  '/api/v1/organizations/orgId/members',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jane',
      email: 'jane@example.com'
    })
  }
);

// Search members
const search = await fetch(
  '/api/v1/organizations/orgId/members/search?page=1',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchTerm: 'John' })
  }
);
```

### Mobile App (Swift)
```swift
// List members
let url = URL(string: "http://api.example.com/api/v1/organizations/\(orgId)/members")!
let request = URLRequest(url: url)
let (data, _) = try await URLSession.shared.data(for: request)
let response = try JSONDecoder().decode(ApiResponse<[MemberDTO]>.self, from: data)

// Create member
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try JSONEncoder().encode(newMember)
let (data, _) = try await URLSession.shared.data(for: request)
```

---

## Troubleshooting

### Issue: 422 Validation Error
**Cause**: Invalid or missing fields  
**Solution**: Check error details array for specific field errors
```json
{
  "code": 422,
  "error": {
    "details": [
      { "field": "email", "message": "Invalid email format", "code": "INVALID_EMAIL" }
    ]
  }
}
```

### Issue: 409 Conflict
**Cause**: Duplicate email or invalid state transition  
**Solution**: Check error code - either use different email or verify member state
```json
{
  "code": 409,
  "error": {
    "code": "DUPLICATE_EMAIL",
    "details": { "email": "john@example.com" }
  }
}
```

### Issue: 404 Not Found
**Cause**: Member doesn't exist in this organization  
**Solution**: Verify memberId and orgId are correct
```bash
# First verify member exists in org
curl "api/members?pageSize=100" | grep memberId

# Then try specific member
curl "api/members/{memberId}"
```

---

## Changelog

### Version 1.0 (2026-07-24)
- Initial release with full CRUD operations
- Member search functionality
- Document management
- Member lifecycle (activate/deactivate)
- Comprehensive error handling
- RESTful API design compliance

---

**Status**: ✅ Production Ready  
**Quality**: ⭐⭐⭐⭐⭐  
**Next Phase**: Finance Module API Documentation
