/**
 * DELETE /api/v1/organizations/:orgId/members/:memberId
 * 
 * Deactivate a member (soft delete)
 * @param memberId - Member ID (UUID)
 * @returns 204 No Content
 */

import { defineEventHandler, setResponseStatus } from "h3";
import { ApiResponse } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { NotFoundError } from "@/lib/domain-errors";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;
    const memberId = event.context.params?.memberId;

    // Validate IDs
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    if (!memberId || typeof memberId !== "string") {
      return ApiResponse.badRequest("Member ID is required");
    }

    if (!isValidUUID(memberId)) {
      return ApiResponse.badRequest("Invalid member ID format");
    }

    // Get member service
    const memberService = getMemberService();

    try {
      // Fetch the member
      const member = await memberService.getMember(memberId);

      // Verify member belongs to the organization
      if (member.organizationId && member.organizationId !== orgId) {
        return ApiResponse.notFound("Member not found in this organization");
      }

      // Deactivate the member
      await memberService.deactivateMember(memberId);

      // Return 204 No Content
      setResponseStatus(event, 204);
      return null;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deactivating member:", error);
    return ApiResponse.serverError(
      "Failed to deactivate member",
      "DEACTIVATE_MEMBER_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
