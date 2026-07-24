/**
 * Finance Module DTOs (Data Transfer Objects)
 */

/**
 * Contribution DTO
 */
export interface ContributionDTO {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // ISO 8601
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contribution Summary DTO
 */
export interface ContributionSummaryDTO {
  totalAmount: number;
  currency: string;
  byCategory: Record<string, number>;
  trend: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
  generatedAt: string;
}

/**
 * Pledge DTO
 */
export interface PledgeDTO {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  currency: string;
  frequency: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate?: string;
  status: "active" | "fulfilled" | "cancelled" | "paused";
  totalFulfilled: number;
  remaining: number;
  nextDueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pledge Fulfillment DTO
 */
export interface PledgeFulfillmentDTO {
  id: string;
  pledgeId: string;
  amount: number;
  currency: string;
  date: string;
  fulfilledBy: string;
  reference?: string;
  createdAt: string;
}

/**
 * Expense DTO
 */
export interface ExpenseDTO {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  approvedBy?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  attachment?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Finance Category DTO
 */
export interface FinanceCategoryDTO {
  id: string;
  name: string;
  kind: "contribution" | "expense";
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pledge Fulfillment Response DTO
 */
export interface PledgeFulfillmentResponseDTO {
  fulfilled: boolean;
  message: string;
  remaining: number;
  pledgeStatus: string;
  fulfillmentRecord: PledgeFulfillmentDTO;
}

/**
 * Finance Statistics DTO
 */
export interface FinanceStatisticsDTO {
  period: string;
  totalContributions: number;
  totalExpenses: number;
  netIncome: number;
  currency: string;
  topContributors: Array<{
    memberName: string;
    amount: number;
  }>;
  contributionsByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  generatedAt: string;
}

/**
 * Mappers: Convert domain models to DTOs
 */

import type { Contribution } from "@/modules/finance/domain/finance.entities";
import type { Pledge } from "@/modules/finance/domain/finance.entities";
import type { Expense } from "@/modules/finance/domain/finance.entities";
import type { FinanceCategory } from "@/modules/finance/domain/finance.entities";

/**
 * Convert Contribution entity to DTO
 */
export function toContributionDTO(contribution: Contribution): ContributionDTO {
  return {
    id: contribution.id,
    memberId: contribution.memberId.value,
    memberName: contribution.memberName?.value || "Anonymous",
    amount: contribution.amount.value,
    currency: contribution.amount.currency,
    category: contribution.category.value,
    date: contribution.date.toISOString(),
    paymentMethod: contribution.paymentMethod?.value,
    reference: contribution.reference?.value,
    notes: contribution.notes?.value,
    recordedBy: contribution.recordedBy?.value || "system",
    createdAt: contribution.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      contribution.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert Contribution list to DTOs
 */
export function toContributionDTOs(
  contributions: Contribution[]
): ContributionDTO[] {
  return contributions.map(toContributionDTO);
}

/**
 * Convert Pledge entity to DTO
 */
export function toPledgeDTO(pledge: Pledge): PledgeDTO {
  return {
    id: pledge.id,
    memberId: pledge.memberId.value,
    memberName: pledge.memberName?.value || "Anonymous",
    amount: pledge.amount.value,
    currency: pledge.amount.currency,
    frequency: pledge.frequency.value as any,
    startDate: pledge.startDate.toISOString(),
    endDate: pledge.endDate?.toISOString(),
    status: pledge.status.value as any,
    totalFulfilled: pledge.totalFulfilled?.value || 0,
    remaining: (pledge.amount.value - (pledge.totalFulfilled?.value || 0)) || 0,
    nextDueDate: pledge.nextDueDate?.toISOString(),
    notes: pledge.notes?.value,
    createdAt: pledge.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      pledge.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert Pledge list to DTOs
 */
export function toPledgeDTOs(pledges: Pledge[]): PledgeDTO[] {
  return pledges.map(toPledgeDTO);
}

/**
 * Convert Expense entity to DTO
 */
export function toExpenseDTO(expense: Expense): ExpenseDTO {
  return {
    id: expense.id,
    amount: expense.amount.value,
    currency: expense.amount.currency,
    category: expense.category.value,
    description: expense.description.value,
    date: expense.date.toISOString(),
    approvedBy: expense.approvedBy?.value,
    status: expense.status.value as any,
    attachment: expense.attachment?.value,
    createdAt: expense.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      expense.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert Expense list to DTOs
 */
export function toExpenseDTOs(expenses: Expense[]): ExpenseDTO[] {
  return expenses.map(toExpenseDTO);
}

/**
 * Convert FinanceCategory entity to DTO
 */
export function toFinanceCategoryDTO(
  category: FinanceCategory
): FinanceCategoryDTO {
  return {
    id: category.id,
    name: category.name.value,
    kind: category.kind.value as any,
    description: category.description?.value,
    active: category.active?.value || true,
    createdAt: category.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      category.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert FinanceCategory list to DTOs
 */
export function toFinanceCategoryDTOs(
  categories: FinanceCategory[]
): FinanceCategoryDTO[] {
  return categories.map(toFinanceCategoryDTO);
}
