/**
 * POST /api/v1/organizations/:orgId/pledges/:pledgeId/fulfill
 * 
 * Record a pledge fulfillment (payment against pledge)
 * @param pledgeId - Pledge ID (UUID)
 * @body { amount: number, date: string, reference?: string }
 * @returns 200 OK with PledgeFulfillmentResponseDTO
 */

import { defineEventHandler, readBody } from "h3";
import { fulfillPledgeSchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors } from "@/lib/api";

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
    const validation = fulfillPledgeSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid fulfillment data");
    }

    const fulfillmentData = validation.data;

    // TODO: Get finance service
    // Fetch pledge
    // Verify not cancelled
    // Record fulfillment
    // Calculate remaining
    // Auto-complete if remaining = 0
    // Return 200

    return ApiResponse.success({
      fulfilled: true,
      message: "Pledge fulfillment recorded successfully",
      remaining: 7000.00,
      pledgeStatus: "active",
      fulfillmentRecord: {
        id: "fulfillment-uuid",
        pledgeId,
        amount: fulfillmentData.amount,
        currency: "USD",
        date: fulfillmentData.date,
        fulfilledBy: "admin",
        reference: fulfillmentData.reference,
        createdAt: new Date().toISOString(),
      },
    }, 200);
  } catch (error) {
    console.error("Error fulfilling pledge:", error);
    return ApiResponse.serverError(
      "Failed to fulfill pledge",
      "FULFILL_PLEDGE_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
