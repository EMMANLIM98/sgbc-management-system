/**
 * PATCH /api/v1/organizations/:orgId/members/:memberId
 * 
 * Update member information (partial update)
 * @param memberId - Member ID (UUID)
 * @body UpdateMemberRequest (partial fields allowed)
 * @returns 200 OK with updated MemberDTO
 */

import { defineEventHandler, readBody } from "h3";
import { updateMemberSchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors, toMemberDTO } from "@/lib/api";
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

    if (!isValidUUID(memberId)) {
      return ApiResponse.badRequest("Invalid member ID format");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid update data");
    }

    const updates = validation.data;

    // Get member service
    const memberService = getMemberService();

    try {
      // Fetch the member
      const member = await memberService.getMember(memberId);

      // Verify member belongs to the organization
      if (member.organizationId && member.organizationId !== orgId) {
        return ApiResponse.notFound("Member not found in this organization");
      }

      // Build update object with only provided fields
      const updatePayload: any = {};
      
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.email !== undefined) updatePayload.email = updates.email;
      if (updates.phone !== undefined) updatePayload.phone = updates.phone;
      if (updates.dateOfBirth !== undefined) updatePayload.dateOfBirth = updates.dateOfBirth;
      if (updates.gender !== undefined) updatePayload.gender = updates.gender;
      if (updates.maritalStatus !== undefined) updatePayload.maritalStatus = updates.maritalStatus;
      if (updates.occupation !== undefined) updatePayload.occupation = updates.occupation;

      // Update the member
      const updatedMember = await memberService.updateMemberInfo(memberId, updatePayload);

      // Convert to DTO
      const dto = toMemberDTO(updatedMember);

      return ApiResponse.success(dto, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ApiResponse.notFound(error.message);
      }

      if (error instanceof ValidationError) {
        return ApiResponse.validationError(
          [{ field: "member", message: error.message, code: error.code }],
          "Member validation failed"
        );
      }

      // Check for duplicate email
      if (error instanceof Error && error.message.includes("duplicate")) {
        return ApiResponse.conflict(
          "A member with this email already exists",
          "DUPLICATE_EMAIL",
          { email: updates.email }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Error updating member:", error);
    return ApiResponse.serverError(
      "Failed to update member",
      "UPDATE_MEMBER_FAILED"
    );
  }
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
