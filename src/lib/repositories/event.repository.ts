/**
 * Event Repository
 * 
 * Handles all data access for Event aggregate
 * Implements DDD repository pattern
 */

import { BaseRepository, IRepository } from './base.repository';
import { supabase, addPagination, addSorting, executeQueryArray, executeQuery, executeCountQuery } from './supabase.client';
import type { EventDTO } from '@/lib/api/dto/events.dto';
import { toEventDTO } from '@/lib/api/dto/events.dto';

export interface IEventRepository extends IRepository<EventDTO> {
  /**
   * Find events by church ID
   */
  findByChurchId(
    churchId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<EventDTO[]>;

  /**
   * Find upcoming events
   */
  findUpcoming(
    limit?: number
  ): Promise<EventDTO[]>;

  /**
   * Find past events
   */
  findPast(
    limit?: number
  ): Promise<EventDTO[]>;

  /**
   * Find events by status
   */
  findByStatus(
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<EventDTO[]>;

  /**
   * Count attendees for event
   */
  countAttendees(eventId: string): Promise<number>;

  /**
   * Check if event has capacity
   */
  hasCapacity(eventId: string, requestedSlots: number): Promise<boolean>;
}

/**
 * Event Repository Implementation
 */
export class EventRepository
  extends BaseRepository<EventDTO>
  implements IEventRepository
{
  constructor() {
    super('events');
  }

  async findById(id: string): Promise<EventDTO | null> {
    const data = await executeQuery(
      supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single(),
      `findEventById(${id})`
    );
    return data ? toEventDTO(data) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<EventDTO[]> {
    let query = supabase.from('events').select('*');

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findAllEvents');
    return data.map(toEventDTO);
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    return executeCountQuery(query, 'countEvents');
  }

  async save(entity: EventDTO): Promise<EventDTO> {
    if (entity.id) {
      return this.update(entity.id, entity) || entity;
    }
    return this.create(entity);
  }

  async create(data: Partial<EventDTO>): Promise<EventDTO> {
    const result = await executeQuery(
      supabase
        .from('events')
        .insert([
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single(),
      'createEvent'
    );
    return toEventDTO(result);
  }

  async update(id: string, data: Partial<EventDTO>): Promise<EventDTO | null> {
    const result = await executeQuery(
      supabase
        .from('events')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
      `updateEvent(${id})`
    );
    return result ? toEventDTO(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting event ${id}:`, error);
      return false;
    }
    return true;
  }

  async softDelete(id: string): Promise<boolean> {
    return this.update(id, { status: 'cancelled' }).then(Boolean);
  }

  async findByFilters(
    filters: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<EventDTO[]> {
    let query = supabase.from('events').select('*');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, 'findEventsByFilters');
    return data.map(toEventDTO);
  }

  async exists(id: string): Promise<boolean> {
    const count = await executeCountQuery(
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('id', id),
      `existsEvent(${id})`
    );
    return count > 0;
  }

  async findByChurchId(
    churchId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<EventDTO[]> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('church_id', churchId);

    if (options?.orderBy) {
      query = addSorting(query, options.orderBy, options?.order || 'asc');
    }

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findEventsByChurchId(${churchId})`);
    return data.map(toEventDTO);
  }

  async findUpcoming(limit?: number): Promise<EventDTO[]> {
    const now = new Date().toISOString();
    let query = supabase
      .from('events')
      .select('*')
      .gte('event_date', now)
      .order('event_date', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const data = await executeQueryArray(query, 'findUpcomingEvents');
    return data.map(toEventDTO);
  }

  async findPast(limit?: number): Promise<EventDTO[]> {
    const now = new Date().toISOString();
    let query = supabase
      .from('events')
      .select('*')
      .lt('event_date', now)
      .order('event_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const data = await executeQueryArray(query, 'findPastEvents');
    return data.map(toEventDTO);
  }

  async findByStatus(
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<EventDTO[]> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', status);

    if (options?.limit) {
      query = addPagination(query, options?.offset || 0, options.limit);
    }

    const data = await executeQueryArray(query, `findEventsByStatus(${status})`);
    return data.map(toEventDTO);
  }

  async countAttendees(eventId: string): Promise<number> {
    return executeCountQuery(
      supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId),
      `countAttendees(${eventId})`
    );
  }

  async hasCapacity(eventId: string, requestedSlots: number): Promise<boolean> {
    const event = await this.findById(eventId);
    if (!event) return false;

    const attendeeCount = await this.countAttendees(eventId);
    const capacity = event.capacity || Infinity;
    
    return (attendeeCount + requestedSlots) <= capacity;
  }
}
