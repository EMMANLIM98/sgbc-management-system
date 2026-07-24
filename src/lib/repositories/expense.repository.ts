/**
 * Expense Repository
 * 
 * Handles all data access for Expense aggregate
 */

import { BaseRepository, IRepository } from './base.repository';
import { supabase, addPagination, addSorting, executeQueryArray, executeQuery, executeCountQuery } from './supabase.client';
import type { ExpenseDTO } from '@/lib/api/dto/finance.dto';
import { toExpenseDTO } from '@/lib/api/dto/finance.dto';

export interface IExpenseRepository extends IRepository<ExpenseDTO> {
  /**
   * Find expenses by organization
   */
  findByOrganizationId(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<ExpenseDTO[]>;

  /**
   * Find expenses by status
   */
  findByStatus(
    status: 'pending' | 'approved' | 'rejected',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ExpenseDTO[]>;

  /**
   * Find pending approval expenses
   */
  findPendingApproval(orgId: string): Promise<ExpenseDTO[]>;

  /**
   * Find expenses by category
   */
  findByCategory(
    category: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ExpenseDTO[]>;

  /**
   * Sum approved expenses for organization
   */
  sumApprovedExpenses(orgId: string): Promise<number>;

  /**
   * Sum expenses by category
   */
  sumByCategory(orgId: string, category: string): Promise<number>;

  /**
   * Get expense summary
   */
  getSummary(orgId: string): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalAmount: number;
  }>;
}

/**
 * Expense Repository Implementation
 */
export class ExpenseRepository
  extends BaseRepository<ExpenseDTO>
  implements IExpenseRepository
{
  constructor() {
    super('expenses');
  }

  async findById(id: string): Promise<ExpenseDTO | null> {
    const data = await executeQuery(
      supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single(),
      `findExpenseById(${id})`
    );
    return data ? toExpenseDTO(data) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<ExpenseDTO[]> {
    let query = supabase.from('expenses').select('*');

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findAllExpenses');
    return data.map(toExpenseDTO);
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return executeCountQuery(query, 'countExpenses');
  }

  async save(entity: ExpenseDTO): Promise<ExpenseDTO> {
    if (entity.id) {
      return this.update(entity.id, entity) || entity;
    }
    return this.create(entity);
  }

  async create(data: Partial<ExpenseDTO>): Promise<ExpenseDTO> {
    const result = await executeQuery(
      supabase
        .from('expenses')
        .insert([
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single(),
      'createExpense'
    );
    return toExpenseDTO(result);
  }

  async update(
    id: string,
    data: Partial<ExpenseDTO>
  ): Promise<ExpenseDTO | null> {
    const result = await executeQuery(
      supabase
        .from('expenses')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      `updateExpense(${id})`
    );
    return result ? toExpenseDTO(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting expense ${id}:`, error);
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
  ): Promise<ExpenseDTO[]> {
    let query = supabase.from('expenses').select('*');

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

    const data = await executeQueryArray(query, 'findExpensesByFilters');
    return data.map(toExpenseDTO);
  }

  async exists(id: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('id', id),
      `existsExpense(${id})`
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
  ): Promise<ExpenseDTO[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', orgId);

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findExpensesByOrgId(${orgId})`);
    return data.map(toExpenseDTO);
  }

  async findByStatus(
    status: 'pending' | 'approved' | 'rejected',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ExpenseDTO[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('status', status);

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findExpensesByStatus(${status})`);
    return data.map(toExpenseDTO);
  }

  async findPendingApproval(orgId: string): Promise<ExpenseDTO[]> {
    const data = await executeQueryArray(
      supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending'),
      `findPendingApprovalExpenses(${orgId})`
    );
    return data.map(toExpenseDTO);
  }

  async findByCategory(
    category: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ExpenseDTO[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('category', category);

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findExpensesByCategory(${category})`);
    return data.map(toExpenseDTO);
  }

  async sumApprovedExpenses(orgId: string): Promise<number> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('organization_id', orgId)
      .eq('status', 'approved');

    if (error) {
      console.error(`Error summing approved expenses for org ${orgId}:`, error);
      return 0;
    }

    return data ? data.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
  }

  async sumByCategory(orgId: string, category: string): Promise<number> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('organization_id', orgId)
      .eq('category', category);

    if (error) {
      console.error(
        `Error summing expenses by category for org ${orgId}:`,
        error
      );
      return 0;
    }

    return data ? data.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
  }

  async getSummary(orgId: string): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalAmount: number;
  }> {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, status')
      .eq('organization_id', orgId);

    if (error || !data) {
      console.error(`Error getting expense summary for org ${orgId}:`, error);
      return {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalAmount: 0,
      };
    }

    const totalPending = data
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalApproved = data
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalRejected = data
      .filter(e => e.status === 'rejected')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalAmount = totalPending + totalApproved + totalRejected;

    return {
      totalPending,
      totalApproved,
      totalRejected,
      totalAmount,
    };
  }
}
