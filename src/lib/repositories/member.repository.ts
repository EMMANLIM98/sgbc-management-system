/**
 * Member Repository
 * 
 * Handles all data access for Member aggregate
 * Implements DDD repository pattern
 */

import { BaseRepository, IRepository } from './base.repository';
import { supabase, addPagination, addSorting, executeQueryArray, executeQuery, executeCountQuery } from './supabase.client';
import type { MemberDTO } from '@/lib/api/dto/membership.dto';
import { toMemberDTO } from '@/lib/api/dto/membership.dto';

export interface IMemberRepository extends IRepository<MemberDTO> {
  /**
   * Find members by organization ID
   */
  findByOrganizationId(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<MemberDTO[]>;

  /**
   * Count members in organization
   */
  countByOrganizationId(orgId: string): Promise<number>;

  /**
   * Find member by email
   */
  findByEmail(email: string): Promise<MemberDTO | null>;

  /**
   * Find members by status
   */
  findByStatus(
    status: 'active' | 'inactive',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<MemberDTO[]>;

  /**
   * Search members by name/email
   */
  search(
    query: string,
    orgId?: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<MemberDTO[]>;

  /**
   * Activate member
   */
  activate(id: string): Promise<boolean>;

  /**
   * Deactivate member
   */
  deactivate(id: string): Promise<boolean>;
}

/**
 * Member Repository Implementation
 */
export class MemberRepository
  extends BaseRepository<MemberDTO>
  implements IMemberRepository
{
  constructor() {
    super('members');
  }

  async findById(id: string): Promise<MemberDTO | null> {
    const data = await executeQuery(
      supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single(),
      `findMemberById(${id})`
    );
    return data ? toMemberDTO(data) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<MemberDTO[]> {
    let query = supabase.from('members').select('*');

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findAllMembers');
    return data.map(toMemberDTO);
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return executeCountQuery(query, 'countMembers');
  }

  async save(entity: MemberDTO): Promise<MemberDTO> {
    if (entity.id) {
      return this.update(entity.id, entity) || entity;
    }
    return this.create(entity);
  }

  async create(data: Partial<MemberDTO>): Promise<MemberDTO> {
    const result = await executeQuery(
      supabase
        .from('members')
        .insert([
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single(),
      'createMember'
    );
    return toMemberDTO(result);
  }

  async update(
    id: string,
    data: Partial<MemberDTO>
  ): Promise<MemberDTO | null> {
    const result = await executeQuery(
      supabase
        .from('members')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      `updateMember(${id})`
    );
    return result ? toMemberDTO(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting member ${id}:`, error);
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
  ): Promise<MemberDTO[]> {
    let query = supabase.from('members').select('*');

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

    const data = await executeQueryArray(query, 'findMembersByFilters');
    return data.map(toMemberDTO);
  }

  async exists(id: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('id', id),
      `existsMember(${id})`
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
  ): Promise<MemberDTO[]> {
    let query = supabase
      .from('members')
      .select('*')
      .eq('organization_id', orgId);

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findMembersByOrgId(${orgId})`);
    return data.map(toMemberDTO);
  }

  async countByOrganizationId(orgId: string): Promise<number> {
    return executeCountQuery(
      supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      `countByOrgId(${orgId})`
    );
  }

  async findByEmail(email: string): Promise<MemberDTO | null> {
    const data = await executeQuery(
      supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .single(),
      `findMemberByEmail(${email})`
    );
    return data ? toMemberDTO(data) : null;
  }

  async findByStatus(
    status: 'active' | 'inactive',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<MemberDTO[]> {
    let query = supabase
      .from('members')
      .select('*')
      .eq('is_active', status === 'active');

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(
      query,
      `findMembersByStatus(${status})`
    );
    return data.map(toMemberDTO);
  }

  async search(
    searchQuery: string,
    orgId?: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<MemberDTO[]> {
    // Full-text search on name and email
    let query = supabase
      .from('members')
      .select('*')
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `searchMembers(${searchQuery})`);
    return data.map(toMemberDTO);
  }

  async activate(id: string): Promise<boolean> {
    return this.update(id, { is_active: true }).then(Boolean);
  }

  async deactivate(id: string): Promise<boolean> {
    return this.update(id, { is_active: false }).then(Boolean);
  }
}
