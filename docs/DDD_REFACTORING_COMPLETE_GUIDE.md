/**

- SGBC MANAGEMENT SYSTEM - DDD REFACTORING GUIDE
-
- A complete blueprint for refactoring all modules to Domain-Driven Design
- and Clean Architecture patterns.
-
- ===== REFERENCE IMPLEMENTATION =====
- The Finance module (src/modules/finance/) is fully refactored as the template.
- Follow this pattern for ALL other modules.
-

*/

// ============================================================================
// 1. OVERALL ARCHITECTURE PATTERN
// ============================================================================

/*
Every module should follow this layer structure:

src/modules/{MODULE_NAME}/
├── domain/ ← BUSINESS LOGIC LAYER
│ ├── {module}.entities.ts ← Aggregates, Entities, Value Objects
│ ├── {module}.specifications.ts ← Query specifications (optional but recommended)
│ ├── {module}.repositories.ts ← Repository interfaces (contracts)
│ └── {module}.value-objects.ts ← Shared value objects
│
├── application/ ← USE CASE LAYER
│ ├── {module}.service.ts ← Application services (orchestrate domain)
│ ├── {module}.dto.ts ← Data transfer objects (optional)
│ └── {module}.use-cases.ts ← Specific use case implementations (optional)
│
├── infrastructure/ ← DATA ACCESS LAYER
│ ├── {module}.repositories.ts ← Supabase repository implementations
│ ├── {module}.context.ts ← Dependency injection factory
│ └── {module}.mappers.ts ← Domain ↔ Persistence mappers (optional)
│
├── ui/ ← PRESENTATION LAYER
│ ├── *.tsx ← React components (NO business logic!)
│ └── hooks/ ← React hooks (thin wrappers)
│
└── {module}.functions.ts & {module}.public.functions.ts
↑ API LAYER (calls application services)

*/

// ============================================================================
// 2. MODULE-BY-MODULE REFACTORING TEMPLATE
// ============================================================================

/**

- MEMBERSHIP MODULE REFACTORING
- ============================
- Current: API-only, ~473 lines, 2 files
- Target: 4-layer DDD architecture
-
- Domain Models Needed:
- - Member (aggregate root)
- - Properties: id, churchId, name, email, phone, status, category, joinDate, etc.
- - Methods: activate(), deactivate(), transfer(), updateProfile()
- - Status enum: active|inactive|transferred|deceased
-
- - MemberFamily (value object)
- - Links members together as family units
-
- - MemberDocument (entity)
- - Attachments, certificates, records
-
- Services:
- - MemberService
- - recordMember(props)
- - deactivateMember(id)
- - transferMember(fromChurch, toChurch)
- - getMemberHistory(id)
- - searchMembers(criteria)
-
- Repositories:
- - IMemberRepository
- - findByChurch(churchId)
- - searchByName(churchId, name)
- - getActiveCount(churchId)
- - getByStatus(churchId, status)
-
- Domain Events:
- - MemberRegisteredEvent
- - MemberTransferredEvent
- - MemberStatusChangedEvent
    */

/**

- VISITORS MODULE REFACTORING
- =============================
- Current: API-only, ~571 lines, 2 files
- Target: 4-layer DDD architecture
-
- Domain Models:
- - Visitor (aggregate root)
- - Properties: id, churchId, name, email, phone, visitDate, referral, etc.
- - Methods: recordVisit(), convertToMember(), updateInfo()
- - Status: new|returning|inactive
-
- Services:
- - VisitorService
- - recordNewVisitor(props)
- - getVisitorHistory(id)
- - getVisitStats(churchId, period)
- - getReturningVisitors(churchId)
-
- Repositories:
- - IVisitorRepository
- - findByChurch(churchId)
- - getByVisitDate(churchId, startDate, endDate)
- - countNewVisitors(churchId, startDate, endDate)
    */

/**

- TENANCY MODULE REFACTORING
- ============================
- Current: API-only, ~133 lines, 1 file
- Target: 4-layer DDD architecture
-
- This is the control plane for organizations and churches.
-
- Domain Models:
- - Organization (aggregate root)
- - Root organization containing multiple churches
- - Methods: addChurch(), removeChurch(), updateSettings()
-
- - Church (aggregate root)
- - Individual church within organization
- - Methods: activate(), deactivate(), updateSettings()
-
- - UserRole (value object)
- - Enum: admin|pastor|treasurer|secretary
- - Tied to specific church/org context
-
- Services:
- - TenancyService
- - getUserOrganizations(userId)
- - getUserChurches(userId)
- - getUserRole(userId, churchId)
- - getAllChurches(organizationId)
-
- Repositories:
- - IOrganizationRepository
- - IChurchRepository
- - IUserRoleRepository
    */

