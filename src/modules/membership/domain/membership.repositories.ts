/**
 * Membership Domain - Repository Interfaces
 */

import { IRepository, ScopeFilter } from "@/lib/repository";
import { Member, MemberDocument, type MemberStatus } from "./membership.entities";

export interface MemberQuery extends ScopeFilter {
  status?: MemberStatus;
  category?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface IMemberRepository extends IRepository<Member> {
  /**
   * Find members by query criteria
   */
  findByQuery(query: MemberQuery): Promise<Member[]>;

  /**
   * Count members by query criteria
   */
  countByQuery(query: MemberQuery): Promise<number>;

  /**
   * Get active members count
   */
  getActiveCount(churchId: string): Promise<number>;

  /**
   * Get members by status
   */
  findByStatus(churchId: string, status: MemberStatus): Promise<Member[]>;

  /**
   * Get recently joined members
   */
  getRecentlyJoined(churchId: string, days: number): Promise<Member[]>;

  /**
   * Get members by category
   */
  findByCategory(churchId: string, category: string): Promise<Member[]>;

  /**
   * Search members by name or email
   */
  search(churchId: string, searchTerm: string): Promise<Member[]>;
}

export interface IMemberDocumentRepository {
  /**
   * Save document
   */
  save(document: MemberDocument): Promise<MemberDocument>;

  /**
   * Find documents by member
   */
  findByMember(memberId: string): Promise<MemberDocument[]>;

  /**
   * Delete document
   */
  delete(id: string): Promise<void>;
}
