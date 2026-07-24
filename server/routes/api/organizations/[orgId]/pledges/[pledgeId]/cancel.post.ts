/**
 * POST /api/v1/organizations/:orgId/pledges/:pledgeId/cancel
 * 
 * Cancel an active pledge
 * @param pledgeId - Pledge ID (UUID)
 * @body { reason?: string }
 * @returns 200 OK with updated PledgeDTO
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().optional(),
});

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

    // Read and validate request body
    const body = await readBody(event);
    const validation = cancelSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid request data");
    }

    // TODO: Get finance service
    // Fetch pledge
    // Verify status is active or paused
    // Update status to cancelled
    // Save cancellation reason
    // Return 200

    return ApiResponse.success({
      id: pledgeId,
      memberId: "member-uuid",
      memberName: "John Doe",
      amount: 1000.00,
      currency: "USD",
      frequency: "monthly",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      status: "cancelled",
      totalFulfilled: 3000.00,
      remaining: 0,
      nextDueDate: undefined,
      notes: "Member requested cancellation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error cancelling pledge:", error);
    return ApiResponse.serverError(
      "Failed to cancel pledge",
      "CANCEL_PLEDGE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
