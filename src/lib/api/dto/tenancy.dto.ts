/**
 * Tenancy Module DTOs and Mappers
 * 
 * Provides type-safe data transfer objects for all tenancy/multi-tenant operations
 * including organizations, user roles, and permissions.
 */

/**
 * Organization DTO
 * Represents a single organization/tenant
 */
export interface OrganizationDTO {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  memberCount: number;
  admins: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Organization Summary DTO
 * Lightweight representation for lists
 */
export interface OrganizationSummaryDTO {
  id: string;
  name: string;
  isActive: boolean;
  memberCount: number;
}

/**
 * Organization Detail DTO
 * Extended organization info with statistics
 */
export interface OrganizationDetailDTO extends OrganizationDTO {
  totalMembers: number;
  totalAdmins: number;
  totalOwners: number;
  churchCount: number;
  eventCount: number;
  contributionTotal?: number;
  currency?: string;
}

/**
 * User-Organization Role DTO
 * Represents a user's relationship to an organization
 */
export interface UserOrganizationDTO {
  userId: string;
  userName: string;
  userEmail: string;
  isOrgAdmin: boolean;
  isOwner: boolean;
  joinedAt: string;
}

/**
 * Organization Member DTO
 * Member in an organization with role information
 */
export interface OrganizationMemberDTO {
  userId: string;
  userName: string;
  userEmail: string;
  role: "owner" | "admin" | "member";
  status: "active" | "inactive";
  joinedAt: string;
  updatedAt: string;
}

/**
 * Organization Role DTO
 * Available roles within an organization
 */
export interface OrganizationRoleDTO {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

/**
 * Organization Invite DTO
 * Used for inviting new members
 */
export interface OrganizationInviteDTO {
  inviteId: string;
  organizationId: string;
  organizationName: string;
  invitedEmail: string;
  invitedBy: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "declined";
  expiresAt: string;
  createdAt: string;
}

/**
 * Organization Statistics DTO
 * Statistical data about an organization
 */
export interface OrganizationStatisticsDTO {
  organizationId: string;
  organizationName: string;
  totalMembers: number;
  totalAdmins: number;
  totalOwners: number;
  memberJoinedThisMonth: number;
  activeChurches: number;
  totalEvents: number;
  totalContributions?: number;
  generatedAt: string;
}

/**
 * Mapper: Raw organization row → OrganizationDTO
 */
export function toOrganizationDTO(
  org: any,
  memberCount: number = 0,
  admins: string[] = []
): OrganizationDTO {
  return {
    id: org.id,
    name: org.name,
    description: org.description,
    isActive: org.is_active ?? true,
    memberCount,
    admins,
    createdAt: org.created_at,
    updatedAt: org.updated_at,
  };
}

/**
 * Mapper: Raw organization → OrganizationSummaryDTO
 */
export function toOrganizationSummaryDTO(
  org: any,
  memberCount: number = 0
): OrganizationSummaryDTO {
  return {
    id: org.id,
    name: org.name,
    isActive: org.is_active ?? true,
    memberCount,
  };
}

/**
 * Mapper: Raw organization → OrganizationDetailDTO
 */
export function toOrganizationDetailDTO(
  org: any,
  stats: {
    totalMembers: number;
    totalAdmins: number;
    totalOwners: number;
    churchCount: number;
    eventCount: number;
    contributionTotal?: number;
    currency?: string;
  }
): OrganizationDetailDTO {
  const baseDTO = toOrganizationDTO(org, stats.totalMembers, []);
  return {
    ...baseDTO,
    ...stats,
  };
}

/**
 * Mapper: Raw user-organization → UserOrganizationDTO
 */
export function toUserOrganizationDTO(
  userOrg: any,
  userName: string,
  userEmail: string
): UserOrganizationDTO {
  return {
    userId: userOrg.user_id,
    userName,
    userEmail,
    isOrgAdmin: userOrg.is_org_admin ?? false,
    isOwner: userOrg.is_owner ?? false,
    joinedAt: userOrg.created_at,
  };
}

/**
 * Mapper: User-org relationship → OrganizationMemberDTO
 */
export function toOrganizationMemberDTO(
  userOrg: any,
  profile: any
): OrganizationMemberDTO {
  let role: "owner" | "admin" | "member" = "member";
  if (userOrg.is_owner) role = "owner";
  else if (userOrg.is_org_admin) role = "admin";

  return {
    userId: userOrg.user_id,
    userName: profile.full_name || profile.email,
    userEmail: profile.email,
    role,
    status: "active",
    joinedAt: userOrg.created_at,
    updatedAt: userOrg.created_at,
  };
}

/**
 * Mapper: Batch map user-org relationships
 */
export function toOrganizationMemberDTOs(
  userOrgs: any[],
  profiles: Map<string, any>
): OrganizationMemberDTO[] {
  return userOrgs.map((userOrg) => {
    const profile = profiles.get(userOrg.user_id) || {
      email: "unknown@example.com",
    };
    return toOrganizationMemberDTO(userOrg, profile);
  });
}

/**
 * Mapper: Available role → OrganizationRoleDTO
 */
export function toOrganizationRoleDTO(role: any): OrganizationRoleDTO {
  return {
    id: role.id || role.name,
    name: role.name,
    displayName: role.display_name || role.name,
    description: role.description,
    permissions: role.permissions || [],
  };
}

/**
 * Mapper: Invite record → OrganizationInviteDTO
 */
export function toOrganizationInviteDTO(
  invite: any,
  org: any
): OrganizationInviteDTO {
  return {
    inviteId: invite.id,
    organizationId: invite.organization_id,
    organizationName: org?.name || "Unknown Organization",
    invitedEmail: invite.invited_email,
    invitedBy: invite.invited_by,
    role: invite.role || "member",
    status: invite.status || "pending",
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  };
}

/**
 * Mapper: Organization statistics
 */
export function toOrganizationStatisticsDTO(
  org: any,
  stats: {
    totalMembers: number;
    totalAdmins: number;
    totalOwners: number;
    memberJoinedThisMonth: number;
    activeChurches: number;
    totalEvents: number;
    totalContributions?: number;
  }
): OrganizationStatisticsDTO {
  return {
    organizationId: org.id,
    organizationName: org.name,
    ...stats,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Batch mappers
 */
export function toOrganizationDTOs(
  orgs: any[],
  memberCounts: Map<string, number> = new Map()
): OrganizationDTO[] {
  return orgs.map((org) =>
    toOrganizationDTO(org, memberCounts.get(org.id) || 0, [])
  );
}

export function toOrganizationSummaryDTOs(
  orgs: any[],
  memberCounts: Map<string, number> = new Map()
): OrganizationSummaryDTO[] {
  return orgs.map((org) =>
    toOrganizationSummaryDTO(org, memberCounts.get(org.id) || 0)
  );
}

export function toOrganizationInviteDTOs(
  invites: any[],
  orgs: Map<string, any>
): OrganizationInviteDTO[] {
  return invites.map((invite) => {
    const org = orgs.get(invite.organization_id);
    return toOrganizationInviteDTO(invite, org);
  });
}
