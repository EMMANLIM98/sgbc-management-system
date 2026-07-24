/**
 * POST /api/v1/organizations/:orgId/contributions
 * 
 * Create a new contribution record
 * @body ContributionCreateRequest with amount, category, date, member, etc.
 * @returns 201 Created with ContributionDTO
 */

import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { createContributionSchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = createContributionSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid contribution data");
    }

    const contributionData = validation.data;

    // TODO: Get finance service
    // Validate category exists in organization
    // Validate member exists in organization (if provided)
    // Create contribution
    // Convert to DTO
    // Return 201 with Location header

    return ApiResponse.created({
      id: "placeholder-id",
      memberId: contributionData.memberId || "anonymous",
      memberName: "Member Name",
      amount: contributionData.amount,
      currency: "USD",
      category: "Tithe",
      date: new Date().toISOString(),
      recordedBy: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating contribution:", error);
    return ApiResponse.serverError(
      "Failed to create contribution",
      "CREATE_CONTRIBUTION_FAILED"
    );
  }
});

function setHeader(event: any, name: string, value: string) {
  event.node.res.setHeader(name, value);
}
