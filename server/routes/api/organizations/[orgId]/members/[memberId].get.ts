/**
 * GET /api/v1/organizations/:orgId/members/:memberId
 * 
 * Get a specific member with detailed information
 * @param memberId - Member ID (UUID)
 * @returns 200 OK with MemberDetailDTO
 */

import { defineEventHandler } from "h3";
import { ApiResponse, toMemberDetailDTO } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { NotFoundError, ValidationError } from "@/lib/domain-errors";

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

    // Validate UUID format
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

      // Get member statistics (contributions, attendance, etc.)
      const contributions = await memberService.getMemberContributions(memberId);
      const pledges = await memberService.getMemberPledges(memberId);
      const attendance = await memberService.getMemberAttendance(memberId);

      // Convert to detailed DTO
      const dto = toMemberDetailDTO(member, {
        totalContributions: contributions.total,
        pledges: pledges.map(p => ({
          id: p.id,
          amount: p.amount.value,
          frequency: p.frequency,
          status: p.status,
        })),
        eventAttendance: attendance.count,
        lastAttendanceDate: attendance.lastDate,
      });

      return ApiResponse.success(dto, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching member:", error);
    return ApiResponse.serverError(
      "Failed to fetch member",
      "FETCH_MEMBER_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
