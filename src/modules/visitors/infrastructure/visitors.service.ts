/**
 * Visitors Domain - Repositories & Application Services
 */

import { IRepository, ScopeFilter } from "@/lib/repository";
import { ScopedSupabaseRepository } from "@/lib/repository";
import { Money } from "@/lib/money";
import { Visitor, type VisitorStatus } from "./visitors.entities";
import { NotFoundError, ValidationError } from "@/lib/domain-errors";

// === REPOSITORY INTERFACES ===

export interface VisitorQuery extends ScopeFilter {
  status?: VisitorStatus;
  searchTerm?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface IVisitorRepository extends IRepository<Visitor> {
  findByQuery(query: VisitorQuery): Promise<Visitor[]>;
  countByQuery(query: VisitorQuery): Promise<number>;
  findByStatus(churchId: string, status: VisitorStatus): Promise<Visitor[]>;
  getRecentVisitors(churchId: string, days: number, limit?: number): Promise<Visitor[]>;
  getNewVisitorsCount(churchId: string, startDate: Date, endDate: Date): Promise<number>;
  search(churchId: string, searchTerm: string): Promise<Visitor[]>;
}

// === REPOSITORY IMPLEMENTATIONS ===

export class SupabaseVisitorRepository
  extends ScopedSupabaseRepository<Visitor>
  implements IVisitorRepository {
  constructor(supabaseClient: any) {
    super(supabaseClient, "visitors");
  }

  protected toDomain(row: any): Visitor {
    return Visitor.fromJSON({
      id: row.id,
      churchId: row.church_id,
      organizationId: row.organization_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      firstVisitDate: new Date(row.first_visit_date),
      lastVisitDate: new Date(row.last_visit_date),
      visitCount: row.visit_count,
      referral: row.referral,
      notes: row.notes,
      convertedToMemberId: row.converted_to_member_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  protected toPersistence(entity: Visitor): any {
    const props = entity.props;
    return {
      id: entity.id,
      church_id: props.churchId,
      organization_id: props.organizationId,
      name: props.name,
      email: props.email,
      phone: props.phone,
      status: props.status,
      first_visit_date: props.firstVisitDate.toISOString().split("T")[0],
      last_visit_date: props.lastVisitDate.toISOString().split("T")[0],
      visit_count: props.visitCount,
      referral: props.referral,
      notes: props.notes,
      converted_to_member_id: props.convertedToMemberId,
      created_at: props.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async findByQuery(query: VisitorQuery): Promise<Visitor[]> {
    let q = this.supabaseClient.from(this.tableName).select("*");

    if (query.churchId) q = q.eq("church_id", query.churchId);
    if (query.organizationId) q = q.eq("organization_id", query.organizationId);
    if (query.status) q = q.eq("status", query.status);
    if (query.fromDate) q = q.gte("first_visit_date", query.fromDate.toISOString().split("T")[0]);
    if (query.toDate) q = q.lte("last_visit_date", query.toDate.toISOString().split("T")[0]);

    if (query.searchTerm) {
      q = q.or(`name.ilike.%${query.searchTerm}%,email.ilike.%${query.searchTerm}%,phone.ilike.%${query.searchTerm}%`);
    }

    q = q.order("last_visit_date", { ascending: false });
    if (query.limit) q = q.limit(query.limit);
    if (query.offset) q = q.range(query.offset, query.offset + (query.limit || 20) - 1);

    const { data, error } = await q;
    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map(row => this.toDomain(row));
  }

  async countByQuery(query: VisitorQuery): Promise<number> {
    let q = this.supabaseClient.from(this.tableName).select("*", { count: "exact", head: true });

    if (query.churchId) q = q.eq("church_id", query.churchId);
    if (query.organizationId) q = q.eq("organization_id", query.organizationId);
    if (query.status) q = q.eq("status", query.status);
    if (query.fromDate) q = q.gte("first_visit_date", query.fromDate.toISOString().split("T")[0]);
    if (query.toDate) q = q.lte("last_visit_date", query.toDate.toISOString().split("T")[0]);

    const { count, error } = await q;
    if (error) throw new Error(`Query failed: ${error.message}`);
    return count ?? 0;
  }

  async findByStatus(churchId: string, status: VisitorStatus): Promise<Visitor[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .eq("status", status)
      .order("last_visit_date", { ascending: false });

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map(row => this.toDomain(row));
  }

  async getRecentVisitors(churchId: string, days: number, limit: number = 10): Promise<Visitor[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .gte("last_visit_date", since.toISOString().split("T")[0])
      .order("last_visit_date", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map(row => this.toDomain(row));
  }

  async getNewVisitorsCount(churchId: string, startDate: Date, endDate: Date): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*", { count: "exact", head: true })
      .eq("church_id", churchId)
      .eq("status", "new")
      .gte("first_visit_date", startDate.toISOString().split("T")[0])
      .lte("first_visit_date", endDate.toISOString().split("T")[0]);

    if (error) throw new Error(`Query failed: ${error.message}`);
    return count ?? 0;
  }

  async search(churchId: string, searchTerm: string): Promise<Visitor[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order("name", { ascending: true })
      .limit(20);

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map(row => this.toDomain(row));
  }
}

// === APPLICATION SERVICE ===

export class VisitorService {
  constructor(private visitorRepository: IVisitorRepository) {}

  async recordVisitor(props: any): Promise<Visitor> {
    const visitor = Visitor.create(props);
    return this.visitorRepository.save(visitor);
  }

  async getVisitor(id: string): Promise<Visitor> {
    const visitor = await this.visitorRepository.findById(id);
    if (!visitor) throw new NotFoundError("Visitor not found", "VISITOR_NOT_FOUND");
    return visitor;
  }

  async findVisitors(query: VisitorQuery): Promise<Visitor[]> {
    return this.visitorRepository.findByQuery(query);
  }

  async recordVisit(visitorId: string, visitDate?: Date): Promise<Visitor> {
    const visitor = await this.getVisitor(visitorId);
    visitor.recordVisit(visitDate);
    return this.visitorRepository.save(visitor);
  }

  async convertToMember(visitorId: string, memberId: string): Promise<Visitor> {
    const visitor = await this.getVisitor(visitorId);
    visitor.convertToMember(memberId);
    return this.visitorRepository.save(visitor);
  }

  async getRecentVisitors(churchId: string, days: number = 30): Promise<Visitor[]> {
    return this.visitorRepository.getRecentVisitors(churchId, days);
  }

  async getNewVisitorsStats(churchId: string, startDate: Date, endDate: Date): Promise<number> {
    return this.visitorRepository.getNewVisitorsCount(churchId, startDate, endDate);
  }

  async searchVisitors(churchId: string, searchTerm: string): Promise<Visitor[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ValidationError("Search term must be at least 2 characters", "INVALID_SEARCH");
    }
    return this.visitorRepository.search(churchId, searchTerm);
  }
}
