/**
 * QUICK START: HOW TO CONTINUE DDD REFACTORING
 * 
 * Follow this guide to refactor remaining modules: Tenancy, Dashboard, and Auth.
 * Copy-paste friendly with examples.
 */

// ============================================================================
// STEP-BY-STEP: TENANCY MODULE REFACTORING
// ============================================================================

/**
 * TENANCY MODULE - Domain Layer
 * 
 * Location: src/modules/tenancy/domain/tenancy.entities.ts
 * 
 * What to create:
 * 1. Organization aggregate (root organization entity)
 * 2. Church aggregate (individual church entity)
 * 3. UserRole value object (admin, pastor, treasurer, etc.)
 * 4. UserAccess value object (church-level + org-level access)
 */

const TENANCY_DOMAIN_TEMPLATE = `
import { AggregateRoot } from "@/lib/ddd-base";
import { ValidationError } from "@/lib/domain-errors";

export interface OrganizationProps {
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Organization extends AggregateRoot<OrganizationProps> {
  private constructor(id: string, props: OrganizationProps) {
    super(id, props);
  }

  static create(props: Omit<OrganizationProps, "createdAt" | "updatedAt">): Organization {
    const org = new Organization(crypto.randomUUID(), {
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    org.validate();
    return org;
  }

  validate(): void {
    if (!this._props.name || this._props.name.trim().length < 2) {
      throw new ValidationError("Organization name required", "INVALID_ORG_NAME");
    }
  }

  get name(): string {
    return this._props.name;
  }

  toJSON() { return { ...this._props, id: this.id }; }
}

export type UserRole = "admin" | "pastor" | "treasurer" | "secretary" | "viewer";

export interface ChurchProps {
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Church extends AggregateRoot<ChurchProps> {
  private constructor(id: string, props: ChurchProps) {
    super(id, props);
  }

  static create(props: Omit<ChurchProps, "createdAt" | "updatedAt">): Church {
    const church = new Church(crypto.randomUUID(), {
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    church.validate();
    return church;
  }

  validate(): void {
    if (!this._props.name || this._props.name.trim().length < 2) {
      throw new ValidationError("Church name required", "INVALID_CHURCH_NAME");
    }
  }

  get organizationId(): string {
    return this._props.organizationId;
  }

  toJSON() { return { ...this._props, id: this.id }; }
}
`;

/**
 * TENANCY MODULE - Repositories
 * 
 * Location: src/modules/tenancy/domain/tenancy.repositories.ts
 */

const TENANCY_REPO_TEMPLATE = `
import { IRepository } from "@/lib/repository";
import { Organization, Church } from "./tenancy.entities";

export interface IOrganizationRepository extends IRepository<Organization> {
  findByName(name: string): Promise<Organization | null>;
}

export interface IChurchRepository extends IRepository<Church> {
  findByOrganization(organizationId: string): Promise<Church[]>;
  findByName(organizationId: string, name: string): Promise<Church | null>;
}

export interface IUserRoleRepository {
  getUserOrganizations(userId: string): Promise<string[]>;
  getUserChurches(userId: string): Promise<string[]>;
  getUserRole(userId: string, churchId: string): Promise<string | null>;
  setUserRole(userId: string, churchId: string, role: string): Promise<void>;
}
`;

/**
 * TENANCY MODULE - Service
 * 
 * Location: src/modules/tenancy/application/tenancy.service.ts
 */

