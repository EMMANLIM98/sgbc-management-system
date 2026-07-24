/**
 * API Layer - Unified Exports
 *
 * Central export point for all API utilities, response builders, and DTOs
 */

// Response & Error Handling
export * from "./response";
export type { ApiMeta, PaginationMeta, SuccessResponse, PaginatedResponse, ErrorResponse, ErrorDetail } from "./response";

// Request Validation
export * from "./request-schemas";
export type {
  PaginationQuery,
  EventRegistrationRequest,
  ValidateQrRequest,
  CheckInRequest,
  CreateContributionRequest,
  CreatePledgeRequest,
  FulfillPledgeRequest,
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberSearchQuery
} from "./request-schemas";

// DTOs
export * from "./dto/events.dto";
export * from "./dto/finance.dto";
export * from "./dto/membership.dto";

export type {
  EventDTO,
  EventDetailDTO,
  EventRegistrationDTO,
  EventRegistrationConfirmationDTO,
  QrValidationDTO,
  CheckInResponseDTO,
  ContributionDTO,
  PledgeDTO,
  ExpenseDTO,
  MemberDTO,
  MemberDetailDTO,
  FamilyLinkDTO
} from "./dto/events.dto";
