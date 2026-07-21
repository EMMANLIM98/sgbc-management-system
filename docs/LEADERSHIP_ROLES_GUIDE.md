# Leadership Roles System - DDD Architecture Guide

## Overview

The Leadership Roles System is a Domain-Driven Design (DDD) implementation that provides a centralized, type-safe catalog of all church leadership and ministry roles. It's designed to be reusable across all application modules.

## Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│      Presentation Layer (React Components)          │
│  - Event Registration Form                          │
│  - Membership Administration                        │
│  - User Profile Settings                            │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│    Application Layer (Hooks & Services)             │
│  - useLeadershipRoles()                             │
│  - RoleValidationService                            │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│       Domain Layer (Business Logic)                 │
│  - LeadershipRolesRepository                        │
│  - LeadershipRoleType (enum)                        │
│  - LeadershipRoleMetadata (entity)                  │
│  - ROLES_CATALOG (single source of truth)           │
└─────────────────────────────────────────────────────┘
```

## Files Structure

```
src/
├── lib/
│   └── domain/
│       └── leadership-roles.ts          # Domain model & repository
├── hooks/
│   └── use-leadership-roles.ts          # React hook interface
└── modules/
    └── events/
        ├── ui/
        │   └── event-registration-form.tsx   # Usage example
        └── events.functions.ts               # Server-side validation
```

## Core Concepts

### 1. LeadershipRoleType (Domain Entity)

Union type of all 46 available roles. Provides type safety throughout the application.

```typescript
export type LeadershipRoleType =
  | "none"
  | "church_member"
  | "bishop"
  | "pastor"
  | "pastor_wife"
  | ... // 41 more roles
```

### 2. LeadershipRoleMetadata

Metadata for each role including display label, description, and category.

```typescript
interface LeadershipRoleMetadata {
  value: LeadershipRoleType;
  label: string;
  description?: string;
  category: "leadership" | "ministry" | "general" | "administrative" | "special_ministry";
}
```

### 3. LeadershipRolesRepository

Service class providing all role operations with repository pattern.

**Key Methods:**
- `getAll()` - Get all available roles
- `getByCategory(category)` - Get roles for specific category
- `getByValue(value)` - Get metadata for a role
- `getLabel(value)` - Get display label
- `isValid(value)` - Type guard validation
- `groupByCategory()` - Get roles organized by category
- `getCategories()` - Get all available categories

### 4. useLeadershipRoles Hook

React hook providing memoized access to roles with category grouping.

```typescript
const { 
  roles,              // All roles
  rolesByCategory,    // Organized by category
  getLabel,           // Get label for role
  getRole,            // Get full metadata
  isValidRole,        // Type validation
  categories          // Available categories
} = useLeadershipRoles();
```

## Usage Examples

### In React Components

**Display roles with category grouping:**
```typescript
import { useLeadershipRoles } from "@/hooks/use-leadership-roles";

export function RoleSelector() {
  const { rolesByCategory } = useLeadershipRoles();
  
  return (
    <SelectContent>
      {/* Leadership category */}
      <div>
        <h3>Leadership</h3>
        {rolesByCategory.leadership?.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </div>
      
      {/* Administrative category */}
      <div>
        <h3>Administrative</h3>
        {rolesByCategory.administrative?.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </div>
    </SelectContent>
  );
}
```

**Get role label for display:**
```typescript
const { getLabel } = useLeadershipRoles();

function RoleDisplay({ roleId }: { roleId: LeadershipRoleType }) {
  return <span>{getLabel(roleId)}</span>;
}
```

### In Zod Schemas (Frontend & Backend)

**Type-safe role validation:**
```typescript
import { z } from "zod";
import { LeadershipRoleType, leadershipRoles } from "@/lib/domain/leadership-roles";

const schema = z.object({
  leadershipRole: z
    .custom<LeadershipRoleType>((val) => leadershipRoles.isValid(val))
    .nullable()
    .optional(),
});
```

### In TanStack Server Functions

```typescript
import { createServerFn } from "@tanstack/react-start";
import { leadershipRoles } from "@/lib/domain/leadership-roles";

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data) => updateRoleSchema.parse(data))
  .handler(async ({ data }) => {
    // Role is guaranteed to be valid by schema validation
    if (!leadershipRoles.isValid(data.role)) {
      throw new Error("Invalid role");
    }
    // ... database update
  });
