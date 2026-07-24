---
title: Endpoint Refactoring Example - Before & After
description: Concrete example showing how to refactor API endpoints to use service layer
---

# Endpoint Refactoring: Concrete Example

## 🎯 The Endpoint: Assign Role

**Purpose**: Assign or update a user's role in an organization

```
POST /api/v1/organizations/:orgId/members/:userId/assign-role
Body: { role: "owner" | "admin" | "member" }
Returns: 200 OK with updated OrganizationMemberDTO
```

---

## ❌ BEFORE: Procedural with TODOs

```typescript
/**
 * server/routes/api/tenancy/[orgId]/members/[userId].assign-role.post.ts
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors, assignRoleSchema } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const userId = event.context.params?.userId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!isValidUUID(orgId)) {
      return ApiResponse.badRequest("Invalid organization ID format");
    }

    if (!userId || typeof userId !== "string") {
      return ApiResponse.badRequest("User ID is required");
    }

    if (!isValidUUID(userId)) {
      return ApiResponse.badRequest("Invalid user ID format");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = assignRoleSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid role assignment data");
    }

    const { role } = validation.data;

    // TODO: Check authorization (current user must be org admin or owner)
    // TODO: Fetch organization
    // TODO: Fetch user-organization relationship
    // TODO: Verify user exists and is in organization
    // TODO: Update role (is_owner, is_org_admin flags)
    // TODO: Fetch updated profile
    // TODO: Convert to DTO
    // TODO: Return 200 OK

    // PLACEHOLDER - Returns mock data
    return ApiResponse.success(
      {
        userId,
        userName: "Jane Member",
        userEmail: "jane@example.com",
        role,
        status: "active",
        joinedAt: "2026-02-01T10:00:00Z",
        updatedAt: new Date().toISOString(),
      },
      200,
    );
  } catch (error) {
    console.error("Error assigning role:", error);
    return ApiResponse.serverError("Failed to assign role", "ASSIGN_ROLE_FAILED");
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

**Problems**:

- 🔴 Endpoint has TODO comments (incomplete)
- 🔴 Mixed concerns: validation, authorization, data access, mapping
- 🔴 Business logic scattered in routes
- 🔴 Hard to test
- 🔴 Difficult to reuse logic
- 🔴 No clear separation of layers

---

## ✅ AFTER: Clean Service Layer Pattern

### Step 1️⃣: Implement Service Layer

```typescript
/**
 * src/lib/services/organization.service.ts
 */

import {
  OrganizationRepository,
  MemberRepository,
  type IOrganizationRepository,
  type IMemberRepository,
} from "@/lib/repositories";
import type { OrganizationMemberDTO } from "@/lib/api/dto/tenancy.dto";
import { toOrganizationMemberDTO } from "@/lib/api/dto/tenancy.dto";

export class OrganizationService {
  private orgRepository: IOrganizationRepository;
  private memberRepository: IMemberRepository;

  constructor(orgRepository?: IOrganizationRepository, memberRepository?: IMemberRepository) {
    this.orgRepository = orgRepository || new OrganizationRepository();
    this.memberRepository = memberRepository || new MemberRepository();
  }

