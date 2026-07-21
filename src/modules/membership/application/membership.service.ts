/**
 * Membership Application Services
 */

import { NotFoundError, ValidationError } from "@/lib/domain-errors";
import { Member, MemberDocument, type MemberProps, type MemberStatus } from "./membership.entities";
import { IMemberRepository, IMemberDocumentRepository, type MemberQuery } from "./membership.repositories";

export class MemberService {
  constructor(
    private memberRepository: IMemberRepository,
    private documentRepository: IMemberDocumentRepository
  ) {}

  async recordMember(props: Omit<MemberProps, "createdAt" | "updatedAt" | "status">): Promise<Member> {
    const member = Member.create(props);
    return this.memberRepository.save(member);
  }

  async getMember(id: string): Promise<Member> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundError("Member not found", "MEMBER_NOT_FOUND");
    return member;
  }

  async findMembers(query: MemberQuery): Promise<Member[]> {
    return this.memberRepository.findByQuery(query);
  }

  async getActiveMembers(churchId: string): Promise<Member[]> {
    return this.memberRepository.findByStatus(churchId, "active");
  }

  async deactivateMember(id: string): Promise<Member> {
    const member = await this.getMember(id);
    member.deactivate();
    return this.memberRepository.save(member);
  }

  async activateMember(id: string): Promise<Member> {
    const member = await this.getMember(id);
    member.activate();
    return this.memberRepository.save(member);
  }

  async transferMember(id: string, toChurchId: string): Promise<Member> {
    const member = await this.getMember(id);
    member.transfer(toChurchId);
    return this.memberRepository.save(member);
  }

  async recordBaptism(memberId: string, date: Date): Promise<Member> {
    const member = await this.getMember(memberId);
    member.recordBaptism(date);
    return this.memberRepository.save(member);
  }

  async updateMemberInfo(
    id: string,
    updates: Parameters<Member["updateInfo"]>[0]
  ): Promise<Member> {
    const member = await this.getMember(id);
    member.updateInfo(updates);
    return this.memberRepository.save(member);
  }

  async getActiveCount(churchId: string): Promise<number> {
    return this.memberRepository.getActiveCount(churchId);
  }

  async searchMembers(churchId: string, searchTerm: string): Promise<Member[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ValidationError("Search term must be at least 2 characters", "INVALID_SEARCH");
    }
    return this.memberRepository.search(churchId, searchTerm);
  }

  async uploadDocument(memberId: string, documentProps: any): Promise<MemberDocument> {
    const member = await this.getMember(memberId);
    const doc = MemberDocument.create({ memberId, ...documentProps });
    return this.documentRepository.save(doc);
  }

  async getMemberDocuments(memberId: string): Promise<MemberDocument[]> {
    await this.getMember(memberId); // Verify member exists
    return this.documentRepository.findByMember(memberId);
  }

  async deleteDocument(docId: string): Promise<void> {
    return this.documentRepository.delete(docId);
  }
}
