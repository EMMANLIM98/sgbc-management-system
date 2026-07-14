/**
 * Event Domain Model
 *
 * Represents an event that members can register for.
 * Architecture Layer: Domain
 */

export type EventStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

export interface EventProps {
  id: string;
  churchId: string;
  organizationId: string;
  title: string;
  description?: string;
  eventDate: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
  status: EventStatus;
  allowMultipleCheckins: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Entity
 *
 * Represents a church event with registration and check-in capabilities.
 */
export class Event {
  private props: EventProps;

  constructor(props: EventProps) {
    this.props = props;
  }

  static create(props: Omit<EventProps, "id" | "createdAt" | "updatedAt">): Event {
    return new Event({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromDatabase(dbEvent: any): Event {
    return new Event({
      id: dbEvent.id,
      churchId: dbEvent.church_id,
      organizationId: dbEvent.organization_id,
      title: dbEvent.title,
      description: dbEvent.description,
      eventDate: new Date(dbEvent.event_date),
      startTime: dbEvent.start_time,
      endTime: dbEvent.end_time,
      location: dbEvent.location,
      maxCapacity: dbEvent.max_capacity,
      status: dbEvent.status as EventStatus,
      allowMultipleCheckins: dbEvent.allow_multiple_checkins,
      createdBy: dbEvent.created_by,
      createdAt: new Date(dbEvent.created_at),
      updatedAt: new Date(dbEvent.updated_at),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get churchId(): string {
    return this.props.churchId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get eventDate(): Date {
    return this.props.eventDate;
  }

  get startTime(): string | undefined {
    return this.props.startTime;
  }

  get endTime(): string | undefined {
    return this.props.endTime;
  }

  get location(): string | undefined {
    return this.props.location;
  }

  get maxCapacity(): number | undefined {
    return this.props.maxCapacity;
  }

  get status(): EventStatus {
    return this.props.status;
  }

  get allowMultipleCheckins(): boolean {
    return this.props.allowMultipleCheckins;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Check if event is active
   */
  isActive(): boolean {
    return this.props.status === "active";
  }

  /**
   * Check if event is in future
   */
  isUpcoming(): boolean {
    return this.props.eventDate > new Date();
  }

  /**
   * Check if event can accept registrations
   */
  canRegister(): boolean {
    return this.props.status === "scheduled" || this.props.status === "active";
  }

  /**
   * Update event status
   */
  updateStatus(newStatus: EventStatus): void {
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  /**
   * Convert to database format
   */
  toDatabase() {
    return {
      id: this.props.id,
      church_id: this.props.churchId,
      organization_id: this.props.organizationId,
      title: this.props.title,
      description: this.props.description || null,
      event_date: this.props.eventDate.toISOString().split("T")[0],
      start_time: this.props.startTime || null,
      end_time: this.props.endTime || null,
      location: this.props.location || null,
      max_capacity: this.props.maxCapacity || null,
      status: this.props.status,
      allow_multiple_checkins: this.props.allowMultipleCheckins,
      created_by: this.props.createdBy || null,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    };
  }
}
