/**
 * Test utilities and mock builders
 * Provides helper functions and mock implementations for testing services
 */

import { vi } from 'vitest';
import type { IMemberRepository } from '@/lib/repositories';
import type { IOrganizationRepository } from '@/lib/repositories';
import type { IContributionRepository } from '@/lib/repositories';
import type { IEventRepository } from '@/lib/repositories';
import type { IPledgeRepository } from '@/lib/repositories';
import type { IExpenseRepository } from '@/lib/repositories';

/**
 * Create a mock member repository for testing
 */
export function createMockMemberRepository(
  overrides?: Partial<IMemberRepository>
): IMemberRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    softDelete: vi.fn().mockResolvedValue(false),
    findByFilters: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    countByOrganizationId: vi.fn().mockResolvedValue(0),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByStatus: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    activate: vi.fn().mockResolvedValue(null),
    deactivate: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as IMemberRepository;
}

/**
 * Create a mock organization repository for testing
 */
export function createMockOrganizationRepository(
  overrides?: Partial<IOrganizationRepository>
): IOrganizationRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    softDelete: vi.fn().mockResolvedValue(false),
    findByFilters: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    findActive: vi.fn().mockResolvedValue([]),
    findByName: vi.fn().mockResolvedValue(null),
    countActive: vi.fn().mockResolvedValue(0),
    findByUserId: vi.fn().mockResolvedValue([]),
    isUserAdmin: vi.fn().mockResolvedValue(false),
    isUserOwner: vi.fn().mockResolvedValue(false),
    getMemberCount: vi.fn().mockResolvedValue(0),
    getStatistics: vi.fn().mockResolvedValue({
      totalMembers: 0,
      totalAdmins: 0,
      totalOwners: 0,
      churchCount: 0,
      eventCount: 0,
      contributionTotal: 0,
    }),
    ...overrides,
  } as unknown as IOrganizationRepository;
}

/**
 * Create a mock contribution repository for testing
 */
export function createMockContributionRepository(
  overrides?: Partial<IContributionRepository>
): IContributionRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    softDelete: vi.fn().mockResolvedValue(false),
    findByFilters: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    findByMemberId: vi.fn().mockResolvedValue([]),
    findByCategory: vi.fn().mockResolvedValue([]),
    sumByOrganization: vi.fn().mockResolvedValue(0),
    sumByCategoryForOrganization: vi.fn().mockResolvedValue(0),
    getSummary: vi.fn().mockResolvedValue({
      totalContributions: 0,
      averageContribution: 0,
      contributorCount: 0,
      topCategory: '',
    }),
    ...overrides,
  } as unknown as IContributionRepository;
}

/**
 * Create a mock event repository for testing
 */
export function createMockEventRepository(
  overrides?: Partial<IEventRepository>
): IEventRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    softDelete: vi.fn().mockResolvedValue(false),
    findByFilters: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    findByChurchId: vi.fn().mockResolvedValue([]),
    findUpcoming: vi.fn().mockResolvedValue([]),
    findPast: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
    countAttendees: vi.fn().mockResolvedValue(0),
    hasCapacity: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as IEventRepository;
}

/**
 * Create a mock pledge repository for testing
 */
export function createMockPledgeRepository(
  overrides?: Partial<IPledgeRepository>
): IPledgeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    softDelete: vi.fn().mockResolvedValue(false),
    findByFilters: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    findByMemberId: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
    findPending: vi.fn().mockResolvedValue([]),
    sumTotalPledged: vi.fn().mockResolvedValue(0),
    sumTotalFulfilled: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as IPledgeRepository;
}

/**
 * Create a mock expense repository for testing
 */
export function createMockExpenseRepository(
  overrides?: Partial<IExpenseRepository>
): IExpenseRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(false),
    softDelete: vi.fn().mockResolvedValue(false),
    findByFilters: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
    findPendingApproval: vi.fn().mockResolvedValue([]),
    findByCategory: vi.fn().mockResolvedValue([]),
    sumApprovedExpenses: vi.fn().mockResolvedValue(0),
    sumByCategory: vi.fn().mockResolvedValue(0),
    getSummary: vi.fn().mockResolvedValue({
      totalPending: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalAmount: 0,
    }),
    ...overrides,
  } as unknown as IExpenseRepository;
}

/**
 * Create mock DTOs for testing
 */
export const mockDTOs = {
  organization: {
    id: 'org-123',
    name: 'Test Organization',
    description: 'Test Org Description',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },

  member: {
    id: 'user-123',
    organization_id: 'org-123',
    full_name: 'John Doe',
    email: 'john@example.com',
    is_active: true,
    is_owner: false,
    is_org_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },

  event: {
    id: 'event-123',
    church_id: 'church-123',
    title: 'Sunday Service',
    description: 'Weekly Sunday Service',
    event_date: '2026-02-01T09:00:00Z',
    capacity: 500,
    status: 'scheduled',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },

  contribution: {
    id: 'contrib-123',
    organization_id: 'org-123',
    member_id: 'user-123',
    amount: 100.00,
    category: 'tithe',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },

  pledge: {
    id: 'pledge-123',
    organization_id: 'org-123',
    member_id: 'user-123',
    amount_pledged: 500.00,
    amount_fulfilled: 250.00,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },

  expense: {
    id: 'expense-123',
    organization_id: 'org-123',
    amount: 150.00,
    category: 'utilities',
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

/**
 * Helper to create a mock organization member DTO
 */
export function createMockOrganizationMember(
  overrides?: Partial<typeof mockDTOs.member>
) {
  return {
    ...mockDTOs.member,
    ...overrides,
  };
}

/**
 * Helper to create a mock organization DTO
 */
export function createMockOrganization(
  overrides?: Partial<typeof mockDTOs.organization>
) {
  return {
    ...mockDTOs.organization,
    ...overrides,
  };
}

/**
 * Helper to create a mock member DTO
 */
export function createMockMember(
  overrides?: Partial<typeof mockDTOs.member>
) {
  return {
    ...mockDTOs.member,
    ...overrides,
  };
}

/**
 * Helper to create a mock event DTO
 */
export function createMockEvent(overrides?: Partial<typeof mockDTOs.event>) {
  return {
    ...mockDTOs.event,
    ...overrides,
  };
}

/**
 * Helper to create a mock contribution DTO
 */
export function createMockContribution(
  overrides?: Partial<typeof mockDTOs.contribution>
) {
  return {
    ...mockDTOs.contribution,
    ...overrides,
  };
}

/**
 * Helper to create a mock pledge DTO
 */
export function createMockPledge(
  overrides?: Partial<typeof mockDTOs.pledge>
) {
  return {
    ...mockDTOs.pledge,
    ...overrides,
  };
}

/**
 * Helper to create a mock expense DTO
 */
export function createMockExpense(
  overrides?: Partial<typeof mockDTOs.expense>
) {
  return {
    ...mockDTOs.expense,
    ...overrides,
  };
}
