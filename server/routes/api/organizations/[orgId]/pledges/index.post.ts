/**
 * POST /api/v1/organizations/:orgId/pledges
 * 
 * Create a new pledge
 * @body PledgeCreateRequest
 * @returns 201 Created with PledgeDTO
 */

import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { createPledgeSchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = createPledgeSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid pledge data");
    }

    const pledgeData = validation.data;

    // TODO: Get finance service
    // Validate member exists
    // Create pledge
    // Convert to DTO
    // Return 201 with Location header

    const pledgeId = "pledge-uuid";
    setResponseStatus(event, 201);
    setHeader(event, "Location", `/api/v1/organizations/${orgId}/pledges/${pledgeId}`);

    return ApiResponse.created({
      id: pledgeId,
      memberId: pledgeData.memberId,
      memberName: "Member Name",
      amount: pledgeData.amount,
      currency: "USD",
      frequency: pledgeData.frequency,
      startDate: pledgeData.startDate,
      endDate: pledgeData.endDate,
      status: "active",
      totalFulfilled: 0,
      remaining: pledgeData.amount,
      nextDueDate: pledgeData.startDate,
      notes: pledgeData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating pledge:", error);
    return ApiResponse.serverError(
      "Failed to create pledge",
      "CREATE_PLEDGE_FAILED"
    );
  }
});

function setHeader(event: any, name: string, value: string) {
  event.node.res.setHeader(name, value);
}
