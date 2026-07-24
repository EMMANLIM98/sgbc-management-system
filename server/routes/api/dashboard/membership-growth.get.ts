/**
 * REST API v1 - Membership Growth Chart
 *
 * Endpoint: GET /api/v1/dashboard/membership-growth
 * Description: Get cumulative membership growth data for chart display
 * Authentication: Required (user must be authenticated)
 *
 * Query Parameters:
 *   - churchId: UUID (optional) - Filter growth data for specific church
 *   - months: number (default 6, min 3, max 24) - Number of months to retrieve
 *
 * Response:
 *   Array of objects with:
 *   - label: Month label (e.g., "Jan", "Feb")
 *   - date: Month in YYYY-MM format
 *   - count: Cumulative member count at end of month
 */

import { z } from 'zod';
import { ApiResponse } from '@/lib/api/response';
import { dashboardService } from '@/lib/services/dashboard.service';
import { membershipGrowthQuerySchema, extractValidationErrors } from '@/lib/api/request-schemas';
import { toMembershipGrowthDTO } from '@/lib/api/dto/dashboard.dto';

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication
    const user = event.context.user;
    if (!user?.id) {
      setResponseStatus(event, 401);
      return ApiResponse.unauthorized('Authentication required');
    }

    // Parse and validate query parameters
    const query = getQuery(event);
    const validation = membershipGrowthQuerySchema.safeParse(query);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(details, 'Invalid query parameters');
    }

    const { churchId, months } = validation.data;

    // Get membership growth data from service
    const growthData = await dashboardService.getMembershipGrowth(months, churchId);

    // Map to DTO
    const dto = toMembershipGrowthDTO(growthData);

    // Return success response
    setResponseStatus(event, 200);
    return ApiResponse.success(dto, 'Membership growth data retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Months must be between')) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        [{ field: 'months', message, code: 'INVALID_VALUE' }],
        'Invalid months parameter'
      );
    }

    if (message.includes('Failed to get membership growth')) {
      setResponseStatus(event, 500);
      return ApiResponse.error(
        500,
        'ServerError',
        'Failed to retrieve membership growth data. Please try again later.',
        { originalError: message }
      );
    }

    setResponseStatus(event, 500);
    return ApiResponse.error(
      500,
      'InternalServerError',
      'An unexpected error occurred',
      { originalError: message }
    );
  }
});
