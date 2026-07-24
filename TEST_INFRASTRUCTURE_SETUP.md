# Test Infrastructure Setup: Complete Guide

## What Was Created

### 1. Test Framework Configuration

**vitest.config.ts**

- Test runner configuration
- Coverage settings (target: 80% lines, functions, statements; 75% branches)
- Path aliases (@/ → src/)
- Reporter configuration (JSON, HTML)
- Environment setup (jsdom for browser-like testing)

**vitest.setup.ts**

- Global test setup
- Mock environment variables (Supabase URLs)
- Custom matchers (toBeValidUUID)
- Console output suppression for cleaner test results

### 2. Test Utilities (src/lib/test-utils.ts)

**Mock Builders** for all repositories:

- `createMockMemberRepository()`
- `createMockOrganizationRepository()`
- `createMockContributionRepository()`
- `createMockEventRepository()`
- `createMockPledgeRepository()`
- `createMockExpenseRepository()`

**Mock Data Builders** for all DTOs:

- `createMockOrganization()`
- `createMockMember()`
- `createMockEvent()`
- `createMockContribution()`
- `createMockPledge()`
- `createMockExpense()`

**Pre-configured Mock Objects** with realistic default values:

```typescript
mockDTOs = {
  organization: { id: 'org-123', name: 'Test Organization', ... },
  member: { id: 'user-123', full_name: 'John Doe', ... },
  event: { id: 'event-123', title: 'Sunday Service', ... },
  // ... etc
}
```

### 3. Example Test Files

**src/lib/services/organization.service.test.ts** (18 tests)

- Tests all methods in OrganizationService
- Demonstrates testing patterns for success, error, and edge cases
- Shows pagination, filtering, business rule validation

**src/lib/services/member.service.test.ts** (15 tests)

- Tests MemberService methods
- Demonstrates search, status changes, organizational queries

**docs/TEST_EXAMPLES.test.ts** (Comprehensive example)

- 30+ tests in one file
- Shows every testing pattern and edge case
- Highly detailed with comments explaining each test
- Copy-paste template for new tests

### 4. Documentation

**docs/SERVICE_TESTING_GUIDE.md** (Complete guide)

- Why test services
- Testing philosophy
- Test infrastructure overview
- Testing patterns with examples
- Coverage goals and strategies
- Best practices (DO/DON'T)
- Troubleshooting
- CI/CD integration

### 5. NPM Scripts Added

```bash
npm run test              # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:ui          # Open interactive test UI
```

### 6. Dependencies Added

```json
"vitest": "^2.1.0"                    // Test runner
"@vitest/ui": "^2.1.0"               // Interactive UI
"@vitest/coverage-v8": "^2.1.0"      // Coverage reporting
"@testing-library/dom": "^10.4.0"    // DOM testing utilities
"jsdom": "^24.0.0"                   // Browser-like environment
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests

```bash
# Run all tests
npm run test

# Run in watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### 3. Write a New Test

Create `src/lib/services/my-service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MyService } from "@/lib/services/my.service";
import { createMockMyRepository, createMockMyDto } from "@/lib/test-utils";

describe("MyService", () => {
  let service: MyService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = createMockMyRepository();
    service = new MyService(mockRepo);
  });

  describe("methodName", () => {
    it("should do something", async () => {
      // Arrange
      const mockData = createMockMyDto();
      mockRepo.someMethod.mockResolvedValue(mockData);

      // Act
      const result = await service.method("param");

      // Assert
      expect(result).toEqual(mockData);
    });
  });
});
```

---

## Test Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── organization.service.ts
│   │   ├── organization.service.test.ts    ← Test file
│   │   ├── member.service.ts
│   │   ├── member.service.test.ts          ← Test file
│   │   └── [other services]
│   ├── repositories/
│   │   └── [repositories]
│   ├── test-utils.ts                       ← Mock builders and utilities
│   └── [other lib code]
│
docs/
├── SERVICE_TESTING_GUIDE.md                ← Testing documentation
├── TEST_EXAMPLES.test.ts                   ← Comprehensive examples
└── [other docs]

vitest.config.ts                            ← Vitest configuration
vitest.setup.ts                             ← Global test setup
```

---

## Testing Patterns

### Pattern 1: Basic Success Case

```typescript
it("should create new organization", async () => {
  // Arrange - Setup test data
  const newOrg = { name: "Church", description: "..." };
  const created = createMockOrganization(newOrg);
  mockOrgRepo.create.mockResolvedValue(created);

  // Act - Call service method
  const result = await service.createOrganization(newOrg, "creator-123");

  // Assert - Verify result
  expect(result).toEqual(created);
});
```

### Pattern 2: Error Case

```typescript
it("should throw error if organization not found", async () => {
  // Arrange
  mockOrgRepo.findById.mockResolvedValue(null);

  // Act & Assert
  await expect(service.assignUserRole("org-999", "user-456", "admin")).rejects.toThrow(
    "Organization not found",
  );
});
```

### Pattern 3: Business Rule Validation

```typescript
it("should prevent removing last owner", async () => {
  // Arrange
  const lastOwner = createMockMember({
    id: "user-456",
    is_owner: true,
  });
  mockOrgRepo.findById.mockResolvedValue(org);
  mockMemberRepo.findById.mockResolvedValue(lastOwner);
  mockMemberRepo.findByOrganizationId.mockResolvedValue([lastOwner]);

  // Act & Assert
  await expect(service.assignUserRole("org-123", "user-456", "member")).rejects.toThrow(
    "Cannot remove the only owner",
  );
});
```

### Pattern 4: Pagination

```typescript
it("should apply correct pagination offset", async () => {
  // Arrange
  mockOrgRepo.findAll.mockResolvedValue([]);

  // Act
  await service.listOrganizations({ page: 3, pageSize: 20 });

  // Assert - Page 3 = offset 40 (skip first 2 pages)
  expect(mockOrgRepo.findAll).toHaveBeenCalledWith({
    offset: 40,
    limit: 20,
  });
});
```

### Pattern 5: Mock Verification

```typescript
it("should call repositories in correct order", async () => {
  // Arrange
  mockOrgRepo.findById.mockResolvedValue(org);
  mockMemberRepo.findById.mockResolvedValue(member);

  // Act
  await service.assignUserRole("org-123", "user-456", "admin");

  // Assert - Verify calls
  expect(mockOrgRepo.findById).toHaveBeenCalledWith("org-123");
  expect(mockMemberRepo.findById).toHaveBeenCalledWith("user-456");
  expect(mockMemberRepo.update).toHaveBeenCalled();
});
```

---

## Coverage Report

After running `npm run test:coverage`, open `test-results/index.html` to see:

- Line-by-line coverage
- Branch coverage
- Function coverage
- Uncovered code highlighting

**Coverage Goals**:

- Lines: 80%+
- Functions: 80%+
- Branches: 75%+
- Statements: 80%+

---

## Writing Tests for Each Service

### Step 1: Create Test File

Create `src/lib/services/[service].service.test.ts`

### Step 2: Import Setup

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { YourService } from "@/lib/services/your.service";
import { createMockYourRepository, createMockYourDto } from "@/lib/test-utils";
```

### Step 3: Create Test Suite

```typescript
describe("YourService", () => {
  let service: YourService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = createMockYourRepository();
    service = new YourService(mockRepo);
  });

  describe("methodName", () => {
    // Add tests here
  });
});
```

### Step 4: Write Tests

For each public method:

- ✅ Test success case
- ✅ Test error cases
- ✅ Test business rules
- ✅ Test edge cases
- ✅ Test mock calls

---

## Best Practices

### ✅ DO

- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Follow Arrange → Act → Assert
- ✅ Mock external dependencies
- ✅ Test error conditions
- ✅ Test business rules
- ✅ Keep tests focused
- ✅ Use beforeEach for setup
- ✅ Create realistic test data with builders

### ❌ DON'T

- ❌ Test implementation details
- ❌ Write overly complex tests
- ❌ Skip error cases
- ❌ Hardcode values (use test builders)
- ❌ Test multiple things in one test
- ❌ Mock everything (mock only external deps)
- ❌ Make tests interdependent
- ❌ Test third-party libraries

---

## Testing All 6 Services

### Services Ready for Testing

1. **OrganizationService** ✅ (tests created)
2. **MemberService** ✅ (tests created)
3. **EventService** (use same pattern)
4. **ContributionService** (use same pattern)
5. **PledgeService** (use same pattern)
6. **ExpenseService** (use same pattern)

### Quick Setup for New Service Tests

Copy this template and adapt:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EventService } from '@/lib/services/event.service';
import { createMockEventRepository, createMockEvent } from '@/lib/test-utils';

