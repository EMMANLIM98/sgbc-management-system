/**
 * Base Repository Interface
 * 
 * Defines the contract for all repository implementations
 * Following DDD principles for data access abstraction
 */

export interface IRepository<TAggregate, TId = string> {
  /**
   * Find entity by ID
   */
  findById(id: TId): Promise<TAggregate | null>;

  /**
   * Find all entities
   */
  findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<TAggregate[]>;

  /**
   * Count total entities
   */
  count(filters?: Record<string, any>): Promise<number>;

  /**
   * Save (create or update) entity
   */
  save(entity: TAggregate): Promise<TAggregate>;

  /**
   * Create new entity
   */
  create(data: Partial<TAggregate>): Promise<TAggregate>;

  /**
   * Update entity
   */
  update(id: TId, data: Partial<TAggregate>): Promise<TAggregate | null>;

  /**
   * Delete entity (physical)
   */
  delete(id: TId): Promise<boolean>;

  /**
   * Soft delete entity (mark as inactive)
   */
  softDelete(id: TId): Promise<boolean>;

  /**
   * Find with custom filters
   */
  findByFilters(
    filters: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<TAggregate[]>;

  /**
   * Check if entity exists
   */
  exists(id: TId): Promise<boolean>;
}

/**
 * Abstract Base Repository
 * Provides common implementation for all repositories
 */
export abstract class BaseRepository<TAggregate, TId = string>
  implements IRepository<TAggregate, TId>
{
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  abstract findById(id: TId): Promise<TAggregate | null>;
  abstract findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<TAggregate[]>;
  abstract count(filters?: Record<string, any>): Promise<number>;
  abstract save(entity: TAggregate): Promise<TAggregate>;
  abstract create(data: Partial<TAggregate>): Promise<TAggregate>;
  abstract update(id: TId, data: Partial<TAggregate>): Promise<TAggregate | null>;
  abstract delete(id: TId): Promise<boolean>;
  abstract softDelete(id: TId): Promise<boolean>;
  abstract findByFilters(
    filters: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<TAggregate[]>;
  abstract exists(id: TId): Promise<boolean>;
}
