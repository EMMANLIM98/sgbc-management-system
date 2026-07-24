/**
 * Expense Service Controller
 * 
 * Orchestrates expense (spending) use cases
 */

import {
  ExpenseRepository,
  type IExpenseRepository,
} from '@/lib/repositories';
import type { ExpenseDTO } from '@/lib/api/dto/finance.dto';

export class ExpenseService {
  private repository: IExpenseRepository;

  constructor(repository?: IExpenseRepository) {
    this.repository = repository || new ExpenseRepository();
  }

  /**
   * List expenses with pagination
   */
  async listExpenses(
    orgId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: 'pending' | 'approved' | 'rejected';
      category?: string;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<{
    expenses: ExpenseDTO[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let expenses: ExpenseDTO[];
    let total: number;

    if (options?.status) {
      expenses = await this.repository.findByStatus(options.status, {
        limit: pageSize,
        offset,
      });
      total = (
        await this.repository.findByStatus(options.status)
      ).length;
    } else if (options?.category) {
      expenses = await this.repository.findByCategory(options.category, {
        limit: pageSize,
        offset,
      });
      total = (
        await this.repository.findByCategory(options.category)
      ).length;
    } else {
      expenses = await this.repository.findByOrganizationId(orgId, {
        limit: pageSize,
        offset,
        orderBy: options?.orderBy || 'created_at',
        order: options?.order || 'desc',
      });
      total = (
        await this.repository.findByOrganizationId(orgId)
      ).length;
    }

    return {
      expenses,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(expenseId: string): Promise<ExpenseDTO | null> {
    return this.repository.findById(expenseId);
  }

  /**
   * Create new expense
   */
  async createExpense(
    orgId: string,
    data: Partial<ExpenseDTO>
  ): Promise<ExpenseDTO> {
    // TODO: Validate required fields
    // TODO: Create expense (status = pending)
    // TODO: Assign to admin for approval

    return this.repository.create({
      ...data,
      organization_id: orgId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update expense
   */
  async updateExpense(
    expenseId: string,
    data: Partial<ExpenseDTO>
  ): Promise<ExpenseDTO | null> {
    return this.repository.update(expenseId, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Delete expense (only if pending)
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    const expense = await this.repository.findById(expenseId);
    // TODO: Check if expense is pending
    // TODO: Delete if allowed

    if (expense && expense.status === 'pending') {
      return this.repository.delete(expenseId);
    }

    return false;
  }

  /**
   * Approve expense
   */
  async approveExpense(
    expenseId: string,
    approvedBy: string
  ): Promise<ExpenseDTO | null> {
    // TODO: Update status to approved
    // TODO: Record approver
    // TODO: Possibly trigger payment/booking

    return this.repository.update(expenseId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Reject expense
   */
  async rejectExpense(
    expenseId: string,
    rejectionReason: string,
    rejectedBy: string
  ): Promise<ExpenseDTO | null> {
    // TODO: Update status to rejected
    // TODO: Record rejection reason and person
    // TODO: Notify submitter

    return this.repository.update(expenseId, {
      status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get expenses pending approval
   */
  async getPendingApproval(orgId: string): Promise<ExpenseDTO[]> {
    return this.repository.findPendingApproval(orgId);
  }

  /**
   * Get expense summary/statistics
   */
  async getSummary(orgId: string): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalAmount: number;
    approvedAmount: number;
    averageExpense: number;
  }> {
    const summary = await this.repository.getSummary(orgId);
    const approvedAmount = await this.repository.sumApprovedExpenses(orgId);

    return {
      totalPending: summary.totalPending,
      totalApproved: summary.totalApproved,
      totalRejected: summary.totalRejected,
      totalAmount: summary.totalAmount,
      approvedAmount,
      averageExpense: summary.totalAmount / (summary.totalPending + summary.totalApproved + summary.totalRejected || 1),
    };
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(
    orgId: string,
    category: string
  ): Promise<ExpenseDTO[]> {
    // TODO: Filter by org and category
    return this.repository.findByCategory(category);
  }
}

/**
 * Default instance
 */
export const expenseService = new ExpenseService();
