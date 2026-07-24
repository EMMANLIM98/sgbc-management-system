/**
 * POST /api/v1/organizations/:orgId/members
 * 
 * Create a new member in the organization
 * @body MemberCreateRequest with name, email, phone, etc.
 * @returns 201 Created with MemberDTO
 */

import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { createMemberSchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors, toMemberDTO } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { ValidationError } from "@/lib/domain-errors";

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Read and validate request body
    const body = await readBody(event);
    const validation = createMemberSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid member data");
    }

    const memberData = validation.data;

    // Get member service
    const memberService = getMemberService();

    try {
      // Create the member
      const member = await memberService.recordMember({
        organizationId: orgId,
        churchId: memberData.churchId || orgId,
        name: memberData.name,
        email: memberData.email,
        phone: memberData.phone,
        category: memberData.category || "member",
        joinDate: memberData.joinDate ? new Date(memberData.joinDate) : new Date(),
        dateOfBirth: memberData.dateOfBirth ? new Date(memberData.dateOfBirth) : undefined,
        gender: memberData.gender,
        maritalStatus: memberData.maritalStatus,
        occupation: memberData.occupation,
        baptismDate: memberData.baptismDate ? new Date(memberData.baptismDate) : undefined,
      });

      // Convert to DTO
      const dto = toMemberDTO(member);

      // Set response status to 201 Created
      setResponseStatus(event, 201);
      
      // Set Location header
      setHeader(event, "Location", `/api/v1/organizations/${orgId}/members/${member.id}`);

      return ApiResponse.created(dto);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ApiResponse.validationError(
          [{ field: "member", message: error.message, code: error.code }],
          "Member validation failed"
        );
      }

      // Check for duplicate email if applicable
      if (error instanceof Error && error.message.includes("duplicate")) {
        return ApiResponse.conflict(
          "A member with this email already exists",
          "DUPLICATE_EMAIL",
          { email: memberData.email }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Error creating member:", error);
    return ApiResponse.serverError(
      "Failed to create member",
      "CREATE_MEMBER_FAILED"
    );
  }
});

function setHeader(event: any, name: string, value: string) {
  event.node.res.setHeader(name, value);
}
