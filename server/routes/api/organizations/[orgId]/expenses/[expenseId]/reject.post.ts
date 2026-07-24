/**
 * POST /api/v1/organizations/:orgId/expenses/:expenseId/reject
 * 
 * Reject a pending expense
 * @param expenseId - Expense ID (UUID)
 * @body { reason: string }
 * @returns 200 OK with updated ExpenseDTO
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

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
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid request data");
    }

    const { reason } = validation.data;

    // TODO: Get finance service
    // Fetch expense
    // Verify status is pending
    // Update status to rejected
    // Record rejection reason
    // Return 200

    return ApiResponse.success({
      id: expenseId,
      amount: 500.00,
      currency: "USD",
      category: "Maintenance",
      description: "Building repairs",
      date: new Date().toISOString(),
      approvedBy: undefined,
      status: "rejected",
      attachment: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error rejecting expense:", error);
    return ApiResponse.serverError(
      "Failed to reject expense",
      "REJECT_EXPENSE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
