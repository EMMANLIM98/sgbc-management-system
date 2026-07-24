/**
 * Membership Infrastructure - Supabase Repositories
 */

import { ScopedSupabaseRepository } from "@/lib/repository";
import { Member, MemberDocument } from "../domain/membership.entities";
import {
  IMemberRepository,
  IMemberDocumentRepository,
  type MemberQuery,
} from "../domain/membership.repositories";

export class SupabaseMemberRepository
  extends ScopedSupabaseRepository<Member>
  implements IMemberRepository
{
  constructor(supabaseClient: any) {
    super(supabaseClient, "members");
  }

  protected toDomain(row: any): Member {
    return Member.fromJSON({
      id: row.id,
      churchId: row.church_id,
      organizationId: row.organization_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      category: row.category,
      status: row.status,
      joinDate: new Date(row.join_date),
      baptismDate: row.baptism_date ? new Date(row.baptism_date) : undefined,
      dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : undefined,
      gender: row.gender,
      maritalStatus: row.marital_status,
      occupation: row.occupation,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  protected toPersistence(entity: Member): any {
    const props = entity.props;
    return {
      id: entity.id,
      church_id: props.churchId,
      organization_id: props.organizationId,
      name: props.name,
      email: props.email,
      phone: props.phone,
      category: props.category,
      status: props.status,
      join_date: props.joinDate.toISOString().split("T")[0],
      baptism_date: props.baptismDate?.toISOString().split("T")[0],
      date_of_birth: props.dateOfBirth?.toISOString().split("T")[0],
      gender: props.gender,
      marital_status: props.maritalStatus,
      occupation: props.occupation,
      created_at: props.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async findByQuery(query: MemberQuery): Promise<Member[]> {
    let q = this.supabaseClient.from(this.tableName).select("*");

    if (query.churchId) q = q.eq("church_id", query.churchId);
    if (query.organizationId) q = q.eq("organization_id", query.organizationId);
    if (query.status) q = q.eq("status", query.status);
    if (query.category) q = q.eq("category", query.category);

    if (query.searchTerm) {
      q = q.or(`name.ilike.%${query.searchTerm}%,email.ilike.%${query.searchTerm}%`);
    }

    q = q.order("name", { ascending: true });
    if (query.limit) q = q.limit(query.limit);
    if (query.offset) q = q.range(query.offset, query.offset + (query.limit || 20) - 1);

    const { data, error } = await q;
    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map((row) => this.toDomain(row));
  }

  async countByQuery(query: MemberQuery): Promise<number> {
    let q = this.supabaseClient.from(this.tableName).select("*", { count: "exact", head: true });

    if (query.churchId) q = q.eq("church_id", query.churchId);
    if (query.organizationId) q = q.eq("organization_id", query.organizationId);
    if (query.status) q = q.eq("status", query.status);
    if (query.category) q = q.eq("category", query.category);
    if (query.searchTerm)
      q = q.or(`name.ilike.%${query.searchTerm}%,email.ilike.%${query.searchTerm}%`);

    const { count, error } = await q;
    if (error) throw new Error(`Query failed: ${error.message}`);
    return count ?? 0;
  }

  async getActiveCount(churchId: string): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*", { count: "exact", head: true })
      .eq("church_id", churchId)
      .eq("status", "active");

    if (error) throw new Error(`Query failed: ${error.message}`);
    return count ?? 0;
  }

  async findByStatus(churchId: string, status: string): Promise<Member[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .eq("status", status)
      .order("name", { ascending: true });

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map((row) => this.toDomain(row));
  }

  async getRecentlyJoined(churchId: string, days: number): Promise<Member[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .gte("join_date", since.toISOString().split("T")[0])
      .order("join_date", { ascending: false });

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map((row) => this.toDomain(row));
  }

  async findByCategory(churchId: string, category: string): Promise<Member[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .eq("category", category)
      .order("name", { ascending: true });

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map((row) => this.toDomain(row));
  }

  async search(churchId: string, searchTerm: string): Promise<Member[]> {
    const { data, error } = await this.supabaseClient
      .from(this.tableName)
      .select("*")
      .eq("church_id", churchId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order("name", { ascending: true })
      .limit(20);

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map((row) => this.toDomain(row));
  }
}

export class SupabaseMemberDocumentRepository implements IMemberDocumentRepository {
  constructor(private supabaseClient: any) {}

  async save(document: MemberDocument): Promise<MemberDocument> {
    const data = {
      id: document.id,
      member_id: document.memberId,
      name: document.name,
      type: document.props.type,
      url: document.props.url,
      uploaded_at: document.props.uploadedAt.toISOString(),
    };

    const { error } = await this.supabaseClient
      .from("member_documents")
      .upsert(data, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`Failed to save: ${error.message}`);
    return document;
  }

  async findByMember(memberId: string): Promise<MemberDocument[]> {
    const { data, error } = await this.supabaseClient
      .from("member_documents")
      .select("*")
      .eq("member_id", memberId)
      .order("uploaded_at", { ascending: false });

    if (error) throw new Error(`Query failed: ${error.message}`);
    return (data || []).map((row: any) =>
      MemberDocument.fromJSON({
        id: row.id,
        memberId: row.member_id,
        name: row.name,
        type: row.type,
        url: row.url,
        uploadedAt: new Date(row.uploaded_at),
      }),
    );
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabaseClient.from("member_documents").delete().eq("id", id);

    if (error) throw new Error(`Failed to delete: ${error.message}`);
  }
}
