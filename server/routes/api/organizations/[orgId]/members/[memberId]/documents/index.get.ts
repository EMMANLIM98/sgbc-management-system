/**
 * GET /api/v1/organizations/:orgId/members/:memberId/documents
 * 
 * Get all documents for a member
 * @param memberId - Member ID (UUID)
 * @returns 200 OK with array of MemberDocumentDTO
 */

import { defineEventHandler } from "h3";
import { ApiResponse, toMemberDocumentDTOs } from "@/lib/api";
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
      // Verify member exists and belongs to organization
      const member = await memberService.getMember(memberId);
      if (member.organizationId && member.organizationId !== orgId) {
        return ApiResponse.notFound("Member not found in this organization");
      }

      // Fetch member documents
      const documents = await memberService.getMemberDocuments(memberId);

      // Convert to DTOs
      const dtos = toMemberDocumentDTOs(documents);

      return ApiResponse.success(dtos, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching member documents:", error);
    return ApiResponse.serverError(
      "Failed to fetch member documents",
      "FETCH_DOCUMENTS_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
