/**
 * POST /api/v1/organizations/:orgId/members/:userId/assign-role
 * 
 * Assign or update a user's role in an organization
 * 
 * Layer: Route Handler (HTTP Concerns Only)
 * Responsibility: Request validation, authorization check, response formatting
 * Delegates to: OrganizationService for business logic
 * 
 * @param orgId - Organization ID (UUID)
 * @param userId - User ID (UUID)
 * @body AssignRoleRequest { role: "owner" | "admin" | "member" }
 * @returns 200 OK with updated OrganizationMemberDTO
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if user not authenticated
 * @returns 403 Forbidden if user not admin
 * @returns 404 Not Found if org/user not found
 * @returns 409 Conflict if business rule violated (e.g., last owner)
 * @returns 500 Server Error if unexpected failure
 */

import { defineEventHandler, readBody } from "h3";
import { ApiResponse, extractValidationErrors, assignRoleSchema } from "@/lib/api";
import { organizationService } from "@/lib/services";

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default defineEventHandler(async (event) => {
  try {
    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: HTTP CONCERNS - Extract & Validate Parameters
    // ═══════════════════════════════════════════════════════════════

    // Extract route parameters
    const orgId = event.context.params?.orgId;
    const userId = event.context.params?.userId;

    // Validate organization ID format
    if (!orgId || !isValidUUID(orgId)) {
      return ApiResponse.badRequest("Invalid organization ID format");
    }

    // Validate user ID format
    if (!userId || !isValidUUID(userId)) {
      return ApiResponse.badRequest("Invalid user ID format");
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: HTTP CONCERNS - Read & Validate Request Body
    // ═══════════════════════════════════════════════════════════════

    const body = await readBody(event);
    const validation = assignRoleSchema.safeParse(body);

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(
        errors,
        "Invalid role assignment request"
      );
    }

    const { role } = validation.data;

    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: HTTP CONCERNS - Authentication Check
    // ═══════════════════════════════════════════════════════════════

    // Extract authenticated user from context (would come from auth middleware)
    const currentUserId = event.context.user?.id;
    if (!currentUserId) {
      return ApiResponse.unauthorized("User not authenticated");
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: HTTP CONCERNS - Authorization Check
    // ═══════════════════════════════════════════════════════════════

    // Verify current user is org admin or owner (has permission to assign roles)
    const isUserAdmin = await organizationService.isUserAdmin(
      orgId,
      currentUserId
    );
    const isUserOwner = await organizationService.isUserOwner(
      orgId,
      currentUserId
    );

    if (!isUserAdmin && !isUserOwner) {
      return ApiResponse.forbidden(
        "Only organization admins or owners can assign roles"
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 2: BUSINESS LOGIC - Delegate to Service
    // ═══════════════════════════════════════════════════════════════

    // Service handles all business logic:
    // - Verify organization exists
    // - Verify member exists
    // - Check member is in organization
    // - Validate role assignment (e.g., can't remove last owner)
    // - Execute update
    // - Return updated member profile

    const updatedMember = await organizationService.assignUserRole(
      orgId,
      userId,
      role
    );

    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: HTTP CONCERNS - Format Response
    // ═══════════════════════════════════════════════════════════════

    return ApiResponse.success(
      updatedMember,
      200,
      `Role updated to ${role} successfully`
    );
  } catch (error) {
    // ═══════════════════════════════════════════════════════════════
    // ERROR HANDLING - Map Service Errors to HTTP Status Codes
    // ═══════════════════════════════════════════════════════════════

    console.error("Error assigning role:", error);

    if (error instanceof Error) {
      const message = error.message;

      // Resource not found errors → 404
      if (
        message.includes("Organization not found") ||
        message.includes("Member not found")
      ) {
        return ApiResponse.notFound(message);
      }

      // Membership validation errors → 409 Conflict
      if (message.includes("not a member of this organization")) {
        return ApiResponse.conflict(
          "User is not a member of this organization"
        );
      }

      // Business rule violations → 409 Conflict
      if (message.includes("Cannot remove")) {
        return ApiResponse.conflict(message);
      }

      // Generic business logic errors → 400 Bad Request
      if (message.includes("Failed")) {
        return ApiResponse.badRequest(message);
      }
    }

    // Unexpected errors → 500 Server Error
    return ApiResponse.serverError(
      "Failed to assign role",
      "ASSIGN_ROLE_FAILED"
    );
  }
});
