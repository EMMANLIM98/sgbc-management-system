/**
 * Unit Tests for MemberService
 * 
 * Demonstrates testing patterns for service methods
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemberService } from '@/lib/services/member.service';
import {
  createMockMemberRepository,
  createMockMember,
} from '@/lib/test-utils';

describe('MemberService', () => {
  let service: MemberService;
  let mockMemberRepo: any;

  beforeEach(() => {
    mockMemberRepo = createMockMemberRepository();
    service = new MemberService(mockMemberRepo);
  });

  describe('listMembers', () => {
    it('should return paginated list of members', async () => {
      // Arrange
      const mockMembers = [
        createMockMember({ id: 'user-1', full_name: 'John Doe' }),
        createMockMember({ id: 'user-2', full_name: 'Jane Smith' }),
      ];

      mockMemberRepo.findAll.mockResolvedValue(mockMembers);
      mockMemberRepo.count.mockResolvedValue(2);

      // Act
      const result = await service.listMembers('org-123', {
        page: 1,
        pageSize: 20,
      });

      // Assert
      expect(result.members).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should apply pagination offset correctly', async () => {
      // Arrange
      mockMemberRepo.findAll.mockResolvedValue([]);
      mockMemberRepo.count.mockResolvedValue(100);

      // Act
      await service.listMembers('org-123', {
        page: 3,
        pageSize: 20,
      });

      // Assert
      // Page 3 with pageSize 20 should have offset of 40 (2 pages * 20)
      expect(mockMemberRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 40,
          limit: 20,
        })
      );
    });
  });

  describe('getMemberById', () => {
    it('should return member by ID', async () => {
      // Arrange
      const member = createMockMember({ id: 'user-123' });
      mockMemberRepo.findById.mockResolvedValue(member);

      // Act
      const result = await service.getMemberById('user-123');

      // Assert
      expect(result).toEqual(member);
    });

    it('should return null if member not found', async () => {
      // Arrange
      mockMemberRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.getMemberById('user-999');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createMember', () => {
    it('should create new member', async () => {
      // Arrange
      const newMemberData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        organization_id: 'org-123',
      };

      const createdMember = createMockMember(newMemberData);
      mockMemberRepo.create.mockResolvedValue(createdMember);

      // Act
      const result = await service.createMember(newMemberData);

      // Assert
      expect(result).toEqual(createdMember);
      expect(mockMemberRepo.create).toHaveBeenCalledWith(newMemberData);
    });
  });

  describe('updateMember', () => {
    it('should update member details', async () => {
      // Arrange
      const updateData = {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
      };

      const updatedMember = createMockMember({
        id: 'user-123',
        ...updateData,
      });

      mockMemberRepo.update.mockResolvedValue(updatedMember);

      // Act
      const result = await service.updateMember('user-123', updateData);

      // Assert
      expect(result).toEqual(updatedMember);
      expect(result.full_name).toBe('Jane Doe');
    });
  });

  describe('deleteMember', () => {
    it('should soft delete member', async () => {
      // Arrange
      mockMemberRepo.softDelete.mockResolvedValue(true);

      // Act
      const result = await service.deleteMember('user-123');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('searchMembers', () => {
    it('should search members by query', async () => {
      // Arrange
      const searchResults = [
        createMockMember({ id: 'user-1', full_name: 'John Doe' }),
        createMockMember({ id: 'user-2', full_name: 'John Smith' }),
      ];

      mockMemberRepo.search.mockResolvedValue(searchResults);

      // Act
      const result = await service.searchMembers('org-123', 'John');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockMemberRepo.search).toHaveBeenCalledWith('John', 'org-123');
    });

    it('should return empty array if no matches', async () => {
      // Arrange
      mockMemberRepo.search.mockResolvedValue([]);

      // Act
      const result = await service.searchMembers('org-123', 'XYZ');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('activateMember', () => {
    it('should activate a member', async () => {
      // Arrange
      const activatedMember = createMockMember({
        id: 'user-123',
        is_active: true,
      });

      mockMemberRepo.activate.mockResolvedValue(activatedMember);

      // Act
      const result = await service.activateMember('user-123');

      // Assert
      expect(result).toEqual(activatedMember);
      expect(result.is_active).toBe(true);
    });
  });

  describe('deactivateMember', () => {
    it('should deactivate a member', async () => {
      // Arrange
      const deactivatedMember = createMockMember({
        id: 'user-123',
        is_active: false,
      });

      mockMemberRepo.deactivate.mockResolvedValue(deactivatedMember);

      // Act
      const result = await service.deactivateMember('user-123');

      // Assert
      expect(result).toEqual(deactivatedMember);
      expect(result.is_active).toBe(false);
    });
  });

  describe('getMembersByOrganization', () => {
    it('should get members for organization', async () => {
      // Arrange
      const orgMembers = [
        createMockMember({ id: 'user-1', organization_id: 'org-123' }),
        createMockMember({ id: 'user-2', organization_id: 'org-123' }),
        createMockMember({ id: 'user-3', organization_id: 'org-123' }),
      ];

      mockMemberRepo.findByOrganizationId.mockResolvedValue(orgMembers);
      mockMemberRepo.countByOrganizationId.mockResolvedValue(3);

      // Act
      const result = await service.getMembersByOrganization('org-123', {
        page: 1,
        pageSize: 20,
      });

      // Assert
      expect(result.members).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should return empty list if organization has no members', async () => {
      // Arrange
      mockMemberRepo.findByOrganizationId.mockResolvedValue([]);
      mockMemberRepo.countByOrganizationId.mockResolvedValue(0);

      // Act
      const result = await service.getMembersByOrganization('org-999', {
        page: 1,
        pageSize: 20,
      });

      // Assert
      expect(result.members).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('countMembersInOrganization', () => {
    it('should return member count for organization', async () => {
      // Arrange
      mockMemberRepo.countByOrganizationId.mockResolvedValue(42);

      // Act
      const result = await service.countMembersInOrganization('org-123');

      // Assert
      expect(result).toBe(42);
    });
  });
});