```

## Role Categories

### 1. General (1 role)
- Church Member

### 2. Leadership (9 roles)
Core leadership positions:
- Bishop
- Pastor
- Pastor's Wife
- Associate Pastor
- Elder
- Preacher
- Evangelist
- Deacon
- Deaconess

### 3. Administrative (16 roles)
Department heads and treasurers:
- Missions Director
- MOD President/Vice President/Treasurer
- HOL President/Vice President/Treasurer
- College & Career President/Vice President/Treasurer
- JEMS President/Vice President/Treasurer
- HIS President/Vice President/Treasurer
- SGBC Treasurer

### 4. Ministry (8 roles)
Music and worship leaders:
- Music Director
- Choir Conductor/Conductress
- Adults Choir Director/Member
- SGBC Choir Member
- Music Chamber Member
- Song Leader

### 5. Special Ministry (12 roles)
Dedicated service roles:
- Sound System Ministry
- Media Team
- Usher
- Parking Ministry Member
- Prayer Intercessory Network Member/Leader
- Visitation Team Member/Director
- Bishop's Care Member
- Creator Lounge Member
- Medical Mission Volunteer
- Cook Volunteer
- Driver
- ITM Member

## Adding New Roles

To add a new role:

1. **Update the type** in `src/lib/domain/leadership-roles.ts`:
```typescript
export type LeadershipRoleType =
  | "none"
  | ... existing roles ...
  | "new_role_snake_case";
```

2. **Add to ROLES_CATALOG**:
```typescript
const ROLES_CATALOG: LeadershipRoleMetadata[] = [
  // ... existing entries ...
  {
    value: "new_role_snake_case",
    label: "New Role Display Name",
    description: "Optional description",
    category: "administrative", // or appropriate category
  },
];
```

3. **No changes needed to components!** They automatically access the new role.

## Benefits of This Architecture

✅ **Single Source of Truth** - One place to manage all roles
✅ **Type Safety** - TypeScript enforces valid role values everywhere
✅ **DDD Principles** - Clear separation of concerns and layers
✅ **Reusability** - Use across events, membership, admin modules
✅ **Maintainability** - Easy to find and modify role definitions
✅ **Testability** - Pure functions in repository layer
✅ **Performance** - Memoized hooks prevent unnecessary recalculations
✅ **Developer Experience** - Intellisense support for role values
✅ **Scalability** - Easily handle 100+ roles without code changes

## Integration Checklist

When using in a new module:

- [ ] Import `useLeadershipRoles` hook in component
- [ ] Import `LeadershipRoleType` for type annotations
- [ ] Import `leadershipRoles` for server-side validation
- [ ] Use schema validation with `z.custom<LeadershipRoleType>()`
- [ ] Display roles grouped by category for better UX
- [ ] Use `getLabel()` to display role names

## Backward Compatibility

The system maintains backward compatibility:
- Old role values (e.g., "pastor_children") are deprecated but accepted
- New validation automatically maps legacy roles where applicable
- Existing database records continue to work without migration

## Future Enhancements

Potential improvements:
- [ ] Add role hierarchy/permissions
- [ ] Create role-based access control (RBAC) system
- [ ] Add role descriptions and responsibilities
- [ ] Create role assignment workflows
- [ ] Add role analytics and reporting
- [ ] Implement role change audit logging

## Support

For questions or issues with the roles system:
1. Check `src/lib/domain/leadership-roles.ts` for available roles
2. Review `src/hooks/use-leadership-roles.ts` for hook usage
3. See `src/modules/events/ui/event-registration-form.tsx` for implementation example