const TENANCY_SERVICE_TEMPLATE = `
import { NotFoundError } from "@/lib/domain-errors";
import { Organization, Church } from "../domain/tenancy.entities";
import { 
  IOrganizationRepository, 
  IChurchRepository, 
  IUserRoleRepository 
} from "../domain/tenancy.repositories";

export class TenancyService {
  constructor(
    private orgRepo: IOrganizationRepository,
    private churchRepo: IChurchRepository,
    private roleRepo: IUserRoleRepository
  ) {}

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const orgIds = await this.roleRepo.getUserOrganizations(userId);
    const orgs = await Promise.all(
      orgIds.map(id => this.orgRepo.findById(id))
    );
    return orgs.filter(Boolean) as Organization[];
  }

  async getUserChurches(userId: string): Promise<Church[]> {
    const churchIds = await this.roleRepo.getUserChurches(userId);
    const churches = await Promise.all(
      churchIds.map(id => this.churchRepo.findById(id))
    );
    return churches.filter(Boolean) as Church[];
  }

  async getUserRole(userId: string, churchId: string): Promise<string | null> {
    return this.roleRepo.getUserRole(userId, churchId);
  }

  async getAllChurches(organizationId: string): Promise<Church[]> {
    return this.churchRepo.findByOrganization(organizationId);
  }
}
`;

// ============================================================================
// STEP-BY-STEP: DASHBOARD MODULE REFACTORING
// ============================================================================

/**
 * DASHBOARD MODULE - Domain Models (Read Models)
 * 
 * Dashboard reads from multiple aggregates, so use value objects
 * and entities, not aggregates.
 * 
 * Location: src/modules/dashboard/domain/dashboard.models.ts
 */

const DASHBOARD_MODELS_TEMPLATE = `
import { ValueObject } from "@/lib/ddd-base";

export interface DashboardKPIProps {
  totalMembers: number;
  activeMembers: number;
  recentVisitors: number;
  mtdGiving: number;
  mtdExpenses: number;
  attendancePercentage: number;
  timestamp: Date;
}

export class DashboardKPI extends ValueObject<DashboardKPIProps> {
  validate(): void {}

  equals(other: DashboardKPI): boolean {
    return this._props.timestamp === other._props.timestamp;
  }

  get totalMembers(): number { return this._props.totalMembers; }
  get mtdGiving(): number { return this._props.mtdGiving; }

  toJSON(): DashboardKPIProps { return { ...this._props }; }

  static fromJSON(data: DashboardKPIProps): DashboardKPI {
    return new DashboardKPI(data);
  }
}

export interface ActivityFeedEntryProps {
  type: "member_joined" | "contribution_recorded" | "event_created" | "visitor_registered";
  title: string;
  description?: string;
  timestamp: Date;
  relatedId?: string;
}

export class ActivityFeedEntry {
  constructor(readonly id: string, private props: ActivityFeedEntryProps) {}

  get type(): string { return this.props.type; }
  get timestamp(): Date { return this.props.timestamp; }

  toJSON() { return { ...this.props, id: this.id }; }
}
`;

/**
 * DASHBOARD MODULE - Service (Aggregates from multiple modules)
 * 
 * Location: src/modules/dashboard/application/dashboard.service.ts
 */

const DASHBOARD_SERVICE_TEMPLATE = `
import { DashboardKPI } from "../domain/dashboard.models";
import { IMemberRepository } from "@/modules/membership/domain/membership.repositories";
import { IContributionRepository, IExpenseRepository } 
  from "@/modules/finance/domain/finance.repositories";
import { IEventRepository } from "@/modules/events/domain/event.repositories";

export class DashboardService {
  constructor(
    private memberRepo: IMemberRepository,
    private contributionRepo: IContributionRepository,
    private expenseRepo: IExpenseRepository,
    private eventRepo: IEventRepository
  ) {}

  async getKPIs(churchId: string): Promise<DashboardKPI> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalMembers, mtdGiving, mtdExpenses] = await Promise.all([
      this.memberRepo.getActiveCount(churchId),
      this.contributionRepo.sumInPeriod(churchId, monthStart, now),
      this.expenseRepo.sumInPeriod(churchId, monthStart, now),
    ]);

    return new DashboardKPI({
      totalMembers,
      activeMembers: totalMembers,
      recentVisitors: 0,
      mtdGiving,
      mtdExpenses,
      attendancePercentage: 0,
      timestamp: now,
    });
  }
}
`;

// ============================================================================
// PATTERN: HOW TO UPDATE API FUNCTIONS
// ============================================================================

/**
 * Template for refactoring any API function
 * 
 * This applies to all modules' *.functions.ts files
 */

