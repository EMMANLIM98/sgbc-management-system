/**
 * Unified API Response Builder
 *
 * Provides consistent response format across all endpoints:
 * - Success responses with data
 * - Paginated responses
 * - Error responses with details
 * - Created responses (201)
 */

export interface ApiMeta {
  timestamp: string;
  version: string;
  traceId?: string;
}

export interface PaginationMeta {
  total: number;
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SuccessResponse<T> {
  status: "success";
  code: number;
  data: T;
  meta: ApiMeta;
}

export interface PaginatedResponse<T> {
  status: "success";
  code: number;
  data: T[];
  pagination: PaginationMeta;
  meta: ApiMeta;
}

export interface ErrorDetail {
  field?: string;
  message: string;
  code: string;
  value?: any;
}

export interface ErrorResponse {
  status: "error";
  code: number;
  error: {
    type: string;
    message: string;
    code?: string;
    details?: ErrorDetail[] | Record<string, any>;
  };
  meta: ApiMeta;
}

export class ApiResponse {
  private static getMeta(traceId?: string): ApiMeta {
    return {
      timestamp: new Date().toISOString(),
      version: "v1",
      ...(traceId && { traceId })
    };
  }

  /**
   * Successful response with data
   */
  static success<T>(
    data: T,
    code: number = 200,
    traceId?: string
  ): SuccessResponse<T> {
    return {
      status: "success",
      code,
      data,
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Created response (201)
   */
  static created<T>(
    data: T,
    traceId?: string
  ): SuccessResponse<T> {
    return {
      status: "success",
      code: 201,
      data,
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    data: T[],
    pagination: PaginationMeta,
    code: number = 200,
    traceId?: string
  ): PaginatedResponse<T> {
    return {
      status: "success",
      code,
      data,
      pagination,
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Error response from DomainError or custom error
   */
  static error(
    error: any,
    code: number = 400,
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code,
      error: {
        type: error.constructor.name || "Error",
        message: error.message || "An error occurred",
        ...(error.code && { code: error.code }),
        ...(error.details && { details: error.details })
      },
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Validation error response
   */
  static validationError(
    details: ErrorDetail[],
    message: string = "Validation failed",
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 422,
      error: {
        type: "ValidationError",
        message,
        details
      },
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Not found error response
   */
  static notFound(
    message: string = "Resource not found",
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 404,
      error: {
        type: "NotFoundError",
        message,
        code: "NOT_FOUND"
      },
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Conflict error response (409)
   */
  static conflict(
    message: string,
    code: string = "CONFLICT",
    details?: any,
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 409,
      error: {
        type: "ConflictError",
        message,
        code,
        ...(details && { details })
      },
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Rate limit error response
   */
  static rateLimited(
    message: string = "Too many requests",
    retryAfter: number = 60,
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 429,
      error: {
        type: "RateLimitError",
        message,
        code: "RATE_LIMIT_EXCEEDED"
      },
      meta: {
        ...this.getMeta(traceId),
        retryAfter
      } as any
    };
  }

  /**
   * Unauthorized error response
   */
  static unauthorized(
    message: string = "Unauthorized",
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 401,
      error: {
        type: "UnauthorizedError",
        message,
        code: "UNAUTHORIZED"
      },
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Forbidden error response
   */
  static forbidden(
    message: string = "Forbidden",
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 403,
      error: {
        type: "ForbiddenError",
        message,
        code: "FORBIDDEN"
      },
      meta: this.getMeta(traceId)
    };
  }

  /**
   * Server error response
   */
  static serverError(
    message: string = "Internal server error",
    traceId?: string
  ): ErrorResponse {
    return {
      status: "error",
      code: 500,
      error: {
        type: "InternalServerError",
        message,
        code: "INTERNAL_SERVER_ERROR"
      },
      meta: this.getMeta(traceId)
    };
  }
}

/**
 * Pagination Helper
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    total,
    count: Math.min(pageSize, total - (page - 1) * pageSize),
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Convert error to HTTP status code
 */
export function getStatusCodeForError(error: any): number {
  const errorType = error.constructor.name;

  switch (errorType) {
    case "ValidationError":
    case "ZodError":
      return 422;
    case "NotFoundError":
      return 404;
    case "UnauthorizedError":
      return 401;
    case "ForbiddenError":
      return 403;
    case "BusinessRuleViolation":
    case "ConflictError":
      return 409;
    case "RateLimitError":
      return 429;
    default:
      return 400;
  }
}
