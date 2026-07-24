/**
 * Contribution Repository
 * 
 * Handles all data access for Contribution aggregate
 */

import { BaseRepository, IRepository } from './base.repository';
import { supabase, addPagination, addSorting, executeQueryArray, executeQuery, executeCountQuery } from './supabase.client';
import type { ContributionDTO } from '@/lib/api/dto/finance.dto';
import { toContributionDTO } from '@/lib/api/dto/finance.dto';

export interface IContributionRepository extends IRepository<ContributionDTO> {
  /**
   * Find contributions by organization
   */
  findByOrganizationId(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<ContributionDTO[]>;

  /**
   * Find contributions by member
   */
  findByMemberId(
    memberId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ContributionDTO[]>;

  /**
   * Find contributions by category
   */
  findByCategory(
    category: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ContributionDTO[]>;

  /**
   * Sum contributions for organization
   */
  sumByOrganization(orgId: string): Promise<number>;

  /**
   * Sum contributions by category for organization
   */
  sumByCategoryForOrganization(orgId: string, category: string): Promise<number>;

  /**
   * Get contribution summary statistics
   */
  getSummary(orgId: string): Promise<{
    totalContributions: number;
    averageContribution: number;
    contributorCount: number;
    topCategory: string;
  }>;
}

/**
 * Contribution Repository Implementation
 */
export class ContributionRepository
  extends BaseRepository<ContributionDTO>
  implements IContributionRepository
{
  constructor() {
    super('contributions');
  }

  async findById(id: string): Promise<ContributionDTO | null> {
    const data = await executeQuery(
      supabase
        .from('contributions')
        .select('*')
        .eq('id', id)
        .single(),
      `findContributionById(${id})`
    );
    return data ? toContributionDTO(data) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<ContributionDTO[]> {
    let query = supabase.from('contributions').select('*');

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findAllContributions');
    return data.map(toContributionDTO);
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return executeCountQuery(query, 'countContributions');
  }

  async save(entity: ContributionDTO): Promise<ContributionDTO> {
    if (entity.id) {
      return this.update(entity.id, entity) || entity;
    }
    return this.create(entity);
  }

  async create(data: Partial<ContributionDTO>): Promise<ContributionDTO> {
    const result = await executeQuery(
      supabase
        .from('contributions')
        .insert([
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single(),
      'createContribution'
    );
    return toContributionDTO(result);
  }

  async update(
    id: string,
    data: Partial<ContributionDTO>
  ): Promise<ContributionDTO | null> {
    const result = await executeQuery(
      supabase
        .from('contributions')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      `updateContribution(${id})`
    );
    return result ? toContributionDTO(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting contribution ${id}:`, error);
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
  ): Promise<ContributionDTO[]> {
    let query = supabase.from('contributions').select('*');

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

    const data = await executeQueryArray(query, 'findContributionsByFilters');
    return data.map(toContributionDTO);
  }

  async exists(id: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('id', id),
      `existsContribution(${id})`
    );
    return count > 0;
  }

  async findByOrganizationId(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<ContributionDTO[]> {
    let query = supabase
      .from('contributions')
      .select('*')
      .eq('organization_id', orgId);

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findContributionsByOrgId(${orgId})`);
    return data.map(toContributionDTO);
  }

  async findByMemberId(
    memberId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ContributionDTO[]> {
    let query = supabase
      .from('contributions')
      .select('*')
      .eq('member_id', memberId);

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findContributionsByMemberId(${memberId})`);
    return data.map(toContributionDTO);
  }

  async findByCategory(
    category: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ContributionDTO[]> {
    let query = supabase
      .from('contributions')
      .select('*')
      .eq('category', category);

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findContributionsByCategory(${category})`);
    return data.map(toContributionDTO);
  }

  async sumByOrganization(orgId: string): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('organization_id', orgId);

    if (error) {
      console.error(`Error summing contributions for org ${orgId}:`, error);
      return 0;
    }

    return data ? data.reduce((sum, c) => sum + (c.amount || 0), 0) : 0;
  }

  async sumByCategoryForOrganization(
    orgId: string,
    category: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount')
      .eq('organization_id', orgId)
      .eq('category', category);

    if (error) {
      console.error(
        `Error summing contributions by category for org ${orgId}:`,
        error
      );
      return 0;
    }

    return data ? data.reduce((sum, c) => sum + (c.amount || 0), 0) : 0;
  }

  async getSummary(orgId: string): Promise<{
    totalContributions: number;
    averageContribution: number;
    contributorCount: number;
    topCategory: string;
  }> {
    const { data, error } = await supabase
      .from('contributions')
      .select('amount, category, member_id')
      .eq('organization_id', orgId);

    if (error || !data) {
      console.error(`Error getting contribution summary for org ${orgId}:`, error);
      return {
        totalContributions: 0,
        averageContribution: 0,
        contributorCount: 0,
        topCategory: '',
      };
    }

    const total = data.reduce((sum, c) => sum + (c.amount || 0), 0);
    const contributors = new Set(data.map(c => c.member_id)).size;
    const categories = data.map(c => c.category);
    const topCategory =
      categories.length > 0
        ? categories.sort(
            (a, b) =>
              categories.filter(c => c === b).length -
              categories.filter(c => c === a).length
          )[0]
        : '';

    return {
      totalContributions: total,
      averageContribution: contributors > 0 ? total / contributors : 0,
      contributorCount: contributors,
      topCategory,
    };
  }
}
