/**
 * Events Module DTOs (Data Transfer Objects)
 *
 * DTOs are used to transfer data between API layer and clients.
 * They decouple domain models from API contracts.
 */

/**
 * Event List Item DTO
 * Used in list endpoints
 */
export interface EventDTO {
  id: string;
  title: string;
  description: string;
  eventDate: string; // ISO 8601
  startTime: string;
  endTime: string;
  location: string;
  maxCapacity: number;
  remainingCapacity: number;
  registrationCount: number;
  status: "scheduled" | "active" | "completed" | "cancelled";
  churchId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event Detail DTO
 * Used in single event endpoint with more details
 */
export interface EventDetailDTO extends EventDTO {
  registrationDeadline?: string;
  mobileRegLink?: string;
  checkInLink?: string;
  statistics?: {
    totalRegistered: number;
    checkedIn: number;
    cancelled: number;
    noShow: number;
    byAgeCategory?: Record<string, number>;
    byStatus?: Record<string, number>;
  };
}

/**
 * Event Registration DTO
 * Returned after successful registration
 */
export interface EventRegistrationDTO {
  id: string;
  eventId: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  ageCategory?: string;
  sex?: string;
  visitorStatus: "member" | "visitor" | "first_time_guest";
  leadershipRole?: string;
  qrToken: string;
  status: "registered" | "checked_in" | "no_show" | "cancelled";
  registeredAt: string;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event Registration Confirmation DTO
 * Returned immediately after registration
 */
export interface EventRegistrationConfirmationDTO {
  id: string;
  attendeeName: string;
  email: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  qrToken: string;
  confirmationCode: string;
  message: string;
}

/**
 * QR Code Validation Response DTO
 */
export interface QrValidationDTO {
  valid: boolean;
  message: string;
  registration?: {
    id: string;
    name: string;
    email: string;
    status: string;
    isCheckedIn: boolean;
    checkedInAt?: string;
  };
}

/**
 * Check-In Response DTO
 */
export interface CheckInResponseDTO {
  success: boolean;
  message: string;
  registration: {
    id: string;
    name: string;
    email: string;
    status: "checked_in";
  };
  checkedInAt: string;
  checkedInBy: string;
}

/**
 * Event Registration List DTO
 * Used in admin endpoints to list registrations
 */
export interface EventRegistrationListDTO {
  id: string;
  attendeeName: string;
  email: string;
  phone?: string;
  ageCategory?: string;
  visitorStatus: string;
  leadershipRole?: string;
  status: string;
  registeredAt: string;
  checkedInAt?: string;
}

/**
 * Event Statistics DTO
 */
export interface EventStatisticsDTO {
  eventId: string;
  eventTitle: string;
  totalRegistrations: number;
  checkedIn: number;
  cancelled: number;
  noShow: number;
  registrationRate: number; // percentage
  checkInRate: number; // percentage
  byAgeCategory: Record<string, number>;
  byVisitorStatus: Record<string, number>;
  byLeadershipRole: Record<string, number>;
  generatedAt: string;
}

/**
 * Mappers: Convert domain models to DTOs
 */

import type { Event } from "@/modules/events/domain/event";
import type { EventRegistration } from "@/modules/events/domain/event-registration";

/**
 * Convert Event entity to EventDTO
 */
export function toEventDTO(event: Event): EventDTO {
  return {
    id: event.id,
    title: event.title.value,
    description: event.description?.value || "",
    eventDate: event.eventDate.toISOString(),
    startTime: event.startTime?.toISOString() || "",
    endTime: event.endTime?.toISOString() || "",
    location: event.location?.value || "",
    maxCapacity: event.maxCapacity?.value || 0,
    remainingCapacity: event.remainingCapacity?.value || 0,
    registrationCount: event.registrationCount?.value || 0,
    status: event.status.value as any,
    churchId: event.churchId?.value || "",
    organizationId: event.organizationId?.value || "",
    createdAt: event.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: event.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert Event entity to EventDetailDTO
 */
export function toEventDetailDTO(
  event: Event,
  statistics?: any
): EventDetailDTO {
  return {
    ...toEventDTO(event),
    registrationDeadline: event.registrationDeadline?.toISOString(),
    mobileRegLink: `${process.env.VITE_APP_URL}/event-register/${event.id}`,
    checkInLink: `${process.env.VITE_APP_URL}/check-in/${event.id}`,
    statistics
  };
}

/**
 * Convert EventRegistration entity to EventRegistrationDTO
 */
export function toEventRegistrationDTO(
  registration: EventRegistration
): EventRegistrationDTO {
  return {
    id: registration.id,
    eventId: registration.eventId?.value || "",
    attendeeId: registration.attendeeId?.value || "",
    attendeeName: registration.attendeeName?.value || "",
    attendeeEmail: registration.attendeeEmail?.value || "",
    attendeePhone: registration.attendeePhone?.value,
    ageCategory: registration.ageCategory?.value,
    sex: registration.sex?.value,
    visitorStatus: registration.visitorStatus.value as any,
    leadershipRole: registration.leadershipRole?.value,
    qrToken: registration.qrToken?.value || "",
    status: registration.status.value as any,
    registeredAt: registration.registeredAt?.toISOString() || new Date().toISOString(),
    checkedInAt: registration.checkedInAt?.toISOString(),
    createdAt: registration.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: registration.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert EventRegistration to confirmation DTO
 */
export function toEventRegistrationConfirmationDTO(
  registration: EventRegistration,
  event: Event,
  confirmationCode: string
): EventRegistrationConfirmationDTO {
  return {
    id: registration.id,
    attendeeName: registration.attendeeName?.value || "",
    email: registration.attendeeEmail?.value || "",
    eventTitle: event.title.value,
    eventDate: event.eventDate.toISOString(),
    location: event.location?.value || "",
    qrToken: registration.qrToken?.value || "",
    confirmationCode,
    message: `Thank you for registering! Your confirmation code is ${confirmationCode}`
  };
}

/**
 * Create response from validation result
 */
export function toQrValidationDTO(
  valid: boolean,
  registration?: EventRegistration
): QrValidationDTO {
  return {
    valid,
    message: valid ? "QR code is valid" : "QR code is invalid",
    ...(registration && {
      registration: {
        id: registration.id,
        name: registration.attendeeName?.value || "",
        email: registration.attendeeEmail?.value || "",
        status: registration.status.value,
        isCheckedIn: registration.status.value === "checked_in",
        checkedInAt: registration.checkedInAt?.toISOString()
      }
    })
  };
}

/**
 * Create check-in response
 */
export function toCheckInResponseDTO(
  registration: EventRegistration,
  checkedInBy: string
): CheckInResponseDTO {
  return {
    success: true,
    message: "Successfully checked in",
    registration: {
      id: registration.id,
      name: registration.attendeeName?.value || "",
      email: registration.attendeeEmail?.value || "",
      status: "checked_in"
    },
    checkedInAt: new Date().toISOString(),
    checkedInBy
  };
}

/**
 * Batch mapper for registration lists
 */
export function toEventRegistrationListDTOs(
  registrations: EventRegistration[]
): EventRegistrationListDTO[] {
  return registrations.map((r) => ({
    id: r.id,
    attendeeName: r.attendeeName?.value || "",
    email: r.attendeeEmail?.value || "",
    phone: r.attendeePhone?.value,
    ageCategory: r.ageCategory?.value,
    visitorStatus: r.visitorStatus.value,
    leadershipRole: r.leadershipRole?.value,
    status: r.status.value,
    registeredAt: r.registeredAt?.toISOString() || new Date().toISOString(),
    checkedInAt: r.checkedInAt?.toISOString()
  }));
}
