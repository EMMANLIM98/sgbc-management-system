/**
 * REST API v1 - Dashboard KPIs
 *
 * Endpoint: GET /api/v1/dashboard/kpis
 * Description: Get key performance indicators for dashboard
 * Authentication: Required (user must be authenticated)
 *
 * Query Parameters:
 *   - churchId: UUID (optional) - Filter KPIs for specific church
 *
 * Response:
 *   - totalMembers: Total number of members
 *   - activeMembers: Number of active/regular members
 *   - visitors: Number of visitors
 *   - churches: Number of churches (1 if churchId provided)
 *   - newLast30: New members in last 30 days
 *   - totalOfferingsMtd: Total offerings for month-to-date
 *   - offeringsDeltaPct: Percentage change in offerings
 */

import { z } from 'zod';
import { ApiResponse } from '@/lib/api/response';
import { dashboardService } from '@/lib/services/dashboard.service';
import { dashboardKpisQuerySchema, extractValidationErrors } from '@/lib/api/request-schemas';
import { toKpiDTO } from '@/lib/api/dto/dashboard.dto';

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
    const validation = dashboardKpisQuerySchema.safeParse(query);

    if (!validation.success) {
      const details = extractValidationErrors(validation.error);
      setResponseStatus(event, 422);
      return ApiResponse.validationError(details, 'Invalid query parameters');
    }

    const { churchId } = validation.data;

    // Get KPI data from service
    const kpiData = await dashboardService.getKpis(churchId);

    // Map to DTO
    const dto = toKpiDTO(kpiData);

    // Return success response
    setResponseStatus(event, 200);
    return ApiResponse.success(dto, 'KPIs retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Failed to get KPIs')) {
      setResponseStatus(event, 500);
      return ApiResponse.error(
        500,
        'ServerError',
        'Failed to retrieve KPIs. Please try again later.',
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
