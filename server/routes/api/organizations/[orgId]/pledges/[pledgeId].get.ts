/**
 * GET /api/v1/organizations/:orgId/pledges/:pledgeId
 * 
 * Get a specific pledge with fulfillment details
 * @param pledgeId - Pledge ID (UUID)
 * @returns 200 OK with PledgeDTO including fulfillments
 */

import { defineEventHandler } from "h3";
import { ApiResponse } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const pledgeId = event.context.params?.pledgeId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!pledgeId || typeof pledgeId !== "string") {
      return ApiResponse.badRequest("Pledge ID is required");
    }

    if (!isValidUUID(pledgeId)) {
      return ApiResponse.badRequest("Invalid pledge ID format");
    }

    // TODO: Get finance service
    // Fetch pledge
    // Verify ownership
    // Calculate remaining amount
    // Get fulfillment records
    // Convert to DTO
    // Return 200

    return ApiResponse.success({
      id: pledgeId,
      memberId: "member-uuid",
      memberName: "John Doe",
      amount: 1000.00,
      currency: "USD",
      frequency: "monthly",
      startDate: new Date().toISOString(),
      endDate: undefined,
      status: "active",
      totalFulfilled: 3000.00,
      remaining: 7000.00,
      nextDueDate: new Date().toISOString(),
      notes: "Support building project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error fetching pledge:", error);
    return ApiResponse.serverError(
      "Failed to fetch pledge",
      "FETCH_PLEDGE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
