/**
 * REST API v1 - Churches Overview
 *
 * Endpoint: GET /api/v1/dashboard/churches
 * Description: Get overview of all churches with member counts
 * Authentication: Required (user must be authenticated)
 *
 * Query Parameters: None
 *
 * Response:
 *   Array of church objects with:
 *   - id: Church ID
 *   - name: Church name
 *   - city: City location
 *   - photoUrl: Church photo URL
 *   - members: Number of members in church
 */

import { ApiResponse } from '@/lib/api/response';
import { dashboardService } from '@/lib/services/dashboard.service';
import { toChurchesOverviewDTO } from '@/lib/api/dto/dashboard.dto';

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication
    const user = event.context.user;
    if (!user?.id) {
      setResponseStatus(event, 401);
      return ApiResponse.unauthorized('Authentication required');
    }

    // Get churches overview from service
    const churchesData = await dashboardService.getChurchesOverview();

    // Map to DTO
    const dto = toChurchesOverviewDTO(churchesData);

    // Return success response
    setResponseStatus(event, 200);
    return ApiResponse.success(dto, 'Churches overview retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Failed to get churches overview')) {
      setResponseStatus(event, 500);
      return ApiResponse.error(
        500,
        'ServerError',
        'Failed to retrieve churches overview. Please try again later.',
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
