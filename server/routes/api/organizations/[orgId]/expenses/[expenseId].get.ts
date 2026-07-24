/**
 * GET /api/v1/organizations/:orgId/expenses/:expenseId
 * 
 * Get a specific expense record
 * @param expenseId - Expense ID (UUID)
 * @returns 200 OK with ExpenseDTO
 */

import { defineEventHandler } from "h3";
import { ApiResponse } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const expenseId = event.context.params?.expenseId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!expenseId || typeof expenseId !== "string") {
      return ApiResponse.badRequest("Expense ID is required");
    }

    if (!isValidUUID(expenseId)) {
      return ApiResponse.badRequest("Invalid expense ID format");
    }

    // TODO: Get finance service
    // Fetch expense
    // Verify ownership
    // Convert to DTO
    // Return 200

    return ApiResponse.success({
      id: expenseId,
      amount: 500.00,
      currency: "USD",
      category: "Maintenance",
      description: "Building repairs",
      date: new Date().toISOString(),
      approvedBy: undefined,
      status: "pending",
      attachment: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return ApiResponse.serverError(
      "Failed to fetch expense",
      "FETCH_EXPENSE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