  /**
   * Assign or update a user's role in an organization
   *
   * Business Logic:
   * 1. Check if user exists
   * 2. Check if user is member of organization
   * 3. Validate role assignment (e.g., can't have multiple owners)
   * 4. Update role flags (is_owner, is_org_admin)
   * 5. Return updated member profile
   *
   * @param orgId - Organization ID
   * @param userId - User ID
   * @param role - New role: 'owner' | 'admin' | 'member'
   * @returns Updated organization member profile
   * @throws Error if user not found or not in organization
   */
  async assignUserRole(
    orgId: string,
    userId: string,
    role: "owner" | "admin" | "member",
  ): Promise<OrganizationMemberDTO> {
    // ✅ Business Logic Layer - All validation and orchestration happens here

    // 1. Verify organization exists
    const organization = await this.orgRepository.findById(orgId);
    if (!organization) {
      throw new Error(`Organization not found: ${orgId}`);
    }

    // 2. Verify user exists
    const member = await this.memberRepository.findById(userId);
    if (!member) {
      throw new Error(`User not found: ${userId}`);
    }

    // 3. Verify user is already in organization
    const orgMembers = await this.memberRepository.findByOrganizationId(orgId);
    const isMember = orgMembers.some((m) => m.id === userId);
    if (!isMember) {
      throw new Error(`User is not a member of this organization`);
    }

    // 4. Business rule: Can't remove last owner
    if (role !== "owner") {
      const currentOwners = orgMembers.filter((m) => m.is_owner);
      const currentUserIsOwner = currentOwners.some((m) => m.id === userId);

      if (currentUserIsOwner && currentOwners.length === 1) {
        throw new Error("Cannot remove the only owner from organization");
      }
    }

    // 5. Update member with new role flags
    const updatedMember = await this.memberRepository.update(userId, {
      is_owner: role === "owner",
      is_org_admin: role === "admin" || role === "owner",
    });

    if (!updatedMember) {
      throw new Error(`Failed to update member role`);
    }

    // 6. Return as DTO
    return toOrganizationMemberDTO(updatedMember);
  }

  /**
   * Check if user is organization owner
   */
  async isUserOwner(orgId: string, userId: string): Promise<boolean> {
    return this.orgRepository.isUserOwner(orgId, userId);
  }

