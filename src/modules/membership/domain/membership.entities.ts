/**
 * Membership Domain - Entities
 * 
 * Core membership aggregates following DDD principles.
 */

import { AggregateRoot } from "@/lib/ddd-base";
import { ValidationError, BusinessRuleViolation, InvalidStateTransition } from "@/lib/domain-errors";

export type MemberStatus = "active" | "inactive" | "transferred" | "deceased";
export type MemberCategory = "member" | "visitor" | "prospect";

export interface MemberProps {
  churchId: string;
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  category: MemberCategory;
  status: MemberStatus;
  joinDate: Date;
  baptismDate?: Date;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  occupation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Member extends AggregateRoot<MemberProps> {
  private constructor(id: string, props: MemberProps) {
    super(id, props);
  }

  static create(props: Omit<MemberProps, "createdAt" | "updatedAt" | "status">): Member {
    const now = new Date();
    const member = new Member(crypto.randomUUID(), {
      ...props,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    member.validate();
    return member;
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

    if (this._props.joinDate > new Date()) {
      throw new ValidationError("Join date cannot be in the future", "FUTURE_DATE");
    }

    if (this._props.baptismDate && this._props.baptismDate < this._props.joinDate) {
      throw new ValidationError("Baptism date must be after join date", "INVALID_BAPTISM_DATE");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get name(): string {
    return this._props.name;
  }

  get status(): MemberStatus {
    return this._props.status;
  }

  get isActive(): boolean {
    return this._props.status === "active";
  }

  get churchId(): string {
    return this._props.churchId;
  }

  /**
   * Deactivate member
   */
  deactivate(): void {
    if (this._props.status === "transferred" || this._props.status === "deceased") {
      throw new InvalidStateTransition(
        `Cannot deactivate a ${this._props.status} member`,
        "INVALID_TRANSITION"
      );
    }
    this._props.status = "inactive";
    this._props.updatedAt = new Date();
  }

  /**
   * Reactivate member
   */
  activate(): void {
    if (this._props.status !== "inactive") {
      throw new InvalidStateTransition(
        "Only inactive members can be reactivated",
        "INVALID_TRANSITION"
      );
    }
    this._props.status = "active";
    this._props.updatedAt = new Date();
  }

  /**
   * Transfer member to another church
   */
  transfer(toChurchId: string): void {
    if (!this.isActive) {
      throw new BusinessRuleViolation(
        "Only active members can be transferred",
        "MEMBER_NOT_ACTIVE"
      );
    }
    this._props.status = "transferred";
    this._props.updatedAt = new Date();
  }

  /**
   * Mark as deceased
   */
  markDeceased(): void {
    if (this._props.status === "deceased") return;
    this._props.status = "deceased";
    this._props.updatedAt = new Date();
  }

  /**
   * Record baptism date
   */
  recordBaptism(date: Date): void {
    if (date > new Date()) {
      throw new ValidationError("Baptism date cannot be in the future", "FUTURE_DATE");
    }
    if (date < this._props.joinDate) {
      throw new ValidationError("Baptism must be after join date", "INVALID_BAPTISM_DATE");
    }
    this._props.baptismDate = date;
    this._props.updatedAt = new Date();
  }

  /**
   * Update member information
   */
  updateInfo(updates: Partial<Pick<MemberProps, "email" | "phone" | "maritalStatus" | "occupation">>): void {
    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new ValidationError("Invalid email address", "INVALID_EMAIL");
    }
    Object.assign(this._props, updates);
    this._props.updatedAt = new Date();
  }

  toJSON(): MemberProps & { id: string } {
    return { ...this._props, id: this.id };
  }

  static fromJSON(data: MemberProps & { id: string }): Member {
    return new Member(data.id, data);
  }
}

/**
 * Member Family Link - Value Object linking members as family
 */
export interface FamilyLinkProps {
  memberId: string;
  relatedMemberId: string;
  relationship: "spouse" | "parent" | "child" | "sibling" | "other";
}

export class FamilyLink {
  constructor(private props: FamilyLinkProps) {
    this.validate();
  }

  private validate(): void {
    if (this.props.memberId === this.props.relatedMemberId) {
      throw new ValidationError("Member cannot be linked to themselves", "SELF_LINK");
    }
  }

  get memberId(): string {
    return this.props.memberId;
  }

  get relatedMemberId(): string {
    return this.props.relatedMemberId;
  }

  get relationship(): string {
    return this.props.relationship;
  }

  toJSON(): FamilyLinkProps {
    return { ...this.props };
  }

  static fromJSON(data: FamilyLinkProps): FamilyLink {
    return new FamilyLink(data);
  }
}

/**
 * Member Document - Entity for attachments/records
 */
export interface MemberDocumentProps {
  memberId: string;
  name: string;
  type: "certificate" | "letter" | "form" | "other";
  url: string;
  uploadedAt: Date;
}

export class MemberDocument {
  constructor(readonly id: string, private props: MemberDocumentProps) {
    this.validate();
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new ValidationError("Document name is required", "MISSING_DOCUMENT_NAME");
    }
    if (!this.props.url || this.props.url.trim().length === 0) {
      throw new ValidationError("Document URL is required", "MISSING_DOCUMENT_URL");
    }
  }

  get memberId(): string {
    return this.props.memberId;
  }

  get name(): string {
    return this.props.name;
  }

  toJSON(): MemberDocumentProps & { id: string } {
    return { ...this.props, id: this.id };
  }

  static create(props: Omit<MemberDocumentProps, "uploadedAt">): MemberDocument {
    return new MemberDocument(crypto.randomUUID(), {
      ...props,
      uploadedAt: new Date(),
    });
  }

  static fromJSON(data: MemberDocumentProps & { id: string }): MemberDocument {
    return new MemberDocument(data.id, data);
  }
}
