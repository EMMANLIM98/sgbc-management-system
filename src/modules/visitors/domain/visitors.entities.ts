/**
 * Visitors Domain - Entities
 */

import { AggregateRoot } from "@/lib/ddd-base";
import { ValidationError } from "@/lib/domain-errors";

export type VisitorStatus = "new" | "returning" | "converted" | "inactive";

export interface VisitorProps {
  churchId: string;
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  status: VisitorStatus;
  firstVisitDate: Date;
  lastVisitDate: Date;
  visitCount: number;
  referral?: string;
  notes?: string;
  convertedToMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Visitor extends AggregateRoot<VisitorProps> {
  private constructor(id: string, props: VisitorProps) {
    super(id, props);
  }

  static create(
    props: Omit<
      VisitorProps,
      "createdAt" | "updatedAt" | "status" | "visitCount" | "lastVisitDate"
    >,
  ): Visitor {
    const now = new Date();
    const visitor = new Visitor(crypto.randomUUID(), {
      ...props,
      status: "new",
      visitCount: 1,
      lastVisitDate: now,
      createdAt: now,
      updatedAt: now,
    });
    visitor.validate();
    return visitor;
  }

  validate(): void {
    if (!this._props.name || this._props.name.trim().length < 2) {
      throw new ValidationError("Name must be at least 2 characters", "INVALID_NAME");
    }

    if (!this._props.churchId) {
      throw new ValidationError("Church ID is required", "MISSING_CHURCH_ID");
    }

    if (this._props.email && !this.isValidEmail(this._props.email)) {
      throw new ValidationError("Invalid email address", "INVALID_EMAIL");
    }

    if (this._props.firstVisitDate > new Date()) {
      throw new ValidationError("Visit date cannot be in the future", "FUTURE_DATE");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get name(): string {
    return this._props.name;
  }

  get status(): VisitorStatus {
    return this._props.status;
  }

  get churchId(): string {
    return this._props.churchId;
  }

  get visitCount(): number {
    return this._props.visitCount;
  }

  get isNew(): boolean {
    return this._props.status === "new";
  }

  get isReturning(): boolean {
    return (
      this._props.visitCount > 1 &&
      this._props.status !== "converted" &&
      this._props.status !== "inactive"
    );
  }

  /**
   * Record a new visit
   */
  recordVisit(visitDate: Date = new Date()): void {
    if (visitDate > new Date()) {
      throw new ValidationError("Visit date cannot be in the future", "FUTURE_DATE");
    }

    this._props.visitCount += 1;
    this._props.lastVisitDate = visitDate;

    if (this._props.status === "new") {
      this._props.status = "returning";
    } else if (this._props.status === "inactive") {
      this._props.status = "returning";
    }

    this._props.updatedAt = new Date();
  }

  /**
   * Convert to member
   */
  convertToMember(memberId: string): void {
    if (this._props.status === "converted") {
      throw new ValidationError("Visitor already converted", "ALREADY_CONVERTED");
    }

    this._props.status = "converted";
    this._props.convertedToMemberId = memberId;
    this._props.updatedAt = new Date();
  }

  /**
   * Mark as inactive
   */
  markInactive(): void {
    if (this._props.status === "converted") {
      throw new ValidationError("Cannot mark converted visitor as inactive", "INVALID_STATE");
    }
    this._props.status = "inactive";
    this._props.updatedAt = new Date();
  }

  /**
   * Update contact information
   */
  updateInfo(updates: Partial<Pick<VisitorProps, "email" | "phone" | "referral" | "notes">>): void {
    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new ValidationError("Invalid email address", "INVALID_EMAIL");
    }
    Object.assign(this._props, updates);
    this._props.updatedAt = new Date();
  }

  toJSON(): VisitorProps & { id: string } {
    return { ...this._props, id: this.id };
  }

  static fromJSON(data: VisitorProps & { id: string }): Visitor {
    return new Visitor(data.id, data);
  }
}
