/**
 * GET /api/v1/organizations/:orgId/expenses
 * 
 * List all expenses with pagination and filtering
 * @queryParam page - Page number (default: 1)
 * @queryParam pageSize - Items per page (default: 20, max: 100)
 * @queryParam status - Filter by status (pending|approved|rejected|paid)
 * @queryParam category - Filter by category ID
 * @queryParam fromDate - Filter from date (ISO 8601)
 * @queryParam toDate - Filter to date (ISO 8601)
 * @queryParam sortBy - Sort field (date|amount|createdAt)
 * @queryParam order - Sort order (asc|desc)
 * @returns Paginated list of ExpenseDTO
 */

import { defineEventHandler, getQuery } from "h3";
import { paginationQuerySchema } from "@/lib/api/request-schemas";
import { ApiResponse, extractValidationErrors } from "@/lib/api";
import { z } from "zod";

const listExpensesSchema = paginationQuerySchema.extend({
  status: z.enum(["pending", "approved", "rejected", "paid"]).optional(),
  category: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
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
    const validation = listExpensesSchema.safeParse({
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize as string) : 20,
      sortBy: queryParams.sortBy || "date",
      order: queryParams.order || "desc",
      status: queryParams.status,
      category: queryParams.category,
      fromDate: queryParams.fromDate,
      toDate: queryParams.toDate,
    });

    if (!validation.success) {
      const errors = extractValidationErrors(validation.error);
      return ApiResponse.validationError(errors, "Invalid query parameters");
    }

    const { page, pageSize, sortBy, order } = validation.data;

    // TODO: Get finance service
    // Query expenses with filters
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
    console.error("Error listing expenses:", error);
    return ApiResponse.serverError(
      "Failed to fetch expenses",
      "FETCH_EXPENSES_FAILED"
    );
  }
});
