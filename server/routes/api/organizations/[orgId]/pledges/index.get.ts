/**
 * GET /api/v1/organizations/:orgId/pledges
 * 
 * List all pledges with pagination and filtering
 * @queryParam page - Page number (default: 1)
 * @queryParam pageSize - Items per page (default: 20, max: 100)
 * @queryParam status - Filter by status (active|fulfilled|cancelled|paused)
 * @queryParam memberId - Filter by member ID
 * @queryParam sortBy - Sort field (startDate|amount|createdAt)
 * @queryParam order - Sort order (asc|desc)
 * @returns Paginated list of PledgeDTO
 */

import { defineEventHandler, getQuery } from "h3";
import { paginationQuerySchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const listPledgesSchema = paginationQuerySchema.extend({
  status: z.enum(["active", "fulfilled", "cancelled", "paused"]).optional(),
  memberId: z.string().uuid().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const orgId = event.context.params?.orgId;

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      return ApiResponse.badRequest("Organization ID is required");
    }

    // Get and validate query parameters
    const queryParams = getQuery(event);
    const validation = listPledgesSchema.safeParse({
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize as string) : 20,
      sortBy: queryParams.sortBy || "startDate",
      order: queryParams.order || "desc",
      status: queryParams.status,
      memberId: queryParams.memberId,
    });

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid query parameters");
    }

    const { page, pageSize, sortBy, order, status, memberId } = validation.data;

    // TODO: Get finance service
    // Query pledges with filters
    // Apply pagination
    // Convert to DTOs
    // Return paginated response

    return ApiResponse.paginated([], {
      total: 0,
      count: 0,
      page,
      pageSize,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    }, 200);
  } catch (error) {
    console.error("Error listing pledges:", error);
    return ApiResponse.serverError(
      "Failed to fetch pledges",
      "FETCH_PLEDGES_FAILED"
    );
  }
});