const API_REFACTORING_PATTERN = `
// ============================================================================
// BEFORE (BAD)
// ============================================================================

export const getContributions = createServerFn()
  .handler(async ({ context, data }) => {
    // Direct DB query - not testable!
    const { data: rows } = await context.supabase
      .from("contributions")
      .select("*")
      .eq("church_id", data.churchId)
      .order("occurred_on", { ascending: false });

    // Business logic mixed with API layer
    return {
      contributions: rows.map(r => ({
        id: r.id,
        amount: r.amount,
        category: r.category_id,
      })),
    };
  });

// ============================================================================
// AFTER (GOOD)
// ============================================================================

export const getContributions = createServerFn()
  .handler(async ({ context, data }) => {
    try {
      // 1. Create context using factory
      const financeContext = createFinanceContext(context.supabase);

      // 2. Call service (not repository directly)
      const contributions = await financeContext.contributionService
        .findContributions({
          churchId: data.churchId,
          limit: data.limit ?? 20,
          offset: data.offset ?? 0,
        });

      // 3. Return DTOs (not domain entities)
      return {
        success: true,
        data: contributions.map(toContributionDTO),
      };
    } catch (error) {
      // 4. Handle domain errors
      return handleDomainError(error);
    }
  });

// Helper function to convert entity to DTO
function toContributionDTO(contribution: Contribution) {
  const props = contribution.props;
  return {
    id: contribution.id,
    amount: props.amount.amount,
    currency: props.amount.currency,
    category: props.categoryId,
    memberId: props.memberId,
    occurredOn: props.occurredOn,
  };
}

// Error handler that converts domain errors to HTTP responses
function handleDomainError(error: Error) {
  if (error instanceof ValidationError) {
    return { success: false, error: error.message, code: error.code, status: 400 };
  }
  if (error instanceof NotFoundError) {
    return { success: false, error: error.message, code: error.code, status: 404 };
  }
  if (error instanceof BusinessRuleViolation) {
    return { success: false, error: error.message, code: error.code, status: 422 };
  }
  return { success: false, error: "Internal server error", status: 500 };
}
`;

// ============================================================================
// QUICK REFERENCE: File Structure for Each Module
// ============================================================================

const MODULE_STRUCTURE = `
src/modules/{MODULE}/
├── domain/
│   ├── {module}.entities.ts              ← Aggregates, Entities, Value Objects
│   ├── {module}.repositories.ts          ← Repository interfaces
│   └── {module}.specifications.ts        ← Optional: Query specifications
│
├── application/
│   └── {module}.service.ts               ← Services orchestrating domain
│
├── infrastructure/
│   ├── {module}.repositories.ts          ← Supabase implementations
│   └── {module}.context.ts               ← Dependency injection factory
│
├── ui/
│   └── *.tsx                             ← React components (presentation only)
│
├── {module}.functions.ts                 ← API: authenticated functions
└── {module}.public.functions.ts          ← API: public functions
`;

// ============================================================================
// COMMAND REFERENCE: How to Apply Changes
// ============================================================================

const IMPLEMENTATION_GUIDE = `
To implement DDD refactoring for remaining modules:

1. START WITH DOMAIN LAYER
   - Create {module}.entities.ts
   - Define all aggregates and entities
   - Add validate() methods
   - Create domain events
   - Add state transition methods

2. CREATE REPOSITORY INTERFACES
   - Create {module}.repositories.ts
   - Define interface for each aggregate
   - Include custom query methods

3. CREATE SERVICES
   - Create {module}.service.ts
   - Inject repositories
   - Implement all use cases
   - Add domain event publishing

4. CREATE INFRASTRUCTURE
   - Create repositories implementation
   - Implement toDomain() and toPersistence()
   - Create context factory

5. UPDATE API FUNCTIONS
   - Remove all business logic
   - Create context using factory
   - Call services
   - Handle errors
   - Return DTOs

Testing order:
1. Domain entities (validate methods, state transitions)
2. Services (with mock repositories)
3. Repositories (with test database)
4. API functions (integration tests)
`;

export {};
