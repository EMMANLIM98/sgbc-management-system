/**
 * Event Check-In Application Service
 *
 * Business logic for QR code scanning and check-in validation.
 * Architecture Layer: Application
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { QRCode } from "@/modules/events/domain/qr-code";
import { EventRegistration } from "@/modules/events/domain/event-registration";
import { EventService } from "@/modules/events/application/event.service";

export interface CheckInInput {
  qrToken: string;
  eventId: string;
  churchId: string;
  checkedInBy: string;
  deviceId?: string;
  deviceName?: string;
  location?: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  registration?: EventRegistration;
  qrCode?: QRCode;
  error?: string;
}

/**
 * CheckInService
 *
 * Handles all check-in operations including:
 * - QR code validation
 * - Check-in recording
 * - Validation of event/registration state
 * - Audit trail generation
 */
export class CheckInService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private eventService: EventService,
  ) {}

  /**
   * Process check-in by scanning QR code
   * Validates QR code, registration, and event state before recording check-in
   */
  async checkIn(input: CheckInInput): Promise<CheckInResult> {
    try {
      // 1. Validate QR code exists and get its data
      const qrCode = await this.getQRCodeByToken(input.qrToken);

      if (!qrCode) {
        return {
          success: false,
          message: "Invalid QR code",
          error: "QR_NOT_FOUND",
        };
      }

      // 2. Verify event exists and is active
      const event = await this.eventService.getEventById(qrCode.eventId);

      if (!event) {
        return {
          success: false,
          message: "Event not found",
          error: "EVENT_NOT_FOUND",
        };
      }

      if (!event.isActive() && event.status !== "scheduled") {
        return {
          success: false,
          message: "Event is not active",
          error: "EVENT_NOT_ACTIVE",
        };
      }

      // 3. Verify registration exists and is valid
      const registration = await this.getRegistrationById(qrCode.registrationId);

      if (!registration) {
        return {
          success: false,
          message: "Registration not found",
          error: "REGISTRATION_NOT_FOUND",
        };
      }

      if (registration.status === "cancelled") {
        return {
          success: false,
          message: "Registration has been cancelled",
          error: "REGISTRATION_CANCELLED",
        };
      }

      // 4. Check if already checked in (unless multiple check-ins allowed)
      if (registration.isCheckedIn() && !event.allowMultipleCheckins) {
        return {
          success: false,
          message: "Already checked in",
          error: "ALREADY_CHECKED_IN",
        };
      }

      // 5. Validate QR code status
      if (!qrCode.isValid(event.allowMultipleCheckins)) {
        if (qrCode.hasExpired()) {
          return {
            success: false,
            message: "QR code has expired",
            error: "QR_EXPIRED",
          };
        }

        if (qrCode.isAlreadyScanned() && !event.allowMultipleCheckins) {
          return {
            success: false,
            message: "QR code has already been used",
            error: "QR_ALREADY_SCANNED",
          };
        }
      }

      // 6. Record check-in
      await this.recordCheckIn({
        registrationId: registration.id,
        qrCodeId: qrCode.id,
        eventId: qrCode.eventId,
        churchId: input.churchId,
        checkedInBy: input.checkedInBy,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        location: input.location,
      });

      // 7. Update registration status
      registration.recordCheckIn(
        input.checkedInBy,
        input.deviceId,
        input.deviceName,
        input.location,
      );

      const { error: updateError } = await this.supabase
        .from("event_registrations")
        .update({
          status: "checked_in",
          checked_in_at: new Date(),
          checked_in_by: input.checkedInBy,
          device_id: input.deviceId || null,
          device_name: input.deviceName || null,
          location_checkedin: input.location || null,
          updated_at: new Date(),
        })
        .eq("id", registration.id);

      if (updateError) {
        throw new Error(`Failed to update registration: ${updateError.message}`);
      }

      // 8. Mark QR code as scanned
      qrCode.markAsScanned(input.checkedInBy);

      const { error: qrError } = await this.supabase
        .from("qr_codes")
        .update({
          is_scanned: true,
          scanned_at: new Date(),
          scanned_by: input.checkedInBy,
          updated_at: new Date(),
        })
        .eq("id", qrCode.id);

      if (qrError) {
        throw new Error(`Failed to update QR code: ${qrError.message}`);
      }

      return {
        success: true,
        message: `Successfully checked in ${registration.attendeeName}`,
        registration,
        qrCode,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: "Check-in failed",
        error: message,
      };
    }
  }

  /**
   * Get QR code by token (secure lookup)
   */
  private async getQRCodeByToken(token: string): Promise<QRCode | null> {
    const { data, error } = await this.supabase
      .from("qr_codes")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch QR code: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return QRCode.fromDatabase(data);
  }

  /**
   * Get registration by ID
   */
  private async getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select("*")
      .eq("id", registrationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch registration: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return EventRegistration.fromDatabase(data);
  }

  /**
   * Record check-in in audit trail
   */
  private async recordCheckIn(input: {
    registrationId: string;
    qrCodeId: string;
    eventId: string;
    churchId: string;
    checkedInBy: string;
    deviceId?: string;
    deviceName?: string;
    location?: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("event_checkins").insert([
      {
        registration_id: input.registrationId,
        event_id: input.eventId,
        qr_code_id: input.qrCodeId,
        church_id: input.churchId,
        checked_in_at: new Date(),
        checked_in_by: input.checkedInBy,
        device_id: input.deviceId || null,
        device_name: input.deviceName || null,
        location: input.location || null,
      },
    ]);

    if (error) {
      throw new Error(`Failed to record check-in: ${error.message}`);
    }
  }

  /**
   * Get check-in history for a registration
   */
  async getCheckInHistory(
    registrationId: string,
  ): Promise<Array<{ checkedInAt: Date; checkedInBy: string; location?: string }>> {
    const { data, error } = await this.supabase
      .from("event_checkins")
      .select("checked_in_at, checked_in_by, location")
      .eq("registration_id", registrationId)
      .order("checked_in_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch check-in history: ${error.message}`);
    }

    return (data ?? []).map((record: any) => ({
      checkedInAt: new Date(record.checked_in_at),
      checkedInBy: record.checked_in_by,
      location: record.location,
    }));
  }

  /**
   * Validate QR code without checking in
   * Used for verification before showing full check-in details
   */
  async validateQRCode(
    qrToken: string,
    eventId: string,
  ): Promise<{ valid: boolean; message: string; registration?: any }> {
    const qrCode = await this.getQRCodeByToken(qrToken);

    if (!qrCode) {
      return {
        valid: false,
        message: "Invalid QR code",
      };
    }

    if (qrCode.eventId !== eventId) {
      return {
        valid: false,
        message: "QR code is not for this event",
      };
    }

    const registration = await this.getRegistrationById(qrCode.registrationId);

    if (!registration) {
      return {
        valid: false,
        message: "Registration not found",
      };
    }

    const event = await this.eventService.getEventById(eventId);

    if (!event) {
      return {
        valid: false,
        message: "Event not found",
      };
    }

    if (!qrCode.isValid(event.allowMultipleCheckins)) {
      return {
        valid: false,
        message: qrCode.hasExpired() ? "QR code expired" : "QR code already used",
      };
    }

    return {
      valid: true,
      message: "QR code is valid",
      registration: {
        id: registration.id,
        name: registration.attendeeName,
        email: registration.attendeeEmail,
        phone: registration.attendeePhone,
        isCheckedIn: registration.isCheckedIn(),
      },
    };
  }
}
