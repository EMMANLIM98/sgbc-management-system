/**
 * DELETE /api/v1/organizations/:orgId/expenses/:expenseId
 * 
 * Delete an expense record (only pending expenses can be deleted)
 * @param expenseId - Expense ID (UUID)
 * @returns 204 No Content
 */

import { defineEventHandler, setResponseStatus } from "h3";
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
    // Verify status is pending
    // Delete
    // Return 204

    setResponseStatus(event, 204);
    return null;
  } catch (error) {
    console.error("Error deleting expense:", error);
    return ApiResponse.serverError(
      "Failed to delete expense",
      "DELETE_EXPENSE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
