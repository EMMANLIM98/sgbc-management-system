# Endpoint Refactoring: Visual Architecture

```
═════════════════════════════════════════════════════════════════════════════════
BEFORE: Procedural Endpoint (❌ NOT CLEAN)
═════════════════════════════════════════════════════════════════════════════════

HTTP Request
    │
    ├─ Parameter Validation (orgId, userId format)
    ├─ Body Validation (schema parse)
    │
    ├─ TODO: Check authorization
    ├─ TODO: Fetch organization
    ├─ TODO: Fetch user
    ├─ TODO: Verify membership
    ├─ TODO: Check business rules
    ├─ TODO: Update database
    ├─ TODO: Convert to DTO
    │
    ├─ Mock data response ⚠️
    │
    └─ Generic error catch → 500 error

Problems:
  ❌ All logic mixed together
  ❌ Hard to test
  ❌ Can't reuse logic
  ❌ TODOs everywhere
  ❌ No separation of concerns


═════════════════════════════════════════════════════════════════════════════════
AFTER: Layered Service Pattern (✅ CLEAN)
═════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: HTTP LAYER (Route Handler)                                        │
│ Responsibility: HTTP concerns only                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HTTP Request                                                              │
│     │                                                                       │
│     ├─ Extract Parameters → orgId, userId                                 │
│     ├─ Validate Format → UUID validation                                  │
│     ├─ Read Body → assignRoleSchema.safeParse()                          │
│     ├─ Check Authentication → event.context.user?.id                     │
│     ├─ Check Authorization → organizationService.isUserAdmin()          │
│     │                                                                       │
│     ├─ ✅ All HTTP-specific concerns handled here                         │
│     │                                                                       │
│     └─ Return: HTTP Response (status code + formatted data)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              │ Delegates to
              ↓

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: BUSINESS LOGIC LAYER (Service)                                    │
│ Responsibility: Orchestrate use cases                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  organizationService.assignUserRole(orgId, userId, role)                  │
│     │                                                                       │
│     ├─ Step 1: Verify Organization                                       │
│     │   └─ repository.findById(orgId)                                     │
│     │       ✅ Return 404 if not found                                    │
│     │                                                                       │
│     ├─ Step 2: Verify Member                                             │
│     │   └─ memberRepository.findById(userId)                             │
│     │       ✅ Throw error if not found                                   │
│     │                                                                       │
│     ├─ Step 3: Verify Membership                                         │
│     │   └─ memberRepository.findByOrganizationId(orgId)                  │
│     │       ✅ Check user is in organization                             │
│     │                                                                       │
│     ├─ Step 4: Business Rule Validation                                  │
│     │   └─ Check: Can't remove last owner                                │
│     │       ✅ Throw meaningful error if violated                         │
│     │                                                                       │
│     ├─ Step 5: Execute Update                                            │
│     │   └─ memberRepository.update(userId, { is_owner, is_org_admin })  │
│     │       ✅ Returns updated member                                     │
│     │                                                                       │
│     └─ Return: Updated member object                                      │
│                                                                             │
│  Error Handling:                                                           │
│     └─ throw new Error(message)                                           │
│        ✅ Route layer catches and maps to HTTP response                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              │ Uses repositories for
              ↓ data access

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: DATA ACCESS LAYER (Repository)                                    │
│ Responsibility: Database queries only                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  findById(id) → supabase.from('table').select('*').eq('id', id)          │
│  update(id, data) → supabase.from('table').update(data).eq('id', id)     │
│  findByOrganizationId(orgId) → supabase.from('table').eq('org_id', ...)  │
│                                                                             │
│  ✅ No business logic here                                                │
│  ✅ No HTTP concerns here                                                 │
│  ✅ Pure data access                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              │ Queries
              ↓

           DATABASE
           (Supabase PostgreSQL)


═════════════════════════════════════════════════════════════════════════════════
DATA FLOW: Request → Response
═════════════════════════════════════════════════════════════════════════════════

CLIENT REQUEST
    │
    POST /api/v1/organizations/:orgId/members/:userId/assign-role
    Body: { role: "admin" }
    │
    ↓ (Route Handler)
    │
    Extract: orgId="org-123", userId="user-456", role="admin"
    │
    Validate: ✅ UUID format valid
            ✅ Body schema valid
            ✅ User authenticated (event.context.user.id)
            ✅ User authorized (isUserAdmin check)
    │
    ↓ (Call Service)
    │
    organizationService.assignUserRole("org-123", "user-456", "admin")
    │
    ↓ (Service: Steps 1-5)
    │
    memberRepository.findById("org-123") → ✅ Organization found
    memberRepository.findById("user-456") → ✅ Member found
    memberRepository.findByOrganizationId("org-123") → ✅ Member in org
    Check rule: ✅ Not removing last owner
    memberRepository.update("user-456", {is_org_admin: true}) → ✅ Updated
    │
    ↓ (Return from Service)
    │
    { id: "user-456", name: "Jane", is_org_admin: true, ... }
    │
    ↓ (Route Handler)
    │
    Format: ApiResponse.success(data, 200, "Role updated successfully")
    │
    HTTP 200 OK
    └── JSON Response


═════════════════════════════════════════════════════════════════════════════════
ERROR HANDLING: Service Errors → HTTP Status Codes
═════════════════════════════════════════════════════════════════════════════════

Service throws:                        Route handler returns:
├─ "Organization not found" ──────→   404 Not Found
├─ "Member not found" ────────────→   404 Not Found
├─ "User is not a member" ───────→   409 Conflict
├─ "Cannot remove the only owner"→   409 Conflict
├─ "Failed to update" ───────────→   400 Bad Request
└─ [Other errors] ───────────────→   500 Server Error


═════════════════════════════════════════════════════════════════════════════════
PATTERNS APPLIED
═════════════════════════════════════════════════════════════════════════════════

1. SEPARATION OF CONCERNS
   ┌─ HTTP ─┬─ Business ─┬─ Data Access ─┐
   │ Route  │  Service   │  Repository    │
   │ Handler│  Layer     │  Layer         │
   └────────┴────────────┴────────────────┘

2. DEPENDENCY INJECTION
   OrganizationService(orgRepository, memberRepository)
   └─ Makes testing easy - inject mocks!

3. ERROR HANDLING STRATEGY
   Service: Throws meaningful errors
   Route:   Catches and maps to HTTP status

4. DTO MAPPING
   Database → Repository → DTO → Service → Route → HTTP Response

5. AUTHORIZATION ABSTRACTION
   Service: isUserAdmin(), isUserOwner()
   Route: Calls service to check permissions

6. SINGLE RESPONSIBILITY
   - Route: Only HTTP concerns
   - Service: Only business logic
   - Repository: Only data queries


═════════════════════════════════════════════════════════════════════════════════
BENEFITS COMPARISON
═════════════════════════════════════════════════════════════════════════════════

Aspect              │ Before          │ After
────────────────────┼─────────────────┼──────────────────────────
Code Organization   │ Mixed           │ Layered + Separated
Testability         │ Hard            │ Easy (mock dependencies)
Reusability         │ Can't reuse     │ Service methods reusable
Maintainability     │ Changes ripple  │ Changes isolated to layer
Error Handling      │ Generic 500     │ Type-specific HTTP codes
Authorization       │ None            │ Explicit checks with rules
Business Logic      │ Scattered       │ Centralized in service
TODO Comments       │ 10 TODOs ❌     │ 0 TODOs ✅
Documentation       │ Implicit        │ Clear layer responsibilities
Performance         │ N/A             │ Easier to optimize per layer


═════════════════════════════════════════════════════════════════════════════════
SAME PATTERN APPLIES TO ALL 38 ENDPOINTS
═════════════════════════════════════════════════════════════════════════════════

1. Events Module (5 endpoints)
   ├─ POST /events (create)
   ├─ GET /events (list)
   ├─ GET /events/:id (detail)
   ├─ PATCH /events/:id (update)
   └─ DELETE /events/:id (delete)
   └─ Service: EventService + Repository: EventRepository

2. Membership Module (10 endpoints)
   ├─ POST /members (create)
   ├─ GET /members (list)
   ├─ GET /members/:id (detail)
   ├─ PATCH /members/:id (update)
   ├─ DELETE /members/:id (delete)
   ├─ POST /members/:id/activate (status change)
   ├─ POST /members/:id/deactivate (status change)
   └─ ...
   └─ Service: MemberService + Repository: MemberRepository

3. Finance Module (14 endpoints)
   ├─ Contributions (CRUD + aggregations)
   ├─ Pledges (CRUD + fulfillment tracking)
   ├─ Expenses (CRUD + approval workflow)
   └─ Services: ContributionService, PledgeService, ExpenseService
               Repositories: ContributionRepository, PledgeRepository, ExpenseRepository

4. Tenancy Module (9 endpoints)
   ├─ Organizations (CRUD + statistics)
   ├─ Member role assignment ✅ (DONE - this example)
   ├─ ...
   └─ Service: OrganizationService + Repository: OrganizationRepository

All follow the EXACT SAME PATTERN demonstrated above! ✅
```

## Summary

This concrete example shows:
1. ✅ **What was before**: Procedural endpoint with TODO comments
2. ✅ **What is after**: Clean layered architecture with service delegation
3. ✅ **How it's organized**: Clear separation between HTTP, business, and data layers
4. ✅ **Error handling**: Meaningful service errors → appropriate HTTP status codes
5. ✅ **Why it's better**: Testable, reusable, maintainable, documented

**Apply this pattern to the next 37 endpoints!** 🚀
