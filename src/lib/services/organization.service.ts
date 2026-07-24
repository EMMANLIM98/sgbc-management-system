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
   * Assign user role in organization
   */
  async assignUserRole(
    orgId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<boolean> {
    // TODO: Check user is member of organization
    // TODO: Update user role
    // TODO: Return success

    return true; // TODO: Implement
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