/**

- DASHBOARD MODULE REFACTORING
- ==============================
- Current: API-only, ~125 lines, 1 file
- Target: 4-layer DDD architecture
-
- This is a read model - crosses multiple aggregates
-
- Domain Models:
- - DashboardKPI (value object)
- - Immutable snapshot of key metrics
- - Properties: totalMembers, activeEvents, mtdGiving, etc.
-
- - ActivityFeed (entity)
- - Recent system activities across all modules
-
- Services:
- - DashboardService
- - getKPIs(churchId)
- - getActivityFeed(churchId, limit)
- - getDashboardMetrics(churchId)
-
- Query Objects:
- - KPIQuery (aggregates data from multiple repositories)
- - ActivityQuery (cross-module activity)
    */

// ============================================================================
// 3. STEP-BY-STEP REFACTORING PROCESS
// ============================================================================

/*
For each module, follow these steps:

STEP 1: Create Domain Layer (domain/)
--------------------------------------

1. Extract entities and aggregates from current API functions
2. Remove all database queries - replace with method calls on entities
3. Create value objects for complex properties
4. Define aggregate roots with validate() methods
5. Add domain events for important state changes
6. Create specifications for complex queries

Example transformation:
BEFORE:
const { data: member } = await supabase
.from("members")
.select("*")
.eq("church_id", churchId)
.eq("status", "active")
.single();

AFTER:
class Member extends AggregateRoot {
get status(): MemberStatus { return this._props.status; }
activate(): void { this._props.status = "active"; }
isActive(): boolean { return this._props.status === "active"; }
}

const activeMembers = await memberRepo.findByStatus(churchId, "active");
const member = activeMembers.find(m => m.id === memberId);

STEP 2: Create Repository Interfaces (domain/)
----------------------------------------------

1. Define IRepository interface for each aggregate
2. Extend IRepository with custom queries
3. Keep interfaces focused on business needs, not DB details

Example:
interface IMemberRepository extends IRepository<Member> {
findByChurch(churchId: string): Promise<Member[]>;
getActiveCount(churchId: string): Promise<number>;
findByStatus(churchId: string, status: MemberStatus): Promise<Member[]>;
}

STEP 3: Create Application Services (application/)
--------------------------------------------------

1. Create service for each aggregate
2. Inject repositories into service constructor
3. Implement use cases that orchestrate entities and repositories
4. Add domain event publishing
5. Handle validation at domain level

Example:
class MemberService {
constructor(private memberRepo: IMemberRepository) {}

async recordMember(props: MemberProps): Promise<Member> {
const member = Member.create(props); ← validation happens here
const saved = await this.memberRepo.save(member);
await eventBus.publish(member.getDomainEvents());
return saved;
}
}

STEP 4: Create Repository Implementations (infrastructure/)
----------------------------------------------------------

1. Extend SupabaseRepository<T> for each repository interface
2. Implement toDomain() to convert DB rows to entities
3. Implement toPersistence() to convert entities to DB rows
4. Keep infrastructure details private
5. Use Supabase transactions for multi-step operations

Example:
class SupabaseMemberRepository extends SupabaseRepository<Member>
implements IMemberRepository {

protected toDomain(row: any): Member {
return Member.fromJSON({
id: row.id,
churchId: row.church_id,
name: row.name,
...
});
}

async findByStatus(churchId, status) {
const { data } = await this.supabaseClient
.from("members")
.select("*")
.eq("church_id", churchId)
.eq("status", status);

    return data.map(row => this.toDomain(row));

}
}

STEP 5: Create Dependency Injection Factory (infrastructure/)
-----------------------------------------------------------

1. Create context factory that instantiates all services
2. Pass repositories to services
3. Return all services in context object

Example:
export interface MembershipContext {
memberService: MemberService;
}

export function createMembershipContext(supabase: SupabaseClient): MembershipContext {
const memberRepo = new SupabaseMemberRepository(supabase);
const memberService = new MemberService(memberRepo);
return { memberService };
}

STEP 6: Update API Functions (*.functions.ts)
---------------------------------------------

1. Delete all business logic
2. Create context using factory
3. Call services instead of direct DB queries
4. Return simple DTOs, not DB rows
5. Handle errors using domain error types

Example:
BEFORE:
export const recordMember = createServerFn()
.handler(async ({ context, data }) => {
const { data: member } = await context.supabase
.from("members")
.insert([{ ...data }])
.select()
.single();
return member;
});

AFTER:
export const recordMember = createServerFn()
.handler(async ({ context, data }) => {
const financeContext = createMembershipContext(context.supabase);
const member = await financeContext.memberService.recordMember({
churchId: data.churchId,
name: data.name,
...
});
return toMemberDTO(member);
});

STEP 7: Add Error Handling
--------------------------

Use domain error types instead of generic errors:

throw new ValidationError("Member already exists", "DUPLICATE_MEMBER");
throw new NotFoundError("Member not found", "MEMBER_NOT_FOUND");
throw new BusinessRuleViolation("Cannot deactivate active member", "INVALID_STATE");

API layer converts these to HTTP responses:
if (error instanceof ValidationError) {
return { error: error.message, code: error.code, status: 400 };
}

*/

