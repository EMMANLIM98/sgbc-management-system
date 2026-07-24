/**
 * DELETE /api/v1/organizations/:orgId/contributions/:contributionId
 * 
 * Delete a contribution record
 * @param contributionId - Contribution ID (UUID)
 * @returns 204 No Content
 */

import { defineEventHandler, setResponseStatus } from "h3";
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
    // Verify ownership
    // Delete
    // Return 204

    setResponseStatus(event, 204);
    return null;
  } catch (error) {
    console.error("Error deleting contribution:", error);
    return ApiResponse.serverError(
      "Failed to delete contribution",
      "DELETE_CONTRIBUTION_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