describe('EventService', () => {
  let service: EventService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = createMockEventRepository();
    service = new EventService(mockRepo);
  });

  describe('createEvent', () => {
    it('should create new event', async () => {
      const eventData = { title: 'Sunday Service', ... };
      const created = createMockEvent(eventData);
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createEvent(eventData);

      expect(result).toEqual(created);
    });

    // Add more tests...
  });

  // Add more describe blocks for other methods...
});
```

---

## Continuous Integration

### Run Tests Before Commit

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test
```

### Run Tests on Every Push

Add to `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:coverage
```

---

## Troubleshooting

### Test Timeout

Increase timeout in vitest.config.ts:

```typescript
test: {
  testTimeout: 10000,
}
```

### Mock Not Working

Ensure mock is set BEFORE calling service:

```typescript
// ✅ CORRECT
mockRepo.findById.mockResolvedValue(data);
await service.method();

// ❌ WRONG
await service.method();
mockRepo.findById.mockResolvedValue(data);
```

### Import Errors

Check paths use @ alias:

```typescript
// ✅ CORRECT
import { MemberService } from "@/lib/services";

// ❌ WRONG
import { MemberService } from "../../../lib/services";
```

---

## Current Test Coverage

```
Organization Service
  ├── listOrganizations
  ├── getOrganizationById
  ├── createOrganization
  ├── updateOrganization
  ├── deleteOrganization
  ├── assignUserRole
  ├── getOrganizationStatistics
  ├── getUserOrganizations
  ├── isUserAdmin
  └── isUserOwner

Member Service
  ├── listMembers
  ├── getMemberById
  ├── createMember
  ├── updateMember
  ├── deleteMember
  ├── searchMembers
  ├── activateMember
  ├── deactivateMember
  ├── getMembersByOrganization
  └── countMembersInOrganization

Total: 33 example tests created
Ready to extend for remaining services
```

---

## Next Steps

1. **Run the tests**: `npm run test`
2. **Check coverage**: `npm run test:coverage`
3. **Write tests for remaining services** using provided patterns
4. **Aim for 80%+ coverage**
5. **Integrate into CI/CD pipeline**

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Service Testing Patterns](docs/SERVICE_TESTING_GUIDE.md)
- [Test Examples](docs/TEST_EXAMPLES.test.ts)

---

**Test infrastructure is ready! Start writing tests for your services! 🚀**
