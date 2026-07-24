/**
 * API Request Validation Utilities
 *
 * Centralized schema definitions for request validation
 * across all API endpoints
 */

import { z } from "zod";

/**
 * Pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("asc")
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Common path parameters
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format")
});

export const orgIdParamSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID")
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid("Invalid event ID")
});

/**
 * Events API Schemas
 */
export const eventListQuerySchema = paginationQuerySchema.extend({
  fromDate: z.string().datetime().optional(),
  status: z.enum(["scheduled", "active", "completed", "cancelled"]).optional()
});

export const createEventRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Valid email is required").max(200),
  phone: z.string().max(40).optional(),
  ageCategory: z
    .enum(["children", "youth", "young_adults", "adults", "seniors"])
    .optional(),
  sex: z.enum(["male", "female"]).optional(),
  visitorStatus: z
    .enum(["member", "visitor", "first_time_guest"])
    .optional()
    .default("first_time_guest"),
  leadershipRole: z
    .enum([
      "pastor",
      "pastor_wife",
      "pastor_children",
      "associate_pastor",
      "elder",
      "deacon",
      "preacher",
      "evangelist",
      "ministry_leader",
      "none"
    ])
    .optional()
    .default("none")
});

export const validateQrSchema = z.object({
  qrToken: z.string().min(1, "QR token is required")
});

export const checkInSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
  checkedInBy: z.string().min(1, "Checked in by is required"),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  location: z.string().optional()
});

export type EventRegistrationRequest = z.infer<
  typeof createEventRegistrationSchema
>;
export type ValidateQrRequest = z.infer<typeof validateQrSchema>;
export type CheckInRequest = z.infer<typeof checkInSchema>;

/**
 * Finance API Schemas
 */
export const createContributionSchema = z.object({
  memberId: z.string().uuid("Invalid member ID"),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  date: z.string().datetime("Invalid date format"),
  notes: z.string().optional()
});

export const updateContributionSchema = createContributionSchema.partial();

export const createPledgeSchema = z.object({
  memberId: z.string().uuid("Invalid member ID"),
  amount: z.number().positive("Amount must be positive"),
  frequency: z.enum(["weekly", "bi-weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date").optional(),
  notes: z.string().optional()
});

export const fulfillPledgeSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().datetime("Invalid date format")
});

export const cancelPledgeSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required").max(500)
});

export type CreateContributionRequest = z.infer<
  typeof createContributionSchema
>;
export type CreatePledgeRequest = z.infer<typeof createPledgeSchema>;
export type FulfillPledgeRequest = z.infer<typeof fulfillPledgeSchema>;

/**
 * Membership API Schemas
 */
export const createMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(40).optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().optional(),
  status: z
    .enum(["active", "inactive", "transferred", "deceased"])
    .default("active"),
  joinDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

export const updateMemberSchema = createMemberSchema.partial();

export const memberSearchQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(["active", "inactive", "transferred", "deceased"])
    .optional(),
  search: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export type CreateMemberRequest = z.infer<typeof createMemberSchema>;
export type UpdateMemberRequest = z.infer<typeof updateMemberSchema>;
export type MemberSearchQuery = z.infer<typeof memberSearchQuerySchema>;

/**
 * Validation Error Extractor
 *
 * Converts Zod validation errors to API error details
 */
export function extractValidationErrors(
  error: z.ZodError
): Array<{ field: string; message: string; code: string }> {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code
  }));
}
