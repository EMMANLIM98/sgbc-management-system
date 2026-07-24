/**
 * Membership Module DTOs (Data Transfer Objects)
 */

/**
 * Member DTO
 */
export interface MemberDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  status: "active" | "inactive" | "transferred" | "deceased";
  joinDate: string;
  churchId: string;
  organizationId: string;
  leadershipRole?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Member Detail DTO with additional information
 */
export interface MemberDetailDTO extends MemberDTO {
  totalContributions: number;
  pledges: Array<{
    id: string;
    amount: number;
    frequency: string;
    status: string;
  }>;
  eventAttendance: number;
  lastAttendanceDate?: string;
  notes?: string;
}

/**
 * Member Summary DTO for lists
 */
export interface MemberSummaryDTO {
  id: string;
  name: string;
  email: string;
  status: string;
  joinDate: string;
  leadershipRole?: string;
}

/**
 * Member Search Result DTO
 */
export interface MemberSearchResultDTO {
  total: number;
  members: MemberDTO[];
}

/**
 * Member History Entry DTO
 */
export interface MemberHistoryEntryDTO {
  id: string;
  memberId: string;
  eventType: string;
  description: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Member Statistics DTO
 */
export interface MemberStatisticsDTO {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  transferredMembers: number;
  deceasedMembers: number;
  newMembersThisMonth: number;
  byLeadershipRole: Record<string, number>;
  averageMembershipDuration: string;
  generatedAt: string;
}

/**
 * Family Link DTO
 */
export interface FamilyLinkDTO {
  id: string;
  memberId: string;
  relatedMemberId: string;
  relationship: "spouse" | "child" | "parent" | "sibling" | "other";
  createdAt: string;
}

/**
 * Member Document DTO
 */
export interface MemberDocumentDTO {
  id: string;
  memberId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Mappers: Convert domain models to DTOs
 */

import type { Member } from "@/modules/membership/domain/member";
import type { FamilyLink } from "@/modules/membership/domain/member";
import type { MemberDocument } from "@/modules/membership/domain/member";

/**
 * Convert Member entity to DTO
 */
export function toMemberDTO(member: Member): MemberDTO {
  return {
    id: member.id,
    firstName: member.firstName.value,
    lastName: member.lastName.value,
    email: member.email.value,
    phone: member.phone?.value,
    dateOfBirth: member.dateOfBirth?.toISOString(),
    address: member.address?.value,
    status: member.status.value as any,
    joinDate: member.joinDate?.toISOString() || new Date().toISOString(),
    churchId: member.churchId?.value || "",
    organizationId: member.organizationId?.value || "",
    leadershipRole: member.leadershipRole?.value,
    createdAt: member.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      member.updatedAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert Member entity to summary DTO
 */
export function toMemberSummaryDTO(member: Member): MemberSummaryDTO {
  return {
    id: member.id,
    name: `${member.firstName.value} ${member.lastName.value}`,
    email: member.email.value,
    status: member.status.value,
    joinDate: member.joinDate?.toISOString() || new Date().toISOString(),
    leadershipRole: member.leadershipRole?.value
  };
}

/**
 * Convert Member list to DTOs
 */
export function toMemberDTOs(members: Member[]): MemberDTO[] {
  return members.map(toMemberDTO);
}

/**
 * Convert Member list to summary DTOs
 */
export function toMemberSummaryDTOs(members: Member[]): MemberSummaryDTO[] {
  return members.map(toMemberSummaryDTO);
}

/**
 * Convert FamilyLink entity to DTO
 */
export function toFamilyLinkDTO(familyLink: FamilyLink): FamilyLinkDTO {
  return {
    id: familyLink.id,
    memberId: familyLink.memberId.value,
    relatedMemberId: familyLink.relatedMemberId.value,
    relationship: familyLink.relationship.value as any,
    createdAt:
      familyLink.createdAt?.toISOString() || new Date().toISOString()
  };
}

/**
 * Convert FamilyLink list to DTOs
 */
export function toFamilyLinkDTOs(
  familyLinks: FamilyLink[]
): FamilyLinkDTO[] {
  return familyLinks.map(toFamilyLinkDTO);
}

/**
 * Convert MemberDocument entity to DTO
 */
export function toMemberDocumentDTO(
  document: MemberDocument
): MemberDocumentDTO {
  return {
    id: document.id,
    memberId: document.memberId.value,
    documentType: document.documentType.value,
    fileName: document.fileName.value,
    fileUrl: document.fileUrl.value,
    uploadedAt:
      document.uploadedAt?.toISOString() || new Date().toISOString(),
    uploadedBy: document.uploadedBy?.value || "system"
  };
}

/**
 * Convert MemberDocument list to DTOs
 */
export function toMemberDocumentDTOs(
  documents: MemberDocument[]
): MemberDocumentDTO[] {
  return documents.map(toMemberDocumentDTO);
}
