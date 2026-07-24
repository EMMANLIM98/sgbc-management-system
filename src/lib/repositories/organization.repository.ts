/**
 * Organization Repository
 * 
 * Handles all data access for Organization aggregate
 * Implements DDD repository pattern
 */

import { BaseRepository, IRepository } from './base.repository';
import { supabase, addPagination, addSorting, executeQueryArray, executeQuery, executeCountQuery } from './supabase.client';
import type { OrganizationDTO } from '@/lib/api/dto/tenancy.dto';
import { toOrganizationDTO } from '@/lib/api/dto/tenancy.dto';

export interface IOrganizationRepository extends IRepository<OrganizationDTO> {
  /**
   * Find active organizations only
   */
  findActive(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<OrganizationDTO[]>;

  /**
   * Find organization by name
   */
  findByName(name: string): Promise<OrganizationDTO | null>;

  /**
   * Count active organizations
   */
  countActive(): Promise<number>;

  /**
   * Find organizations for user
   */
  findByUserId(userId: string): Promise<OrganizationDTO[]>;

  /**
   * Check if user is organization admin
   */
  isUserAdmin(orgId: string, userId: string): Promise<boolean>;

  /**
   * Check if user is organization owner
   */
  isUserOwner(orgId: string, userId: string): Promise<boolean>;

  /**
   * Get organization members count
   */
  getMemberCount(orgId: string): Promise<number>;

  /**
   * Get organization statistics
   */
  getStatistics(orgId: string): Promise<{
    totalMembers: number;
    totalAdmins: number;
    totalOwners: number;
    churchCount: number;
    eventCount: number;
    contributionTotal: number;
  }>;
}

/**
 * Organization Repository Implementation
 */
export class OrganizationRepository
  extends BaseRepository<OrganizationDTO>
  implements IOrganizationRepository
{
  constructor() {
    super('organizations');
  }

  async findById(id: string): Promise<OrganizationDTO | null> {
    const data = await executeQuery(
      supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single(),
      `findOrganizationById(${id})`
    );
    return data ? toOrganizationDTO(data, 0, []) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<OrganizationDTO[]> {
    let query = supabase.from('organizations').select('*');

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findAllOrganizations');
    return data.map(org => toOrganizationDTO(org, 0, []));
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return executeCountQuery(query, 'countOrganizations');
  }

  async save(entity: OrganizationDTO): Promise<OrganizationDTO> {
    if (entity.id) {
      return this.update(entity.id, entity) || entity;
    }
    return this.create(entity);
  }

  async create(data: Partial<OrganizationDTO>): Promise<OrganizationDTO> {
    const result = await executeQuery(
      supabase
        .from('organizations')
        .insert([
          {
            name: data.name,
            description: data.description,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single(),
      'createOrganization'
    );
    return toOrganizationDTO(result, 0, []);
  }

  async update(
    id: string,
    data: Partial<OrganizationDTO>
  ): Promise<OrganizationDTO | null> {
    const result = await executeQuery(
      supabase
        .from('organizations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      `updateOrganization(${id})`
    );
    return result ? toOrganizationDTO(result, 0, []) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting organization ${id}:`, error);
      return false;
    }
    return true;
  }

  async softDelete(id: string): Promise<boolean> {
    return this.update(id, { is_active: false }).then(Boolean);
  }

  async findByFilters(
    filters: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<OrganizationDTO[]> {
    let query = supabase.from('organizations').select('*');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findOrganizationsByFilters');
    return data.map(org => toOrganizationDTO(org, 0, []));
  }

  async exists(id: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('id', id),
      `existsOrganization(${id})`
    );
    return count > 0;
  }

  async findActive(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<OrganizationDTO[]> {
    let query = supabase
      .from('organizations')
      .select('*')
      .eq('is_active', true);

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findActiveOrganizations');
    return data.map(org => toOrganizationDTO(org, 0, []));
  }

  async findByName(name: string): Promise<OrganizationDTO | null> {
    const data = await executeQuery(
      supabase
        .from('organizations')
        .select('*')
        .eq('name', name)
        .single(),
      `findOrganizationByName(${name})`
    );
    return data ? toOrganizationDTO(data, 0, []) : null;
  }

  async countActive(): Promise<number> {
    return executeCountQuery(
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      'countActiveOrganizations'
    );
  }

  async findByUserId(userId: string): Promise<OrganizationDTO[]> {
    // Join with user_organizations to find orgs for user
    const { data, error } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId);

    if (error || !data) {
      console.error(`Error finding orgs for user ${userId}:`, error);
      return [];
    }

    const orgIds = data.map(row => row.organization_id);
    if (orgIds.length === 0) return [];

    const orgs = await executeQueryArray(
      supabase.from('organizations').select('*').in('id', orgIds),
      `findOrganizationsByUserId(${userId})`
    );

    return orgs.map(org => toOrganizationDTO(org, 0, []));
  }

  async isUserAdmin(orgId: string, userId: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('is_org_admin', true),
      `isUserAdmin(${orgId}, ${userId})`
    );
    return count > 0;
  }

  async isUserOwner(orgId: string, userId: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('is_owner', true),
      `isUserOwner(${orgId}, ${userId})`
    );
    return count > 0;
  }

  async getMemberCount(orgId: string): Promise<number> {
    return executeCountQuery(
      supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      `getMemberCount(${orgId})`
    );
  }

  async getStatistics(orgId: string): Promise<{
    totalMembers: number;
    totalAdmins: number;
    totalOwners: number;
    churchCount: number;
    eventCount: number;
    contributionTotal: number;
  }> {
    // Count members
    const totalMembers = await this.getMemberCount(orgId);

    // Count admins
    const totalAdmins = await executeCountQuery(
      supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_org_admin', true),
      `countAdmins(${orgId})`
    );

    // Count owners
    const totalOwners = await executeCountQuery(
      supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_owner', true),
      `countOwners(${orgId})`
    );

    // Count churches (assuming relation through organization)
    const churchCount = await executeCountQuery(
      supabase
        .from('churches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      `countChurches(${orgId})`
    );

    // Count events
    const eventCount = await executeCountQuery(
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      `countEvents(${orgId})`
    );

    // Sum contributions
    const { data: contributions, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('organization_id', orgId);

    const contributionTotal = contributions
      ? contributions.reduce((sum, c) => sum + (c.amount || 0), 0)
      : 0;

    return {
      totalMembers,
      totalAdmins,
      totalOwners,
      churchCount,
      eventCount,
      contributionTotal,
    };
  }
}
