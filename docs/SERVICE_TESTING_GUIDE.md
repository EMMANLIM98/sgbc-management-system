# Service Layer Testing Guide

## Overview

This guide explains the test infrastructure and patterns for testing the service layer in the SGBC management system.

## Why Test Services?

Services contain all business logic. Testing them ensures:

- ✅ Business rules are enforced
- ✅ Edge cases are handled
- ✅ Error conditions produce correct responses
- ✅ Data transformations work correctly
- ✅ Authorization checks work as expected

## Testing Philosophy

**Unit Tests Focus on Service Methods**

- Test business logic in isolation
- Mock all dependencies (repositories)
- Don't need real database
- Run quickly (~milliseconds each)
- Cover edge cases and error conditions

**Integration Tests Focus on API Endpoints** (separate)

- Test full request → response flow
- Mock HTTP layer
- Test service integration
- Verify error mapping to HTTP status codes

## Test Infrastructure

### Files Created

```
vitest.config.ts              ← Vitest configuration
vitest.setup.ts               ← Global test setup
src/lib/test-utils.ts         ← Mock builders and utilities
src/lib/services/
  ├── organization.service.test.ts  ← Example tests
  ├── member.service.test.ts        ← Example tests
  └── [other services].test.ts      ← Tests for each service
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run specific test file
npm run test src/lib/services/organization.service.test.ts

# Generate coverage report
npm run test:coverage

# Run with UI
npm run test:ui
```

## Testing Pattern

### Step 1: Create Mocked Dependencies

```typescript
import { createMockOrganizationRepository } from "@/lib/test-utils";

let mockOrgRepo = createMockOrganizationRepository();
```

### Step 2: Create Service Instance with Mocks

```typescript
import { OrganizationService } from "@/lib/services";

const service = new OrganizationService(mockOrgRepo);
```

### Step 3: Write Tests (Arrange → Act → Assert)

```typescript
it("should assign admin role to member", async () => {
  // Arrange
  const org = createMockOrganization({ id: "org-123" });
  const member = createMockMember({ id: "user-456" });
  const updatedMember = createMockMember({
    id: "user-456",
    is_org_admin: true,
  });

  mockOrgRepo.findById.mockResolvedValue(org);
  mockMemberRepo.findById.mockResolvedValue(member);
  mockMemberRepo.findByOrganizationId.mockResolvedValue([member]);
  mockMemberRepo.update.mockResolvedValue(updatedMember);

  // Act
  const result = await service.assignUserRole("org-123", "user-456", "admin");

  // Assert
  expect(result.is_org_admin).toBe(true);
  expect(mockMemberRepo.update).toHaveBeenCalledWith("user-456", {
    is_org_admin: true,
    is_owner: false,
  });
});
```

## Mock Utilities

### Mock Repository Builders

Create pre-configured mocks with all methods stubbed:

```typescript
import {
  createMockOrganizationRepository,
  createMockMemberRepository,
  createMockContributionRepository,
} from "@/lib/test-utils";

// Create mock with all methods returning default values
const mockRepo = createMockOrganizationRepository();

// Override specific methods for your test
const mockRepo = createMockOrganizationRepository({
  findById: vi.fn().mockResolvedValue(someOrganization),
});
```

### Mock DTO Builders

Create realistic test data:

```typescript
import { createMockOrganization, createMockMember, createMockContribution } from "@/lib/test-utils";

const org = createMockOrganization({ id: "org-123", name: "Church A" });
const member = createMockMember({ email: "john@example.com" });
const contrib = createMockContribution({ amount: 100.0 });
```

## Test Structure

### Describe Blocks (Group Related Tests)

```typescript
describe('OrganizationService', () => {
  describe('listOrganizations', () => {
    it('should return paginated list', async () => { ... });
    it('should filter by active', async () => { ... });
  });

  describe('assignUserRole', () => {
    it('should assign admin role', async () => { ... });
    it('should prevent removing last owner', async () => { ... });
  });
});
```

### beforeEach (Setup Before Each Test)

```typescript
beforeEach(() => {
  // Fresh mocks for each test
  mockOrgRepo = createMockOrganizationRepository();
  service = new OrganizationService(mockOrgRepo);
});
```

## Testing Common Scenarios

### 1. Success Cases

```typescript
it("should create new organization", async () => {
  // Setup
  const newOrg = { name: "Church", description: "..." };
  const created = createMockOrganization(newOrg);
  mockOrgRepo.create.mockResolvedValue(created);

  // Execute
  const result = await service.createOrganization(newOrg, "creator-123");

  // Verify
  expect(result).toEqual(created);
});
```

### 2. Error Cases (Resource Not Found)

```typescript
it("should throw error if organization not found", async () => {
  // Setup
  mockOrgRepo.findById.mockResolvedValue(null);

  // Execute & Assert
  await expect(service.assignUserRole("org-999", "user-456", "admin")).rejects.toThrow(
    "Organization not found",
  );
});
```

### 3. Business Rule Validation

