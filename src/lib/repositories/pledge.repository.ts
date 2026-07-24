/**
 * Pledge Repository
 * 
 * Handles all data access for Pledge aggregate
 */

import { BaseRepository, IRepository } from './base.repository';
import { supabase, addPagination, addSorting, executeQueryArray, executeQuery, executeCountQuery } from './supabase.client';
import type { PledgeDTO } from '@/lib/api/dto/finance.dto';
import { toPledgeDTO } from '@/lib/api/dto/finance.dto';

export interface IPledgeRepository extends IRepository<PledgeDTO> {
  /**
   * Find pledges by organization
   */
  findByOrganizationId(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<PledgeDTO[]>;

  /**
   * Find pledges by member
   */
  findByMemberId(memberId: string): Promise<PledgeDTO[]>;

  /**
   * Find pledges by status
   */
  findByStatus(
    status: 'active' | 'completed' | 'cancelled',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PledgeDTO[]>;

  /**
   * Find pledges with pending payments
   */
  findPending(orgId: string): Promise<PledgeDTO[]>;

  /**
   * Sum total pledged amount
   */
  sumTotalPledged(orgId: string): Promise<number>;

  /**
   * Sum total fulfilled amount
   */
  sumTotalFulfilled(orgId: string): Promise<number>;
}

/**
 * Pledge Repository Implementation
 */
export class PledgeRepository
  extends BaseRepository<PledgeDTO>
  implements IPledgeRepository
{
  constructor() {
    super('pledges');
  }

  async findById(id: string): Promise<PledgeDTO | null> {
    const data = await executeQuery(
      supabase
        .from('pledges')
        .select('*')
        .eq('id', id)
        .single(),
      `findPledgeById(${id})`
    );
    return data ? toPledgeDTO(data) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<PledgeDTO[]> {
    let query = supabase.from('pledges').select('*');

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findAllPledges');
    return data.map(toPledgeDTO);
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from('pledges')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return executeCountQuery(query, 'countPledges');
  }

  async save(entity: PledgeDTO): Promise<PledgeDTO> {
    if (entity.id) {
      return this.update(entity.id, entity) || entity;
    }
    return this.create(entity);
  }

  async create(data: Partial<PledgeDTO>): Promise<PledgeDTO> {
    const result = await executeQuery(
      supabase
        .from('pledges')
        .insert([
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single(),
      'createPledge'
    );
    return toPledgeDTO(result);
  }

  async update(
    id: string,
    data: Partial<PledgeDTO>
  ): Promise<PledgeDTO | null> {
    const result = await executeQuery(
      supabase
        .from('pledges')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      `updatePledge(${id})`
    );
    return result ? toPledgeDTO(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('pledges')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting pledge ${id}:`, error);
      return false;
    }
    return true;
  }

  async softDelete(id: string): Promise<boolean> {
    return this.update(id, { status: 'cancelled' }).then(Boolean);
  }

  async findByFilters(
    filters: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<PledgeDTO[]> {
    let query = supabase.from('pledges').select('*');

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

    const data = await executeQueryArray(query, 'findPledgesByFilters');
    return data.map(toPledgeDTO);
  }

  async exists(id: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('pledges')
        .select('*', { count: 'exact', head: true })
        .eq('id', id),
      `existsPledge(${id})`
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
  ): Promise<PledgeDTO[]> {
    let query = supabase
      .from('pledges')
      .select('*')
      .eq('organization_id', orgId);

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findPledgesByOrgId(${orgId})`);
    return data.map(toPledgeDTO);
  }

  async findByMemberId(memberId: string): Promise<PledgeDTO[]> {
    const data = await executeQueryArray(
      supabase
        .from('pledges')
        .select('*')
        .eq('member_id', memberId),
      `findPledgesByMemberId(${memberId})`
    );
    return data.map(toPledgeDTO);
  }

  async findByStatus(
    status: 'active' | 'completed' | 'cancelled',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PledgeDTO[]> {
    let query = supabase
      .from('pledges')
      .select('*')
      .eq('status', status);

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findPledgesByStatus(${status})`);
    return data.map(toPledgeDTO);
  }

  async findPending(orgId: string): Promise<PledgeDTO[]> {
    const data = await executeQueryArray(
      supabase
        .from('pledges')
        .select('*')
        .eq('organization_id', orgId)
        .lt('amount_fulfilled', supabase.raw('amount_pledged')),
      `findPendingPledges(${orgId})`
    );
    return data.map(toPledgeDTO);
  }

  async sumTotalPledged(orgId: string): Promise<number> {
    const { data, error } = await supabase
      .from('pledges')
      .select('amount_pledged')
      .eq('organization_id', orgId);

    if (error) {
      console.error(`Error summing pledges for org ${orgId}:`, error);
      return 0;
    }

    return data
      ? data.reduce((sum, p) => sum + (p.amount_pledged || 0), 0)
      : 0;
  }

  async sumTotalFulfilled(orgId: string): Promise<number> {
    const { data, error } = await supabase
      .from('pledges')
      .select('amount_fulfilled')
      .eq('organization_id', orgId);

    if (error) {
      console.error(
        `Error summing fulfilled pledges for org ${orgId}:`,
        error
      );
      return 0;
    }

    return data
      ? data.reduce((sum, p) => sum + (p.amount_fulfilled || 0), 0)
      : 0;
  }
}