// ============================================================================
// 4. PATTERN EXAMPLES FOR EACH MODULE
// ============================================================================

/**

- MEMBERSHIP MODULE - Entity Example
  */
  export interface MemberProps {
  churchId: string;
  name: string;
  email?: string;
  phone?: string;
  category: "member" | "visitor" | "prospect";
  status: "active" | "inactive" | "transferred";
  joinDate: Date;
  baptismDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  }

export class Member extends AggregateRoot<MemberProps> {
private constructor(id: string, props: MemberProps) {
super(id, props);
}

static create(props: Omit<MemberProps, "createdAt" | "updatedAt" | "status">): Member {
const member = new Member(crypto.randomUUID(), {
...props,
status: "active",
createdAt: new Date(),
updatedAt: new Date(),
});
member.validate();
return member;
}

validate(): void {
if (!this._props.name || this._props.name.trim().length < 2) {
throw new ValidationError("Name must be at least 2 characters", "INVALID_NAME");
}
}

get isActive(): boolean {
return this._props.status === "active";
}

deactivate(): void {
this._props.status = "inactive";
this._props.updatedAt = new Date();
}

activate(): void {
this._props.status = "active";
this._props.updatedAt = new Date();
}
}

/**

- MEMBERSHIP MODULE - Service Example
  */
  class MemberService {
  constructor(private memberRepo: IMemberRepository) {}

async recordMember(props: Omit<MemberProps, "createdAt" | "updatedAt" | "status">): Promise<Member> {
const member = Member.create(props);
return this.memberRepo.save(member);
}

async getMembersCount(churchId: string): Promise<number> {
return this.memberRepo.countByScope({ churchId });
}

async deactivateMember(id: string): Promise<Member> {
const member = await this.memberRepo.findById(id);
if (!member) throw new NotFoundError("Member not found", "MEMBER_NOT_FOUND");
member.deactivate();
return this.memberRepo.save(member);
}
}

// ============================================================================
// 5. SHARED PATTERNS ACROSS ALL MODULES
// ============================================================================

/*
✅ DO:

- Put all business logic in domain models
- Use entities and aggregates
- Create repositories as contracts
- Use factory pattern for service creation
- Publish domain events
- Use value objects for complex properties
- Add validation in domain models
- Keep UI components free of business logic
- Use DTOs for API responses
- Handle errors with domain error types

❌ DON'T:

- Put DB queries in service files
- Mix domain and infrastructure code
- Create huge monolithic services
- Use generic "Error" exceptions
- Query data directly in React components
- Export database entities directly
- Skip validation
- Create circular dependencies
- Use repositories directly in UI
- Expose internal entity state

*/

// ============================================================================
// 6. CHECKLIST FOR EACH MODULE
// ============================================================================

/*
□ Domain Layer Created
□ Entities defined
□ Value objects created
□ Aggregates identified
□ Domain events defined
□ Specifications created
□ Repository interfaces defined

□ Application Layer Created
□ Services created
□ DTOs defined
□ Use cases orchestrated
□ Domain event publishing
□ Error handling

□ Infrastructure Layer Created
□ Repository implementations
□ Mappers created
□ Context factory created
□ Supabase integration

□ API Layer Refactored
□ Business logic removed
□ Service calls added
□ Error handling added
□ DTOs returned

□ Testing Setup
□ Domain tests
□ Service tests
□ Repository tests

*/

// ============================================================================
// 7. MIGRATION STRATEGY
// ============================================================================

/*
PHASE 1: Foundation (COMPLETED)
✅ Create shared DDD infrastructure
✅ Create domain error types
✅ Create base entity/aggregate classes
✅ Create repository interfaces
✅ Create Money value object

PHASE 2: High-Value Modules (IN PROGRESS)
□ Finance Module (COMPLETED)
□ Membership Module (NEXT)
□ Visitors Module
□ Tenancy Module

PHASE 3: Integration
□ Update API functions to use services
□ Add error handling
□ Update tests

PHASE 4: Polish
□ Add domain event handlers
□ Add cross-module communication
□ Performance optimization
□ Documentation

*/

export {};
