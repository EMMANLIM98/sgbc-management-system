/**
 * GET /api/v1/organizations/:orgId/contributions/:contributionId
 * 
 * Get a specific contribution record
 * @param contributionId - Contribution ID (UUID)
 * @returns 200 OK with ContributionDTO
 */

import { defineEventHandler } from "h3";
import { ApiResponse } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const contributionId = event.context.params?.contributionId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!contributionId || typeof contributionId !== "string") {
      return ApiResponse.badRequest("Contribution ID is required");
    }

    if (!isValidUUID(contributionId)) {
      return ApiResponse.badRequest("Invalid contribution ID format");
    }

    // TODO: Get finance service
    // Fetch contribution
    // Verify it belongs to organization
    // Convert to DTO
    // Return 200 OK

    return ApiResponse.success({
      id: contributionId,
      memberId: "member-id",
      memberName: "John Doe",
      amount: 500.00,
      currency: "USD",
      category: "Tithe",
      date: new Date().toISOString(),
      recordedBy: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("Error fetching contribution:", error);
    return ApiResponse.serverError(
      "Failed to fetch contribution",
      "FETCH_CONTRIBUTION_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
