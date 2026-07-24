/**
 * useLeadershipRoles Hook
 *
 * Provides easy access to leadership roles throughout the application.
 * Implements application layer of DDD architecture.
 *
 * Usage in components:
 * const { roles, getLabel, getByCategory } = useLeadershipRoles();
 */

import { useMemo } from "react";
import {
  leadershipRoles,
  LeadershipRoleType,
  LeadershipRoleMetadata,
} from "@/lib/domain/leadership-roles";

interface UseLeadershipRolesReturn {
  /** Get all available roles */
  roles: LeadershipRoleMetadata[];
  /** Get all roles grouped by category */
  rolesByCategory: Record<string, LeadershipRoleMetadata[]>;
  /** Get roles for a specific category */
  getRolesByCategory: (category: LeadershipRoleMetadata["category"]) => LeadershipRoleMetadata[];
  /** Get display label for a role */
  getLabel: (role: LeadershipRoleType) => string;
  /** Get full role metadata */
  getRole: (value: LeadershipRoleType) => LeadershipRoleMetadata | undefined;
  /** Check if value is a valid role */
  isValidRole: (value: unknown) => value is LeadershipRoleType;
  /** Get all available categories */
  categories: LeadershipRoleMetadata["category"][];
}

export function useLeadershipRoles(): UseLeadershipRolesReturn {
  const roles = useMemo(() => leadershipRoles.getAll(), []);

  const rolesByCategory = useMemo(() => leadershipRoles.groupByCategory(), []);

  const categories = useMemo(() => leadershipRoles.getCategories(), []);

  const getRolesByCategory = useMemo(
    () => (category: LeadershipRoleMetadata["category"]) => leadershipRoles.getByCategory(category),
    [],
  );

  const getLabel = useMemo(() => (role: LeadershipRoleType) => leadershipRoles.getLabel(role), []);

  const getRole = useMemo(
    () => (value: LeadershipRoleType) => leadershipRoles.getByValue(value),
    [],
  );

  const isValidRole = useMemo(
    () =>
      (value: unknown): value is LeadershipRoleType =>
        leadershipRoles.isValid(value),
    [],
  );

  return {
    roles,
    rolesByCategory,
    getRolesByCategory,
    getLabel,
    getRole,
    isValidRole,
    categories,
  };
}
