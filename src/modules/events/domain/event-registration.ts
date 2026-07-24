/**
 * Event Registration Domain Model
 *
 * Represents a member's registration for an event.
 * Architecture Layer: Domain
 */

export type RegistrationStatus = "registered" | "checked_in" | "cancelled" | "no_show";
export type AttendanceCategory = "children" | "high_school" | "college" | "career" | "adults" | "seniors";
export type LeadershipRole =
  | "pastor"
  | "pastor_wife"
  | "pastor_children"
  | "associate_pastor"
  | "elder"
  | "deacon"
  | "preacher"
  | "evangelist"
  | "ministry_leader"
  | "none";
export type VisitorMembership = "member" | "visitor" | "first_time_guest";
export type SexKind = "male" | "female";

export interface EventRegistrationProps {
  id: string;
  eventId: string;
  memberId?: string;
  churchId: string;
  organizationId: string;

  // Attendee information
  attendeeFirstName: string;
  attendeeLastName: string;
  attendeeEmail?: string;
  attendeePhone?: string;

  // Demographics
  ageCategory?: AttendanceCategory;
  sex?: SexKind;
  visitorStatus?: VisitorMembership;
  leadershipRole?: LeadershipRole;

  // Status
  status: RegistrationStatus;
  registeredAt: Date;
  checkedInAt?: Date;
  checkedInBy?: string;

  // Check-in details
  deviceId?: string;
  deviceName?: string;
  locationCheckedIn?: string;

  // Audit
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * EventRegistration Entity
 *
 * Represents a member's registration for an event.
 * Can be linked to a member or be a guest registration.
 */
export class EventRegistration {
  private props: EventRegistrationProps;

  constructor(props: EventRegistrationProps) {
    this.props = props;
  }

  static create(
    props: Omit<EventRegistrationProps, "id" | "registeredAt" | "createdAt" | "updatedAt">,
  ): EventRegistration {
    return new EventRegistration({
      ...props,
      id: crypto.randomUUID(),
      registeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromDatabase(dbReg: any): EventRegistration {
    return new EventRegistration({
      id: dbReg.id,
      eventId: dbReg.event_id,
      memberId: dbReg.member_id,
      churchId: dbReg.church_id,
      organizationId: dbReg.organization_id,
      attendeeFirstName: dbReg.attendee_first_name,
      attendeeLastName: dbReg.attendee_last_name,
      attendeeEmail: dbReg.attendee_email,
      attendeePhone: dbReg.attendee_phone,
      ageCategory: dbReg.age_category,
      sex: dbReg.sex,
      visitorStatus: dbReg.visitor_status,
      leadershipRole: dbReg.leadership_role,
      status: dbReg.status as RegistrationStatus,
      registeredAt: new Date(dbReg.registered_at),
      checkedInAt: dbReg.checked_in_at ? new Date(dbReg.checked_in_at) : undefined,
      checkedInBy: dbReg.checked_in_by,
      deviceId: dbReg.device_id,
      deviceName: dbReg.device_name,
      locationCheckedIn: dbReg.location_checkedin,
      createdBy: dbReg.created_by,
      createdAt: new Date(dbReg.created_at),
      updatedAt: new Date(dbReg.updated_at),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get memberId(): string | undefined {
    return this.props.memberId;
  }

  get churchId(): string {
    return this.props.churchId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get attendeeFirstName(): string {
    return this.props.attendeeFirstName;
  }

  get attendeeLastName(): string {
    return this.props.attendeeLastName;
  }

  get attendeeName(): string {
    return `${this.props.attendeeFirstName} ${this.props.attendeeLastName}`;
  }

  get attendeeEmail(): string | undefined {
    return this.props.attendeeEmail;
  }

  get attendeePhone(): string | undefined {
    return this.props.attendeePhone;
  }

  get ageCategory(): AttendanceCategory | undefined {
    return this.props.ageCategory;
  }

  get sex(): SexKind | undefined {
    return this.props.sex;
  }

  get visitorStatus(): VisitorMembership | undefined {
    return this.props.visitorStatus;
  }

  get leadershipRole(): LeadershipRole | undefined {
    return this.props.leadershipRole;
  }

  get status(): RegistrationStatus {
    return this.props.status;
  }

  get registeredAt(): Date {
    return this.props.registeredAt;
  }

  get checkedInAt(): Date | undefined {
    return this.props.checkedInAt;
  }

  get checkedInBy(): string | undefined {
    return this.props.checkedInBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Check if registration is checked in
   */
  isCheckedIn(): boolean {
    return this.props.status === "checked_in" && !!this.props.checkedInAt;
  }

  /**
   * Check if attendee is a member
   */
  isMember(): boolean {
    return !!this.props.memberId;
  }

  /**
   * Check if attendee is a guest
   */
  isGuest(): boolean {
    return !this.props.memberId;
  }

  /**
   * Record check-in
   */
  recordCheckIn(
    checkedInBy: string,
    deviceId?: string,
    deviceName?: string,
    locationCheckedIn?: string,
  ): void {
    this.props.status = "checked_in";
    this.props.checkedInAt = new Date();
    this.props.checkedInBy = checkedInBy;
    this.props.deviceId = deviceId;
    this.props.deviceName = deviceName;
    this.props.locationCheckedIn = locationCheckedIn;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark as no-show
   */
  markNoShow(): void {
    this.props.status = "no_show";
    this.props.updatedAt = new Date();
  }

  /**
   * Cancel registration
   */
  cancel(): void {
    this.props.status = "cancelled";
    this.props.updatedAt = new Date();
  }

  /**
   * Convert to database format
   */
  toDatabase() {
    return {
      id: this.props.id,
      event_id: this.props.eventId,
      member_id: this.props.memberId || null,
      church_id: this.props.churchId,
      organization_id: this.props.organizationId,
      attendee_first_name: this.props.attendeeFirstName,
      attendee_last_name: this.props.attendeeLastName,
      attendee_email: this.props.attendeeEmail || null,
      attendee_phone: this.props.attendeePhone || null,
      age_category: this.props.ageCategory || null,
      sex: this.props.sex || null,
      visitor_status: this.props.visitorStatus || null,
      leadership_role: this.props.leadershipRole || null,
      status: this.props.status,
      registered_at: this.props.registeredAt,
      checked_in_at: this.props.checkedInAt || null,
      checked_in_by: this.props.checkedInBy || null,
      device_id: this.props.deviceId || null,
      device_name: this.props.deviceName || null,
      location_checkedin: this.props.locationCheckedIn || null,
      created_by: this.props.createdBy || null,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }
}