  /**
   * Check if user is organization admin
   */
  async isUserAdmin(orgId: string, userId: string): Promise<boolean> {
    return this.orgRepository.isUserAdmin(orgId, userId);
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();
```

### Step 2️⃣: Refactor the Endpoint

```typescript
/**
 * server/routes/api/tenancy/[orgId]/members/[userId].assign-role.post.ts
 *
 * Layer: Route Handler (HTTP Concerns Only)
 * Responsibility: Request validation, authorization check, response formatting
 * Delegates to: OrganizationService for business logic
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors, assignRoleSchema, isValidUUID } from "@/lib/api";
import { organizationService } from "@/lib/services";

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: Extract and validate parameters (HTTP concerns)
    const orgId = event.context.params?.orgId;
    const userId = event.context.params?.userId;

    // Basic parameter validation (format, presence)
    if (!orgId || !isValidUUID(orgId)) {
      return ApiResponse.badRequest("Invalid organization ID");
    }

    if (!userId || !isValidUUID(userId)) {
      return ApiResponse.badRequest("Invalid user ID");
    }

    // ✅ LAYER 1: Read and validate request body (HTTP concerns)
    const body = await readBody(event);
    const validation = assignRoleSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid role assignment data");
    }

    const { role } = validation.data;

    // ✅ LAYER 2: Authorization check (business logic)
    // Extract current user from auth context (would come from auth middleware)
    const currentUserId = event.context.user?.id;
    if (!currentUserId) {
      return ApiResponse.unauthorized("User not authenticated");
    }

    // Check if current user is org admin/owner
    const isAuthorized =
      (await organizationService.isUserAdmin(orgId, currentUserId)) ||
      (await organizationService.isUserOwner(orgId, currentUserId));

    if (!isAuthorized) {
      return ApiResponse.forbidden("Only organization admins can assign roles");
    }

    // ✅ LAYER 3: Delegate to service (business logic orchestration)
    const updatedMember = await organizationService.assignUserRole(orgId, userId, role);

    // ✅ LAYER 1: Format response (HTTP concerns)
    return ApiResponse.success(updatedMember, 200, "Role assigned successfully");
  } catch (error) {
    // ✅ Centralized error handling
    console.error("Error assigning role:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return ApiResponse.notFound(error.message);
      }
      if (error.message.includes("Cannot remove")) {
        return ApiResponse.badRequest(error.message);
      }
    }

    return ApiResponse.serverError("Failed to assign role", "ASSIGN_ROLE_FAILED");
  }
});
```

---

## 📊 Comparison: Before vs After

| Aspect              | Before ❌                              | After ✅                                   |
| ------------------- | -------------------------------------- | ------------------------------------------ |
| **Concerns**        | Mixed (validation, auth, DB, mapping)  | Separated (routing, business, data access) |
| **Code**            | 70+ lines procedural                   | 20 line clean handler + 80 line service    |
| **Logic**           | Scattered, hard to find                | Centralized in service                     |
| **Testability**     | Hard to test (needs full HTTP setup)   | Easy to test (mock dependencies)           |
| **Reusability**     | Can't reuse logic from other endpoints | Service methods reusable across endpoints  |
| **Maintainability** | Changes ripple through handlers        | Changes isolated to service                |
| **TODOs**           | Full of TODOs ❌                       | All implemented ✅                         |
| **Error Handling**  | Generic catch-all                      | Type-specific error responses              |
| **Authorization**   | No business rule validation            | Role validation, ownership check           |
| **Data Layer**      | Direct queries needed                  | Repository methods used                    |

---

## 🏗️ Layer Breakdown

### Route Handler (HTTP Layer)

```
Input (HTTP Request)
    ↓
[Parameter Validation] → Check format, presence
[Request Body Validation] → Parse & validate with Zod
[Authentication Check] → Verify user is logged in
[Authorization Check] → Call service to verify permissions
    ↓
Service Layer
    ↓
[Format Response] → Convert to DTO + ApiResponse
Output (HTTP Response)
```

### Service Layer (Business Logic)

```
Input (orgId, userId, role)
    ↓
[Verify Organization] → Repository.findById()
[Verify Member] → Repository.findById()
[Check Membership] → Repository.findByOrganizationId()
[Business Rules] → Can't remove last owner
[Execute Update] → Repository.update()
    ↓
Output (OrganizationMemberDTO)
```

### Repository Layer (Data Access)

```
Service → Repository.findById()
        → Repository.findByOrganizationId()
        → Repository.update()
        → Supabase client
        → Database
```

---

## 🎯 Key Patterns Applied

### 1. **Single Responsibility** ✅

- **Route Handler**: Only HTTP concerns (request/response)
- **Service**: Only business logic (validation, orchestration)
- **Repository**: Only data access (queries)

### 2. **Dependency Injection** ✅

```typescript
// Service accepts dependencies
constructor(
  orgRepository?: IOrganizationRepository,
  memberRepository?: IMemberRepository
)

// Makes testing easy - inject mocks
const mockOrgRepo = new MockOrganizationRepository();
const service = new OrganizationService(mockOrgRepo);
```

### 3. **Error Handling** ✅

```typescript
// Service throws meaningful errors
throw new Error(`Organization not found: ${orgId}`);
throw new Error(`Cannot remove the only owner`);

// Route handler catches and maps to HTTP responses
if (error.message.includes("not found")) {
  return ApiResponse.notFound(error.message);
}
```

### 4. **DTO Mapping** ✅

```typescript
// Raw DB data → DTO (clean API contract)
return toOrganizationMemberDTO(updatedMember);

// Route handler uses DTO
return ApiResponse.success(updatedMember, 200);
```

### 5. **Authorization Abstraction** ✅

```typescript
// Service provides methods to check permissions
await organizationService.isUserAdmin(orgId, currentUserId);
await organizationService.isUserOwner(orgId, currentUserId);

// Route handler uses them for access control
if (!isAuthorized) {
  return ApiResponse.forbidden("Only admins can do this");
}
```

---

## 🧪 Testing Examples

### Before: Hard to Test ❌

```typescript
// Need to mock entire H3 event, database, etc.
// No way to test business logic in isolation
```

### After: Easy to Test ✅

**Service Unit Test**:

```typescript
import { describe, it, expect } from "vitest";
import { OrganizationService } from "@/lib/services";

describe("OrganizationService.assignUserRole", () => {
  it("should assign admin role to member", async () => {
    // Arrange - Create mocks
    const mockOrgRepo = {
      findById: vi.fn().mockResolvedValue({ id: "org-1" }),
      isUserAdmin: vi.fn().mockResolvedValue(true),
    };
    const mockMemberRepo = {
      findById: vi.fn().mockResolvedValue({ id: "user-2" }),
      findByOrganizationId: vi.fn().mockResolvedValue([
        { id: "user-1", is_owner: true },
        { id: "user-2", is_owner: false },
      ]),
      update: vi.fn().mockResolvedValue({
        id: "user-2",
        is_org_admin: true,
        is_owner: false,
      }),
    };

    const service = new OrganizationService(mockOrgRepo, mockMemberRepo);

    // Act
    const result = await service.assignUserRole("org-1", "user-2", "admin");

    // Assert
    expect(mockMemberRepo.update).toHaveBeenCalledWith("user-2", {
      is_owner: false,
      is_org_admin: true,
    });
    expect(result.is_org_admin).toBe(true);
  });

  it("should throw if user not found", async () => {
    const mockMemberRepo = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const service = new OrganizationService(undefined, mockMemberRepo);

    await expect(service.assignUserRole("org-1", "user-999", "admin")).rejects.toThrow(
      "User not found",
    );
  });

  it("should prevent removing last owner", async () => {
    const mockOrgRepo = { findById: vi.fn().mockResolvedValue({ id: "org-1" }) };
    const mockMemberRepo = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", is_owner: true }),
      findByOrganizationId: vi.fn().mockResolvedValue([
        { id: "user-1", is_owner: true }, // Only owner
      ]),
    };

    const service = new OrganizationService(mockOrgRepo, mockMemberRepo);

    await expect(service.assignUserRole("org-1", "user-1", "admin")).rejects.toThrow(
      "Cannot remove the only owner",
    );
  });
});
```

**Route Handler Integration Test**:

```typescript
it("should return 403 if user not admin", async () => {
  // Arrange
  const event = createMockH3Event({
    context: {
      user: { id: "user-2" },
      params: { orgId: "org-1", userId: "user-3" },
    },
    body: { role: "admin" },
  });

  // Act
  const response = await handler(event);

  // Assert
  expect(response.statusCode).toBe(403);
  expect(response.message).toContain("Only organization admins");
});
```

---

## 🚀 Refactoring Checklist

When refactoring an endpoint, follow this pattern:

- [ ] **Step 1**: Identify business logic in route handler
- [ ] **Step 2**: Create service method to encapsulate logic
- [ ] **Step 3**: Add validation in service (throw meaningful errors)
- [ ] **Step 4**: Use repository methods for data access
- [ ] **Step 5**: Map results to DTOs
- [ ] **Step 6**: Export service singleton
- [ ] **Step 7**: Update route handler to delegate to service
- [ ] **Step 8**: Add authorization checks in route handler
- [ ] **Step 9**: Map service responses to ApiResponse
- [ ] **Step 10**: Handle service errors with appropriate HTTP status codes
- [ ] **Step 11**: Write unit tests for service
- [ ] **Step 12**: Write integration tests for route
- [ ] **Step 13**: Remove TODO comments
- [ ] **Step 14**: Git commit with clear message

---

## 📈 Benefits Summary

### For Developer Experience

- ✅ Clear code structure and responsibilities
- ✅ Easy to find where logic lives
- ✅ Business rules isolated in service
- ✅ Easy to add features (extend service, not routes)

### For Testing

- ✅ Service methods independently testable
- ✅ Mock dependencies easily
- ✅ No complex HTTP setup needed
- ✅ Higher code coverage achievable

### For Maintenance

- ✅ Bug fixes isolated to single layer
- ✅ Reuse logic across multiple endpoints
- ✅ Easier to refactor without breaking routes
- ✅ Clear separation makes onboarding easier

### For Performance

- ✅ Caching logic can live in service
- ✅ Batch operations in repository
- ✅ Optimize queries without changing routes
- ✅ Authorization checks reused

---

## 📝 Next Steps

Apply this pattern to all 38 endpoints:

1. **Events Module** (5 endpoints) - Use EventService
2. **Membership Module** (10 endpoints) - Use MemberService
3. **Finance Module** (14 endpoints) - Use ContributionService, PledgeService, ExpenseService
4. **Tenancy Module** (9 endpoints) - Use OrganizationService

Each endpoint follows the same pattern:

- Extract → Validate → Authorize → Delegate → Format

---

**Ready to refactor the next endpoint? Follow this exact pattern!** ✅
