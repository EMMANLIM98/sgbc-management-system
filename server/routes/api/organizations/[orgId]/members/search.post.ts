/**
 * POST /api/v1/organizations/:orgId/members/search
 * 
 * Search members by name, email, or phone
 * @body { searchTerm: string } - Minimum 2 characters
 * @queryParam page - Page number (default: 1)
 * @queryParam pageSize - Items per page (default: 20)
 * @returns Paginated list of MemberSummaryDTO
 */

import { defineEventHandler, readBody, getQuery } from "h3";
import { paginationQuerySchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors, toMemberSummaryDTOs } from "@/lib/api";
import { getMemberService } from "@/lib/infrastructure";
import { ValidationError } from "@/lib/domain-errors";
import { z } from "zod";

const searchSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters").max(100),
});

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Read and validate request body
    const body = await readBody(event);
    const searchValidation = searchSchema.safeParse(body);

    if (!searchValidation.success) {
      const errors = extractValidationErrors(searchValidation.error);
      return ApiResponse.validationError(errors, "Invalid search request");
    }

    // Validate pagination
    const queryParams = getQuery(event);
    const paginationValidation = paginationQuerySchema.safeParse({
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize as string) : 20,
      sortBy: "name",
      order: "asc",
    });

    if (!paginationValidation.success) {
      const errors = extractValidationErrors(paginationValidation.error);
      return ApiResponse.validationError(errors, "Invalid pagination parameters");
    }

    const { page, pageSize } = paginationValidation.data;
    const { searchTerm } = searchValidation.data;

    // Get member service
    const memberService = getMemberService();

    try {
      // Search members
      const members = await memberService.searchMembers(orgId, searchTerm);

      // Apply pagination manually to results
      const total = members.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedMembers = members.slice(start, end);

      const totalPages = Math.ceil(total / pageSize);
      const pagination = {
        total,
        count: paginatedMembers.length,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      // Convert to summary DTOs
      const dtos = toMemberSummaryDTOs(paginatedMembers);

      return ApiResponse.paginated(dtos, pagination, 200);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ApiResponse.validationError(
          [{ field: "search", message: error.message, code: error.code }],
          "Search validation failed"
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Error searching members:", error);
    return ApiResponse.serverError(
      "Failed to search members",
      "SEARCH_MEMBERS_FAILED"
    );
  }
});
