/**
 * POST /api/v1/organizations/:orgId/members/:memberId/activate
 * 
 * Reactivate an inactive member
 * @param memberId - Member ID (UUID)
 * @returns 200 OK with updated MemberDTO
 */

import { defineEventHandler } from "h3";
import { ApiResponse, toMemberDTO } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { NotFoundError, InvalidStateTransition } from "@/lib/domain-errors";

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

      // Check if already active
      if (member.isActive) {
        return ApiResponse.conflict(
          "Member is already active",
          "ALREADY_ACTIVE"
        );
      }

      // Activate the member
      const activatedMember = await memberService.activateMember(memberId);

      // Convert to DTO
      const dto = toMemberDTO(activatedMember);

      return ApiResponse.success(dto, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }

      if (error instanceof InvalidStateTransition) {
        return ApiResponse.conflict(error.message, "INVALID_STATE_TRANSITION");
      }

      throw error;
    }
  } catch (error) {
    console.error("Error activating member:", error);
    return ApiResponse.serverError(
      "Failed to activate member",
      "ACTIVATE_MEMBER_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
