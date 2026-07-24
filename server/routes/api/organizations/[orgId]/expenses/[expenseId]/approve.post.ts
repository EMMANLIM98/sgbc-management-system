/**
 * POST /api/v1/organizations/:orgId/expenses/:expenseId/approve
 * 
 * Approve a pending expense
 * @param expenseId - Expense ID (UUID)
 * @body { notes?: string }
 * @returns 200 OK with updated ExpenseDTO
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const approveSchema = z.object({
  notes: z.string().optional(),
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
    const validation = approveSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid request data");
    }

    // TODO: Get finance service
    // Fetch expense
    // Verify status is pending
    // Update status to approved
    // Record approved by
    // Record approval notes
    // Return 200

    return ApiResponse.success({
      id: expenseId,
      amount: 500.00,
      currency: "USD",
      category: "Maintenance",
      description: "Building repairs",
      date: new Date().toISOString(),
      approvedBy: "admin-user",
      status: "approved",
      attachment: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error approving expense:", error);
    return ApiResponse.serverError(
      "Failed to approve expense",
      "APPROVE_EXPENSE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
