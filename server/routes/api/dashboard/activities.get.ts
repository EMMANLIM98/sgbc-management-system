/**
 * REST API v1 - Recent Activities Feed
 *
 * Endpoint: GET /api/v1/dashboard/activities
 * Description: Get recent activity feed for dashboard
 * Authentication: Required (user must be authenticated)
 *
 * Query Parameters:
 *   - churchId: UUID (optional) - Filter activities for specific church
 *   - limit: number (default 10, min 1, max 50) - Number of activities to retrieve
 *
 * Response:
 *   Array of activity objects with:
 *   - id: Activity ID
 *   - verb: Action verb (e.g., "created", "updated", "deleted")
 *   - subjectType: Type of subject (e.g., "member", "event", "contribution")
 *   - subjectId: ID of the subject
 *   - meta: Additional context/metadata
 *   - createdAt: ISO 8601 timestamp
 *   - churchId: Church ID
 *   - actor: Actor profile (name)
 *   - church: Church info (name)
 */

import { z } from 'zod';
import { ApiResponse } from '@/lib/api/response';
import { dashboardService } from '@/lib/services/dashboard.service';
import { recentActivitiesQuerySchema, extractValidationErrors } from '@/lib/api/request-schemas';
import { toRecentActivitiesDTO } from '@/lib/api/dto/dashboard.dto';

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
    const validation = recentActivitiesQuerySchema.safeParse(query);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(details, 'Invalid query parameters');
    }

    const { churchId, limit } = validation.data;

    // Get recent activities from service
    const activitiesData = await dashboardService.getRecentActivities(limit, churchId);

    // Map to DTO
    const dto = toRecentActivitiesDTO(activitiesData);

    // Return success response
    setResponseStatus(event, 200);
    return ApiResponse.success(dto, 'Recent activities retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Limit must be between')) {
      setResponseStatus(event, 422);
      return ApiResponse.validationError(
        [{ field: 'limit', message, code: 'INVALID_VALUE' }],
        'Invalid limit parameter'
      );
    }

    if (message.includes('Failed to get activities')) {
      setResponseStatus(event, 500);
      return ApiResponse.error(
        500,
        'ServerError',
        'Failed to retrieve activities. Please try again later.',
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
