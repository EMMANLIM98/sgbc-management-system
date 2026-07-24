/**
 * Leadership Roles Domain Model
 *
 * This is the single source of truth for all church leadership roles.
 * Implements DDD principles with:
 * - Type-safe role enumeration
 * - Role metadata and organization
 * - Centralized validation and categorization
 *
 * Usage:
 * - In forms: LEADERSHIP_ROLES.getAll() or LEADERSHIP_ROLES.getByCategory()
 * - Type checking: leadershipRole: LeadershipRoleType
 * - Validation: LEADERSHIP_ROLES.isValid(role)
 */

export type LeadershipRoleType =
  | "none"
  | "pastor"
  | "bishop"
  | "preacher"
  | "elder"
  | "deacon"
  | "missions_director"
  | "sunday_school_teacher"
  | "mod_president"
  | "mod_vice_president"
  | "mod_treasurer"
  | "hol_president"
  | "hol_vice_president"
  | "hol_treasurer"
  | "sound_system_ministry"
  | "adults_choir_member"
  | "adults_choir_director"
  | "vbs_director"
  | "vbs_teacher"
  | "vbs_volunteer"
  | "usher"
  | "prayer_intercessory_network_member"
  | "prayer_intercessory_network_leader"
  | "medical_mission_volunteer"
  | "visitation_team_member"
  | "visitation_team_director"
  | "music_chamber_member"
  | "music_director"
  | "media_team"
  | "creator_lounge_member"
  | "church_member"
  | "choir_conductress"
  | "sgbc_choir_member"
  | "bishops_care_member"
  | "choir_conductor"
  | "parking_ministry_member"
  | "college_career_president"
  | "college_career_vice_president"
  | "college_career_treasurer"
  | "jems_president"
  | "jems_vice_president"
  | "jems_treasurer"
  | "his_president"
  | "his_vice_president"
  | "his_treasurer"
  | "sgbc_treasurer"
  | "cook_volunteer"
  | "driver"
  | "song_leader"
  | "itm_member"
  | "evangelist"
  | "ministry_leader"
  | "pastor_wife"
  | "associate_pastor";

export interface LeadershipRoleMetadata {
  value: LeadershipRoleType;
  label: string;
  description?: string;
  category: "leadership" | "ministry" | "general" | "administrative" | "special_ministry";
}

/**
 * Centralized Leadership Roles Catalog
 * Organized by category for better UX and organization
 */
