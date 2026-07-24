/**
 * DELETE /api/v1/organizations/:orgId/members/:userId
 * 
 * Remove a user from an organization
 * @param orgId - Organization ID (UUID)
 * @param userId - User ID (UUID)
 * @returns 204 No Content
 */

import { defineEventHandler, setResponseStatus } from "h3";
import { ApiResponse } from "@/lib/api";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const userId = event.context.params?.userId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!isValidUUID(orgId)) {
      return ApiResponse.badRequest("Invalid organization ID format");
    }

    if (!userId || typeof userId !== "string") {
      return ApiResponse.badRequest("User ID is required");
    }

    if (!isValidUUID(userId)) {
      return ApiResponse.badRequest("Invalid user ID format");
    }

    // TODO: Check authorization (current user must be org admin or owner)
    // TODO: Fetch organization
    // TODO: Fetch user-organization relationship
    // TODO: Verify user exists and is in organization
    // TODO: Prevent removing the last owner
    // TODO: Delete user-organization relationship
    // TODO: Return 204 No Content

    setResponseStatus(event, 204);
    return null;
  } catch (error) {
    console.error("Error removing member:", error);
    return ApiResponse.serverError(
      "Failed to remove member",
      "REMOVE_MEMBER_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
