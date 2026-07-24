/**

- API Route Handler Pattern with Service Integration
-
- This file demonstrates the recommended pattern for refactoring
- all H3 API routes to use the service/repository layer.
-
- Pattern:
- 1.  Route receives request
- 2.  Validates request data with Zod schemas
- 3.  Delegates to service controller
- 4.  Service orchestrates business logic
- 5.  Route formats response and returns
-
- Example: GET /api/v1/organizations/:orgId/members
  */

import { defineEventHandler, getQuery } from "h3";
import {
ApiResponse,
extractValidationErrors,
organizationMembersQuerySchema,
memberService,
} from "@/lib/api";

/**

- BEFORE (Current Implementation):
- ================================
-
- export default defineEventHandler(async (event) => {
- try {
-     const orgId = event.context.params?.orgId;
-     const queryParams = getQuery(event);
-     const validation = organizationMembersQuerySchema.safeParse({...});
-     if (!validation.success) { ... }
-
-     // TODO: Fetch from database directly
-     // TODO: Apply filters
-     // TODO: Map to DTOs
-     // TODO: Count total
-
-     return ApiResponse.paginated(...);
- } catch (error) { ... }
- });
-
-
- AFTER (With Service Layer):
- ===========================
  */

export default defineEventHandler(async (event) => {
try {
const orgId = event.context.params?.orgId;

    // 1. Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!isValidUUID(orgId)) {
      return ApiResponse.badRequest("Invalid organization ID format");
    }

    // 2. Get and validate query parameters
    const queryParams = getQuery(event);
    const validation = organizationMembersQuerySchema.safeParse({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      role: queryParams.role,
      sortBy: queryParams.sortBy,
      order: queryParams.order,
    });

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid query parameters");
    }

    const { page, pageSize, role } = validation.data;

    // 3. Delegate to service layer
    // The service handles:
    // - Authorization checks
    // - Database queries via repositories
    // - Business logic
    // - Aggregations and calculations
    const result = await memberService.listMembers(orgId, {
      page,
      pageSize,
      orderBy: "created_at",
      order: "asc",
    });

    // 4. Filter by role if provided (or do in service)
    const filteredMembers = role
      ? result.members.filter((m) => m.role === role)
      : result.members;

    // 5. Format and return response
    return ApiResponse.paginated(
      filteredMembers,
      {
        total: result.total,
        count: filteredMembers.length,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
        hasNext: page * pageSize < result.total,
        hasPrev: page > 1,
      },
      200
    );

} catch (error) {
console.error("Error listing organization members:", error);
return ApiResponse.serverError(
"Failed to list organization members",
"LIST_MEMBERS_FAILED"
);
}
});

function isValidUUID(uuid: string): boolean {
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
return uuidRegex.test(uuid);
}

/**

- BENEFITS OF THIS PATTERN:
- =========================
-
- 1.  Separation of Concerns
- - Routes handle HTTP concerns (validation, response formatting)
- - Services handle business logic
- - Repositories handle data access
-
- 2.  Reusability
- - Services can be called from multiple routes
- - Services can be called from other services
- - Services can be used by scheduled tasks, webhooks, etc.
-
- 3.  Testability
- - Services can be tested independently
- - Repositories can be mocked
- - Business logic isolated from HTTP
-
- 4.  Maintainability
- - Easy to find business logic
- - Easy to change data access
- - Easy to add new features
-
- 5.  Clean Architecture
- - Follows SOLID principles
- - Dependency injection ready
- - Domain-driven design ready
-
-
- REFACTORING CHECKLIST:
- ======================
-
- For each endpoint:
-
- 1.  [ ] Identify the business operation (e.g., "list members")
- 2.  [ ] Find or create service method for that operation
- 3.  [ ] Replace TODO comments with service calls
- 4.  [ ] Remove direct database logic from route
- 5.  [ ] Keep validation in route (request contract)
- 6.  [ ] Keep response formatting in route (HTTP contract)
- 7.  [ ] Test service method independently
- 8.  [ ] Test route with service
-
-
- EXAMPLE REFACTORING SEQUENCE:
- =============================
-
- Phase 1: Membership Module (10 endpoints)
- Phase 2: Tenancy Module (9 endpoints)
- Phase 3: Events Module (5 endpoints)
- Phase 4: Finance Module - Contributions (6 endpoints)
- Phase 5: Finance Module - Pledges (5 endpoints)
- Phase 6: Finance Module - Expenses (7 endpoints)
- Phase 7: Finance Module - Summary (1 endpoint)
-
- Total: 38 endpoints refactored over 7 phases
  */
