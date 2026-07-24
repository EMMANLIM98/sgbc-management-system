/**
 * PATCH /api/v1/organizations/:orgId/expenses/:expenseId
 * 
 * Update expense information (partial update)
 * @param expenseId - Expense ID (UUID)
 * @body UpdateExpenseRequest (partial fields allowed)
 * @returns 200 OK with updated ExpenseDTO
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().uuid().optional(),
  description: z.string().min(1).max(500).optional(),
  date: z.string().datetime().optional(),
  attachment: z.string().url().optional(),
}).strict();

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

    // Read and validate request body
    const body = await readBody(event);
    const validation = updateExpenseSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid update data");
    }

    const updates = validation.data;

    // TODO: Get finance service
    // Fetch expense
    // Verify status is pending (only pending can be updated)
    // Update fields
    // Save
    // Convert to DTO
    // Return 200

    return ApiResponse.success({
      id: expenseId,
      amount: updates.amount || 500.00,
      currency: "USD",
      category: "Maintenance",
      description: updates.description || "Building repairs",
      date: updates.date || new Date().toISOString(),
      approvedBy: undefined,
      status: "pending",
      attachment: updates.attachment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error updating expense:", error);
    return ApiResponse.serverError(
      "Failed to update expense",
      "UPDATE_EXPENSE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
