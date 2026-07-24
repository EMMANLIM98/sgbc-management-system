/**
 * Organization Service Controller
 * 
 * Orchestrates organization/tenancy use cases
 */

import {
  OrganizationRepository,
  type IOrganizationRepository,
} from '@/lib/repositories';
import type { OrganizationDTO } from '@/lib/api/dto/tenancy.dto';
import type {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/lib/api/request-schemas';

export class OrganizationService {
  private repository: IOrganizationRepository;

  constructor(repository?: IOrganizationRepository) {
    this.repository = repository || new OrganizationRepository();
  }

  /**
   * List organizations with pagination
   */
  async listOrganizations(options?: {
    page?: number;
    pageSize?: number;
    status?: 'active' | 'inactive';
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    organizations: OrganizationDTO[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;

    let organizations: OrganizationDTO[];
    let total: number;

    if (options?.status === 'active') {
      organizations = await this.repository.findActive({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: options?.orderBy || 'name',
        order: options?.order || 'asc',
      });
      total = await this.repository.countActive();
    } else {
      organizations = await this.repository.findAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: options?.orderBy || 'name',
        order: options?.order || 'asc',
      });
      total = await this.repository.count();
    }

    return {
      organizations,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get organization details with statistics
   */
  async getOrganizationById(orgId: string): Promise<OrganizationDTO | null> {
    return this.repository.findById(orgId);
  }

  /**
   * Create new organization
   */
  async createOrganization(
    data: CreateOrganizationRequest,
    creatorId: string
  ): Promise<OrganizationDTO> {
    // TODO: Check name not duplicate
    // TODO: Create organization
    // TODO: Add creator as owner
    // TODO: Return created org

    return this.repository.create({
      ...data,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: string,
    data: UpdateOrganizationRequest
  ): Promise<OrganizationDTO | null> {
    // TODO: Validate updates
    // TODO: Check name not duplicate if changed
    // TODO: Update organization

    return this.repository.update(orgId, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(orgId: string): Promise<boolean> {
    // TODO: Check org has no active members
    // TODO: Soft delete organization

    return this.repository.softDelete(orgId);
  }

  /**
   * Assign or update a user's role in an organization
   * 
   * Business Logic:
   * 1. Verify organization exists
   * 2. Verify user (member) exists
   * 3. Verify user is member of organization
   * 4. Enforce business rule: Can't remove last owner
   * 5. Update role flags (is_owner, is_org_admin)
   * 6. Return updated member profile
   * 
   * @param orgId - Organization ID
   * @param userId - User ID (member to update)
   * @param role - New role: 'owner' | 'admin' | 'member'
   * @returns Updated member with new role
   * @throws Error if org/user not found or business rule violated
   */
  async assignUserRole(
    orgId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<any> {
    // Step 1: Verify organization exists
    const organization = await this.repository.findById(orgId);
    if (!organization) {
      throw new Error(`Organization not found: ${orgId}`);
    }

    // Step 2: Verify user (member) exists
    const member = await (new (await import('@/lib/repositories')).MemberRepository()).findById(userId);
    if (!member) {
      throw new Error(`Member not found: ${userId}`);
    }

    // Step 3: Verify user is already in organization
    const orgMembers = await (new (await import('@/lib/repositories')).MemberRepository()).findByOrganizationId(orgId);
    const isMember = orgMembers.some(m => m.id === userId);
    if (!isMember) {
      throw new Error(`User is not a member of this organization`);
    }

    // Step 4: Business rule - Can't remove last owner
    if (role !== 'owner') {
      const currentOwners = orgMembers.filter((m: any) => m.is_owner);
      const currentUserIsOwner = currentOwners.some((m: any) => m.id === userId);
      
      if (currentUserIsOwner && currentOwners.length === 1) {
        throw new Error('Cannot remove the only owner from organization');
      }
    }

    // Step 5: Update member with new role flags
    const memberRepository = new (await import('@/lib/repositories')).MemberRepository();
    const updatedMember = await memberRepository.update(userId, {
      is_owner: role === 'owner',
      is_org_admin: role === 'admin' || role === 'owner',
    } as any);

    if (!updatedMember) {
      throw new Error(`Failed to update member role`);
    }

    // Step 6: Return updated member
    return updatedMember;
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(
    orgId: string,
    userId: string
  ): Promise<boolean> {
    // TODO: Check not last owner
    // TODO: Remove user-org relationship

    return true; // TODO: Implement
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStatistics(orgId: string): Promise<{
    totalMembers: number;
    totalAdmins: number;
    totalOwners: number;
    memberJoinedThisMonth: number;
    activeChurches: number;
    totalEvents: number;
    totalContributions: number;
  }> {
    const stats = await this.repository.getStatistics(orgId);

    return {
      totalMembers: stats.totalMembers,
      totalAdmins: stats.totalAdmins,
      totalOwners: stats.totalOwners,
      memberJoinedThisMonth: 0, // TODO: Calculate
      activeChurches: stats.churchCount,
      totalEvents: stats.eventCount,
      totalContributions: stats.contributionTotal,
    };
  }

  /**
   * Get organizations for user
   */
  async getUserOrganizations(userId: string): Promise<OrganizationDTO[]> {
    // TODO: Get user-org relationships and load org details
    return this.repository.findByUserId(userId);
  }

  /**
   * Check if user is org admin
   */
  async isUserAdmin(orgId: string, userId: string): Promise<boolean> {
    return this.repository.isUserAdmin(orgId, userId);
  }

  /**
   * Check if user is org owner
   */
  async isUserOwner(orgId: string, userId: string): Promise<boolean> {
    return this.repository.isUserOwner(orgId, userId);
  }
}

/**
 * Default instance
 */
export const organizationService = new OrganizationService();
