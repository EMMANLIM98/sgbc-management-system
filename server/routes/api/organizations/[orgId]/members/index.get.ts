/**
 * GET /api/v1/organizations/:orgId/members
 * 
 * List all members in an organization with pagination and filtering
 * @queryParam page - Page number (default: 1)
 * @queryParam pageSize - Items per page (default: 20, max: 100)
 * @queryParam status - Filter by status (active|inactive|transferred|deceased)
 * @queryParam category - Filter by category (member|visitor|prospect)
 * @queryParam sortBy - Sort field (name|joinDate|createdAt)
 * @queryParam order - Sort order (asc|desc)
 * @returns Paginated list of MemberDTO
 */

import { defineEventHandler, getQuery } from "h3";
import { paginationQuerySchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors, toMemberDTOs } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";

export default defineEventHandler(async (event) => {
  try {
    // Get and validate query parameters
    const queryParams = getQuery(event);
    const validation = paginationQuerySchema.safeParse({
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize as string) : 20,
      sortBy: queryParams.sortBy || "name",
      order: queryParams.order || "asc",
    });

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid query parameters");
    }

    const { page, pageSize, sortBy, order } = validation.data;
    const orgId = event.context.params?.orgId;
    const status = queryParams.status as string | undefined;
    const category = queryParams.category as string | undefined;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Get member service
    const memberService = getMemberService();

    // Build query filter
    const query: any = {
      organizationId: orgId,
      sortBy,
      order,
      page,
      pageSize,
    };

    if (status) query.status = status;
    if (category) query.category = category;

    // Fetch members
    const members = await memberService.findMembers(query);
    
    // Get total count for pagination
    const total = await memberService.getMembersCount(orgId, { status, category });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const pagination = {
      total,
      count: members.length,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // Convert to DTOs
    const dtos = toMemberDTOs(members);

    return ApiResponse.paginated(dtos, pagination, 200);
  } catch (error) {
    console.error("Error listing members:", error);
    return ApiResponse.serverError(
      "Failed to fetch members",
      "FETCH_MEMBERS_FAILED"
    );
  }
});