```typescript
it("should prevent removing last owner", async () => {
  // Setup
  const lastOwner = createMockMember({
    id: "user-456",
    is_owner: true,
  });

  mockOrgRepo.findById.mockResolvedValue(org);
  mockMemberRepo.findById.mockResolvedValue(lastOwner);
  // Only member is the owner
  mockMemberRepo.findByOrganizationId.mockResolvedValue([lastOwner]);

  // Execute & Assert
  await expect(service.assignUserRole("org-123", "user-456", "member")).rejects.toThrow(
    "Cannot remove the only owner",
  );
});
```

### 4. Pagination

```typescript
it("should apply correct pagination offset", async () => {
  // Setup
  mockOrgRepo.findAll.mockResolvedValue([]);

  // Execute
  await service.listOrganizations({
    page: 3,
    pageSize: 20,
  });

  // Assert - Page 3 means offset is 40 (skip first 2 pages)
  expect(mockOrgRepo.findAll).toHaveBeenCalledWith({
    offset: 40,
    limit: 20,
  });
});
```

### 5. Filtering

```typescript
it("should filter by active status", async () => {
  // Setup
  mockOrgRepo.findActive.mockResolvedValue([]);

  // Execute
  await service.listOrganizations({
    status: "active",
  });

  // Assert
  expect(mockOrgRepo.findActive).toHaveBeenCalled();
});
```

### 6. Mocking Repository Calls

```typescript
it("should call repository methods in correct order", async () => {
  // Setup
  const org = createMockOrganization();
  const member = createMockMember();

  mockOrgRepo.findById.mockResolvedValue(org);
  mockMemberRepo.findById.mockResolvedValue(member);

  // Execute
  await service.assignUserRole("org-123", "user-456", "admin");

  // Assert - Verify call order and arguments
  expect(mockOrgRepo.findById).toHaveBeenCalledWith("org-123");
  expect(mockMemberRepo.findById).toHaveBeenCalledWith("user-456");
  expect(mockMemberRepo.update).toHaveBeenCalled();
});
```

## Test Coverage Goals

**Target Coverage**:

- ✅ Lines: 80%+
- ✅ Functions: 80%+
- ✅ Branches: 75%+
- ✅ Statements: 80%+

**What to Test**:

- ✅ Happy path (success case)
- ✅ Error conditions (resource not found, validation fails)
- ✅ Business rules (last owner, authorization)
- ✅ Edge cases (empty lists, null values)
- ✅ Data transformations (DTOs, mappings)

**What NOT to Test**:

- ❌ Database behavior (that's integration tests)
- ❌ HTTP concerns (that's route tests)
- ❌ Third-party library implementation (they test themselves)

## Example Test Template

Copy this template for new service tests:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { YourService } from "@/lib/services/your.service";
import { createMockYourRepository, createMockYourDto } from "@/lib/test-utils";

describe("YourService", () => {
  let service: YourService;
  let mockYourRepo: any;

  beforeEach(() => {
    mockYourRepo = createMockYourRepository();
    service = new YourService(mockYourRepo);
  });

  describe("methodName", () => {
    it("should do something specific", async () => {
      // Arrange - Setup test data and mocks
      const mockData = createMockYourDto();
      mockYourRepo.someMethod.mockResolvedValue(mockData);

      // Act - Call the service method
      const result = await service.methodName("param");

      // Assert - Verify result and mock calls
      expect(result).toEqual(mockData);
      expect(mockYourRepo.someMethod).toHaveBeenCalledWith("param");
    });

    it("should throw error when precondition fails", async () => {
      // Arrange
      mockYourRepo.someMethod.mockResolvedValue(null);

      // Act & Assert
      await expect(service.methodName("param")).rejects.toThrow("Expected error message");
    });
  });
});
```

## Running & Debugging Tests

### Run All Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Debug Specific Test

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run src/lib/services/organization.service.test.ts
```

### View Coverage Report

```bash
npm run test:coverage
open test-results/index.html
```

## Best Practices

### ✅ DO

- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Follow Arrange → Act → Assert pattern
- ✅ Mock external dependencies
- ✅ Test error conditions
- ✅ Test business rules
- ✅ Keep tests focused
- ✅ Use beforeEach for setup
- ✅ Create realistic test data

### ❌ DON'T

- ❌ Test implementation details
- ❌ Write overly complex tests
- ❌ Skip error cases
- ❌ Hardcode values (use test builders)
- ❌ Test multiple things in one test
- ❌ Mock things you don't need to mock
- ❌ Make tests interdependent
- ❌ Test third-party libraries

## Continuous Integration

Tests should run automatically:

- On every commit (pre-commit hook)
- On every push (GitHub Actions)
- Before deployment

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test
      - run: npm run test:coverage
```

## Troubleshooting

### Test Timeout

Increase timeout in vitest.config.ts:

```typescript
test: {
  testTimeout: 10000, // 10 seconds
}
```

### Mock Not Working

Ensure mock is set before calling service method:

```typescript
// ✅ CORRECT - Mock before call
mockRepo.findById.mockResolvedValue(data);
await service.method();

// ❌ WRONG - Mock after call
await service.method();
mockRepo.findById.mockResolvedValue(data);
```

### Tests Pass Locally but Fail in CI

Check for:

- Race conditions
- Environment variables
- Timezone differences
- Randomized test order

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Matchers](https://jestjs.io/docs/expect)

---

**Next Steps**: Follow this pattern for all 6 service classes!