const ROLES_CATALOG: LeadershipRoleMetadata[] = [
  // No Role
  { value: "none", label: "None", category: "general" },
  { value: "church_member", label: "Church Member", category: "general" },

  // Senior Leadership
  {
    value: "bishop",
    label: "Bishop",
    description: "Head of church",
    category: "leadership",
  },
  {
    value: "pastor",
    label: "Pastor",
    description: "Lead pastor of the church",
    category: "leadership",
  },
  {
    value: "pastor_wife",
    label: "Pastor's Wife",
    category: "leadership",
  },
  {
    value: "associate_pastor",
    label: "Associate Pastor",
    category: "leadership",
  },
  {
    value: "elder",
    label: "Elder",
    description: "Church elder",
    category: "leadership",
  },
  {
    value: "preacher",
    label: "Preacher",
    category: "leadership",
  },
  {
    value: "evangelist",
    label: "Evangelist",
    category: "leadership",
  },
  {
    value: "deacon",
    label: "Deacon",
    description: "Church deacon",
    category: "leadership",
  },

  // Administrative Roles
  {
    value: "missions_director",
    label: "Missions Director",
    category: "administrative",
  },
  {
    value: "mod_president",
    label: "MOD President",
    description: "Missionary Operation Department",
    category: "administrative",
  },
  {
    value: "mod_vice_president",
    label: "MOD Vice President",
    category: "administrative",
  },
  {
    value: "mod_treasurer",
    label: "MOD Treasurer",
    category: "administrative",
  },
  {
    value: "hol_president",
    label: "HOL President",
    description: "House of Leaders",
    category: "administrative",
  },
  {
    value: "hol_vice_president",
    label: "HOL Vice President",
    category: "administrative",
  },
  {
    value: "hol_treasurer",
    label: "HOL Treasurer",
    category: "administrative",
  },
  {
    value: "college_career_president",
    label: "College & Career President",
    category: "administrative",
  },
  {
    value: "college_career_vice_president",
    label: "College & Career Vice President",
    category: "administrative",
  },
  {
    value: "college_career_treasurer",
    label: "College & Career Treasurer",
    category: "administrative",
  },
  {
    value: "jems_president",
    label: "JEMS President",
    description: "Junior/Young Adults Ministry",
    category: "administrative",
  },
  {
    value: "jems_vice_president",
    label: "JEMS Vice President",
    category: "administrative",
  },
  {
    value: "jems_treasurer",
    label: "JEMS Treasurer",
    category: "administrative",
  },
  {
    value: "his_president",
    label: "HIS President",
    category: "administrative",
  },
  {
    value: "his_vice_president",
    label: "HIS Vice President",
    category: "administrative",
  },
  {
    value: "his_treasurer",
    label: "HIS Treasurer",
    category: "administrative",
  },
  {
    value: "sgbc_treasurer",
    label: "SGBC Treasurer",
    category: "administrative",
  },

  // Music & Choir Ministry
  {
    value: "music_director",
    label: "Music Director",
    category: "ministry",
  },
  {
    value: "choir_conductor",
    label: "Choir Conductor",
    category: "ministry",
  },
  {
    value: "choir_conductress",
    label: "Choir Conductress",
    category: "ministry",
  },
  {
    value: "adults_choir_director",
    label: "Adults Choir Director",
    category: "ministry",
  },
  {
    value: "adults_choir_member",
    label: "Adults Choir Member",
    category: "ministry",
  },
  {
    value: "sgbc_choir_member",
    label: "SGBC Choir Member",
    category: "ministry",
  },
  {
    value: "music_chamber_member",
    label: "Music Chamber Member",
    category: "ministry",
  },
  {
    value: "song_leader",
    label: "Song Leader",
    category: "ministry",
  },

  // Children & Youth Ministry
  {
    value: "sunday_school_teacher",
    label: "Sunday School Teacher",
    category: "ministry",
  },
  {
    value: "vbs_director",
    label: "VBS Director",
    description: "Vacation Bible School",
    category: "ministry",
  },
  {
    value: "vbs_teacher",
    label: "VBS Teacher",
    category: "ministry",
  },
  {
    value: "vbs_volunteer",
    label: "VBS Volunteer",
    category: "ministry",
  },

  // Special Ministries
  {
    value: "sound_system_ministry",
    label: "Sound System Ministry",
    category: "special_ministry",
  },
  {
    value: "media_team",
    label: "Media Team",
    category: "special_ministry",
  },
  {
    value: "usher",
    label: "Usher",
    category: "special_ministry",
  },
  {
    value: "parking_ministry_member",
    label: "Parking Ministry Member",
    category: "special_ministry",
  },
  {
    value: "prayer_intercessory_network_member",
    label: "Prayer Intercessory Network Member",
    category: "special_ministry",
  },
  {
    value: "prayer_intercessory_network_leader",
    label: "Prayer Intercessory Network Leader",
    category: "special_ministry",
  },
  {
    value: "medical_mission_volunteer",
    label: "Medical Mission Volunteer",
    category: "special_ministry",
  },
  {
    value: "visitation_team_member",
    label: "Visitation Team Member",
    category: "special_ministry",
  },
  {
    value: "visitation_team_director",
    label: "Visitation Team Director",
    category: "special_ministry",
  },
  {
    value: "bishops_care_member",
    label: "Bishop's Care Member",
    category: "special_ministry",
  },
  {
    value: "creator_lounge_member",
    label: "Creator Lounge Member",
    category: "special_ministry",
  },
  {
    value: "cook_volunteer",
    label: "Cook Volunteer",
    category: "special_ministry",
  },
  {
    value: "driver",
    label: "Driver",
    category: "special_ministry",
  },
  {
    value: "itm_member",
    label: "ITM Member",
    description: "Intercessory Team Member",
    category: "special_ministry",
  },
  {
    value: "ministry_leader",
    label: "Ministry Leader",
    category: "special_ministry",
  },
];

/**
 * Leadership Roles Repository
 * Provides centralized access to role data with validation
 */
export class LeadershipRolesRepository {
  private catalog: LeadershipRoleMetadata[] = ROLES_CATALOG;

  /**
   * Get all available roles
   */
  getAll(): LeadershipRoleMetadata[] {
    return this.catalog;
  }

  /**
   * Get roles filtered by category
   */
  getByCategory(category: LeadershipRoleMetadata["category"]): LeadershipRoleMetadata[] {
    return this.catalog.filter((role) => role.category === category);
  }

  /**
   * Get a specific role by its value
   */
  getByValue(value: LeadershipRoleType): LeadershipRoleMetadata | undefined {
    return this.catalog.find((role) => role.value === value);
  }

  /**
   * Get display label for a role value
   */
  getLabel(value: LeadershipRoleType): string {
    return this.getByValue(value)?.label || value;
  }

  /**
   * Check if a value is a valid role
   */
  isValid(value: unknown): value is LeadershipRoleType {
    return this.catalog.some((role) => role.value === value);
  }

  /**
   * Get all unique categories
   */
  getCategories(): LeadershipRoleMetadata["category"][] {
    const categories = new Set(this.catalog.map((role) => role.category));
    return Array.from(categories);
  }

  /**
   * Group roles by category
   */
  groupByCategory(): Record<LeadershipRoleMetadata["category"], LeadershipRoleMetadata[]> {
    const grouped: Record<LeadershipRoleMetadata["category"], LeadershipRoleMetadata[]> = {
      general: [],
      leadership: [],
      administrative: [],
      ministry: [],
      special_ministry: [],
    };

    this.catalog.forEach((role) => {
      grouped[role.category].push(role);
    });

    return grouped;
  }
}

/**
 * Singleton instance for application-wide use
 */
export const leadershipRoles = new LeadershipRolesRepository();
