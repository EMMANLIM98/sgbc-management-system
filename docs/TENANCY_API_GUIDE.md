# Tenancy Module API Documentation

**Version**: 1.0  
**Status**: Production Ready ⭐⭐⭐⭐⭐  
**Last Updated**: 2026-07-24

---

## Overview

The Tenancy Module API provides comprehensive RESTful endpoints for managing multi-tenant organizations, user roles, and organizational hierarchy within the church management system.

**Base URL**: `/api/v1`

---

## Resource Models

### Organization DTO

```json
{
  "id": "uuid",
  "name": "SGBC - Antipolo",
  "description": "Antipolo branch",
  "isActive": true,
  "memberCount": 45,
  "admins": ["admin-uuid"],
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

### Organization Detail DTO

```json
{
  "id": "uuid",
  "name": "SGBC - Antipolo",
  "description": "Antipolo branch",
  "isActive": true,
  "memberCount": 45,
  "admins": ["admin-uuid"],
  "totalMembers": 45,
  "totalAdmins": 2,
  "totalOwners": 1,
  "churchCount": 1,
  "eventCount": 12,
  "contributionTotal": 125000.5,
  "currency": "PHP",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

### Organization Member DTO

```json
{
  "userId": "uuid",
  "userName": "John Admin",
  "userEmail": "john@example.com",
  "role": "admin",
  "status": "active",
  "joinedAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

### Organization Statistics DTO

```json
{
  "organizationId": "uuid",
  "organizationName": "SGBC - Antipolo",
  "totalMembers": 45,
  "totalAdmins": 2,
  "totalOwners": 1,
  "memberJoinedThisMonth": 3,
  "activeChurches": 1,
  "totalEvents": 12,
  "totalContributions": 125000.5,
  "generatedAt": "2026-07-24T10:30:00Z"
}
```

---

## Endpoints

### ORGANIZATIONS

#### 1. List Organizations

**Endpoint**: `GET /api/v1/organizations`

**Description**: Retrieve all organizations with pagination and filtering

**Query Parameters**:

| Parameter  | Type    | Required | Default | Description                        |
| ---------- | ------- | -------- | ------- | ---------------------------------- |
| `page`     | integer | No       | 1       | Page number                        |
| `pageSize` | integer | No       | 20      | Items per page (max: 100)          |
| `status`   | string  | No       | -       | Filter: active, inactive           |
| `sortBy`   | string  | No       | name    | Sort: name, createdAt, memberCount |
| `order`    | string  | No       | asc     | Order: asc, desc                   |

**Response** (200 OK):

```json
{
  "status": "success",
  "code": 200,
  "data": [/* OrganizationDTO array */],
  "pagination": {/* pagination metadata */},
  "meta": { "timestamp": "...", "version": "v1" }
}
```

**cURL Example**:

```bash
curl "http://localhost:5173/api/v1/organizations?page=1&pageSize=20&status=active"
```

---

#### 2. Create Organization

**Endpoint**: `POST /api/v1/organizations`

**Description**: Create a new organization (admin only)

**Request Body**:

```json
{
  "name": "SGBC - New Branch",
  "description": "New branch description"
}
```

**Response** (201 Created):

```json
{
  "status": "success",
  "code": 201,
  "data": {/* OrganizationDTO */},
  "meta": {/* ... */}
}
```

**Headers**: `Location: /api/v1/organizations/{id}`

---

#### 3. Get Organization

**Endpoint**: `GET /api/v1/organizations/:orgId`

**Description**: Get organization details with statistics

**Response** (200 OK): OrganizationDetailDTO

**Error Responses**: 400 (invalid format), 404 (not found), 500

---

#### 4. Update Organization

**Endpoint**: `PATCH /api/v1/organizations/:orgId`

**Description**: Update organization information (admin only)

**Request Body** (partial):

```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response** (200 OK): Updated OrganizationDTO

**Error Responses**: 400, 404, 422, 500

---

#### 5. Delete Organization

**Endpoint**: `DELETE /api/v1/organizations/:orgId`

**Description**: Delete organization (soft delete, owner only)

**Response** (204 No Content)

**Error Responses**: 404, 409 (has dependencies), 500

---

### ORGANIZATION MEMBERS

#### 1. List Members

**Endpoint**: `GET /api/v1/organizations/:orgId/members`

**Description**: List all members in an organization

**Query Parameters**:

| Parameter  | Type    | Description                  |
| ---------- | ------- | ---------------------------- |
| `page`     | integer | Page number                  |
| `pageSize` | integer | Items per page               |
| `role`     | string  | Filter: owner, admin, member |
| `sortBy`   | string  | Sort: name, joinedAt         |
| `order`    | string  | asc, desc                    |

**Response** (200 OK): Paginated OrganizationMemberDTO[]

**cURL Example**:

```bash
curl "http://localhost:5173/api/v1/organizations/{orgId}/members?role=admin"
```

---

#### 2. Assign Member Role

**Endpoint**: `POST /api/v1/organizations/:orgId/members/:userId/assign-role`

**Description**: Assign or update a user's role in organization (admin only)

**Request Body**:

```json
{
  "role": "admin"
}
```

**Role Options**: `"owner"`, `"admin"`, `"member"`

**Response** (200 OK): Updated OrganizationMemberDTO

**Error Responses**: 400, 404, 422, 500

---

#### 3. Remove Member

**Endpoint**: `DELETE /api/v1/organizations/:orgId/members/:userId`

**Description**: Remove user from organization (admin only)

**Response** (204 No Content)

**Error Responses**: 404, 409 (last owner), 500

---

### ORGANIZATION STATISTICS

#### Organization Statistics

**Endpoint**: `GET /api/v1/organizations/:orgId/statistics`

**Description**: Get organization statistics and KPIs

**Response** (200 OK): OrganizationStatisticsDTO

**Example Response**:

```json
{
  "status": "success",
  "code": 200,
  "data": {
    "organizationId": "org-123",
    "organizationName": "SGBC - Antipolo",
    "totalMembers": 45,
    "totalAdmins": 2,
    "totalOwners": 1,
    "memberJoinedThisMonth": 3,
    "activeChurches": 1,
    "totalEvents": 12,
    "totalContributions": 125000.5,
    "generatedAt": "2026-07-24T10:30:00Z"
  },
  "meta": { "timestamp": "...", "version": "v1" }
}
```

---

## Common Workflows

### Create Organization and Invite Members

```bash
# 1. Create organization
curl -X POST "api/v1/organizations" \
  -d '{ "name": "New Branch", "description": "..." }'
# Response: 201 with Location header

# 2. Assign roles to members
curl -X POST "api/v1/organizations/{orgId}/members/{userId}/assign-role" \
  -d '{ "role": "admin" }'
# Response: 200

# 3. List members
curl "api/v1/organizations/{orgId}/members"
```

### Manage Organization Hierarchy

```bash
# 1. List organizations
curl "api/v1/organizations?status=active"

# 2. Get organization details
curl "api/v1/organizations/{orgId}"

# 3. Get organization statistics
curl "api/v1/organizations/{orgId}/statistics"

# 4. Update organization
curl -X PATCH "api/v1/organizations/{orgId}" \
  -d '{ "name": "Updated Name" }'
```

---

## Error Response Format

All errors follow this format:

```json
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Organization name is required",
        "code": "INVALID_NAME"
      }
    ]
  },
  "meta": { "timestamp": "...", "version": "v1" }
}
```

**Error Codes**:

- `INVALID_NAME` - Organization name is required
- `ORGANIZATION_NOT_FOUND` - Organization not found
- `USER_NOT_FOUND` - User not found
- `NOT_MEMBER` - User is not member of organization
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `INVALID_ROLE` - Invalid role specified
- `LAST_OWNER` - Cannot remove last owner
- `ORG_HAS_DEPENDENCIES` - Organization has active dependencies

---

## Status Codes

| Code | Meaning              | When Used                            |
| ---- | -------------------- | ------------------------------------ |
| 200  | OK                   | Successful GET, PATCH                |
| 201  | Created              | POST creates organization            |
| 204  | No Content           | Successful DELETE                    |
| 400  | Bad Request          | Invalid parameters or ID format      |
| 404  | Not Found            | Organization/member not found        |
| 409  | Conflict             | Invalid operation (e.g., last owner) |
| 422  | Unprocessable Entity | Validation error                     |
| 500  | Server Error         | Unexpected error                     |

---

## Integration Examples

### JavaScript/Fetch

```javascript
// List organizations
const response = await fetch("/api/v1/organizations?page=1&pageSize=20");
const { data, pagination } = await response.json();

// Create organization
const result = await fetch("/api/v1/organizations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "New Organization",
    description: "Description",
  }),
});
const org = await result.json();

// Assign member role
await fetch("/api/v1/organizations/{orgId}/members/{userId}/assign-role", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "admin" }),
});
```

---

## Performance Tips

- Use appropriate pageSize (recommended: 20-50)
- Filter on server side, not client
- Cache organization list for 10 minutes
- Cache member list for 5 minutes
- Cache statistics for 15 minutes

---

## Best Practices

1. **Always validate IDs** - Check UUID format before API calls
2. **Handle paginated responses** - Implement pagination UI
3. **Implement error retry** - Retry 5xx errors with exponential backoff
4. **Cache strategy** - Cache lists intelligently
5. **Permission checks** - Verify user permissions before operations

---

**Status**: ✅ Production Ready  
**Quality**: ⭐⭐⭐⭐⭐

---

_Tenancy Module RESTful API Documentation_  
_Updated: 2026-07-24 | Role: Senior Backend Software Engineer_
