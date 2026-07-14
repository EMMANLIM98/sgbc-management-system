/**
 * QR Code Value Object
 *
 * Represents a unique QR code for event registration check-in.
 * One QR code per registration, never reused.
 * Contains a secure token, not a database ID.
 * Architecture Layer: Domain
 */

import { randomBytes } from "crypto";

export interface QRCodeProps {
  id: string;
  registrationId: string;
  eventId: string;
  churchId: string;
  token: string;
  isScanned: boolean;
  scannedAt?: Date;
  scannedBy?: string;
  expiresAt?: Date;
  isExpired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * QRCode Value Object
 *
 * Represents a unique QR code for a single event registration.
 * Features:
 * - One per registration (never reused)
 * - Contains secure token (not database ID)
 * - Can be scanned once or multiple times (based on event setting)
 * - Can have expiration
 * - Audit trail of scans
 */
export class QRCode {
  private props: QRCodeProps;

  constructor(props: QRCodeProps) {
    this.props = props;
  }

  /**
   * Generate a new QR code with secure token
   */
  static generate(
    registrationId: string,
    eventId: string,
    churchId: string,
    expiresAt?: Date,
  ): QRCode {
    // Generate a secure random token (32 bytes = 256 bits)
    const token = randomBytes(32).toString("hex");

    return new QRCode({
      id: crypto.randomUUID(),
      registrationId,
      eventId,
      churchId,
      token,
      isScanned: false,
      expiresAt,
      isExpired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromDatabase(dbQR: any): QRCode {
    return new QRCode({
      id: dbQR.id,
      registrationId: dbQR.registration_id,
      eventId: dbQR.event_id,
      churchId: dbQR.church_id,
      token: dbQR.token,
      isScanned: dbQR.is_scanned,
      scannedAt: dbQR.scanned_at ? new Date(dbQR.scanned_at) : undefined,
      scannedBy: dbQR.scanned_by,
      expiresAt: dbQR.expires_at ? new Date(dbQR.expires_at) : undefined,
      isExpired: dbQR.is_expired,
      createdAt: new Date(dbQR.created_at),
      updatedAt: new Date(dbQR.updated_at),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get registrationId(): string {
    return this.props.registrationId;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get churchId(): string {
    return this.props.churchId;
  }

  get token(): string {
    return this.props.token;
  }

  get isScanned(): boolean {
    return this.props.isScanned;
  }

  get scannedAt(): Date | undefined {
    return this.props.scannedAt;
  }

  get scannedBy(): string | undefined {
    return this.props.scannedBy;
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  get isExpired(): boolean {
    return this.props.isExpired;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Check if QR code is valid (not expired and not already scanned)
   */
  isValid(allowMultipleScan: boolean = false): boolean {
    // Check expiration
    if (this.props.expiresAt && new Date() > this.props.expiresAt) {
      return false;
    }

    // Check if already scanned and multiple scans not allowed
    if (this.props.isScanned && !allowMultipleScan) {
      return false;
    }

    return true;
  }

  /**
   * Check if QR code is already scanned
   */
  isAlreadyScanned(): boolean {
    return this.props.isScanned;
  }

  /**
   * Mark QR code as scanned
   */
  markAsScanned(scannedBy: string): void {
    this.props.isScanned = true;
    this.props.scannedAt = new Date();
    this.props.scannedBy = scannedBy;
    this.props.updatedAt = new Date();
  }

  /**
   * Check if QR code has expired
   */
  hasExpired(): boolean {
    if (!this.props.expiresAt) return false;
    return new Date() > this.props.expiresAt;
  }

  /**
   * Get time remaining until expiration (in milliseconds)
   */
  getTimeRemaining(): number | null {
    if (!this.props.expiresAt) return null;
    const remaining = this.props.expiresAt.getTime() - new Date().getTime();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Convert to database format
   */
  toDatabase() {
    return {
      id: this.props.id,
      registration_id: this.props.registrationId,
      event_id: this.props.eventId,
      church_id: this.props.churchId,
      token: this.props.token,
      is_scanned: this.props.isScanned,
      scanned_at: this.props.scannedAt || null,
      scanned_by: this.props.scannedBy || null,
      expires_at: this.props.expiresAt || null,
      is_expired: this.props.isExpired,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }

  /**
   * Convert to QR code data URL format (for QR code generation libraries)
   */
  toQRData(): string {
    // Return in format that can be used with QR code generation libraries
    // e.g., qrcode.toDataURL(this.token)
    return this.props.token;
  }
}
