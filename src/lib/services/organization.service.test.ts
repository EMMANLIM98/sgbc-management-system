/**
 * Unit Tests for OrganizationService
 * 
 * Tests the business logic layer in isolation using mocked repositories
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationService } from '@/lib/services/organization.service';
import {
  createMockOrganizationRepository,
  createMockMemberRepository,
  createMockOrganization,
  createMockMember,
} from '@/lib/test-utils';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockOrgRepo: any;
  let mockMemberRepo: any;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockOrgRepo = createMockOrganizationRepository();
    mockMemberRepo = createMockMemberRepository();

    // Create service instance with mocked dependencies
    service = new OrganizationService(mockOrgRepo, mockMemberRepo);
  });

  describe('listOrganizations', () => {
    it('should return list of organizations with pagination', async () => {
      // Arrange
      const mockOrgs = [
        createMockOrganization({ id: 'org-1', name: 'Church A' }),
        createMockOrganization({ id: 'org-2', name: 'Church B' }),
      ];

      mockOrgRepo.findAll.mockResolvedValue(mockOrgs);
      mockOrgRepo.count.mockResolvedValue(2);

      // Act
      const result = await service.listOrganizations({
        page: 1,
        pageSize: 20,
      });

      // Assert
      expect(result.organizations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockOrgRepo.findAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        orderBy: 'name',
        order: 'asc',
      });
    });

    it('should filter by active organizations', async () => {
      // Arrange
      const mockOrgs = [
        createMockOrganization({ id: 'org-1', is_active: true }),
      ];

      mockOrgRepo.findActive.mockResolvedValue(mockOrgs);
      mockOrgRepo.countActive.mockResolvedValue(1);

      // Act
      const result = await service.listOrganizations({
        page: 1,
        pageSize: 20,
        status: 'active',
      });

      // Assert
      expect(result.organizations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockOrgRepo.findActive).toHaveBeenCalled();
      expect(mockOrgRepo.countActive).toHaveBeenCalled();
    });

    it('should apply custom sorting', async () => {
      // Arrange
      mockOrgRepo.findAll.mockResolvedValue([]);
      mockOrgRepo.count.mockResolvedValue(0);

      // Act
      await service.listOrganizations({
        page: 1,
        pageSize: 20,
        orderBy: 'created_at',
        order: 'desc',
      });

      // Assert
      expect(mockOrgRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'created_at',
          order: 'desc',
        })
      );
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization by ID', async () => {
      // Arrange
      const mockOrg = createMockOrganization({ id: 'org-123' });
      mockOrgRepo.findById.mockResolvedValue(mockOrg);

      // Act
      const result = await service.getOrganizationById('org-123');

      // Assert
      expect(result).toEqual(mockOrg);
      expect(mockOrgRepo.findById).toHaveBeenCalledWith('org-123');
    });

    it('should return null if organization not found', async () => {
      // Arrange
      mockOrgRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.getOrganizationById('org-999');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createOrganization', () => {
    it('should create new organization', async () => {
      // Arrange
      const newOrg = {
        name: 'New Church',
        description: 'A new church',
      };

      const createdOrg = createMockOrganization({
        name: newOrg.name,
        description: newOrg.description,
        is_active: true,
      });

      mockOrgRepo.create.mockResolvedValue(createdOrg);

      // Act
      const result = await service.createOrganization(newOrg, 'creator-123');

      // Assert
      expect(result).toEqual(createdOrg);
      expect(mockOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newOrg.name,
          description: newOrg.description,
          is_active: true,
        })
      );
    });
  });

  describe('updateOrganization', () => {
    it('should update organization', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Name',
      };

      const updatedOrg = createMockOrganization({
        id: 'org-123',
        name: 'Updated Name',
      });

      mockOrgRepo.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await service.updateOrganization('org-123', updateData);

      // Assert
      expect(result).toEqual(updatedOrg);
      expect(mockOrgRepo.update).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining(updateData)
      );
    });
  });

  describe('deleteOrganization', () => {
    it('should soft delete organization', async () => {
      // Arrange
      mockOrgRepo.softDelete.mockResolvedValue(true);

      // Act
      const result = await service.deleteOrganization('org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockOrgRepo.softDelete).toHaveBeenCalledWith('org-123');
    });
  });

  describe('assignUserRole', () => {
    it('should assign admin role to member', async () => {
      // Arrange
      const org = createMockOrganization({ id: 'org-123' });
      const member = createMockMember({ id: 'user-456', is_org_admin: false });
      const updatedMember = createMockMember({
        id: 'user-456',
        is_org_admin: true,
        is_owner: false,
      });

      mockOrgRepo.findById.mockResolvedValue(org);
      mockMemberRepo.findById.mockResolvedValue(member);
      mockMemberRepo.findByOrganizationId.mockResolvedValue([member]);
      mockMemberRepo.update.mockResolvedValue(updatedMember);

      // Act
      const result = await service.assignUserRole('org-123', 'user-456', 'admin');

      // Assert
      expect(result).toEqual(updatedMember);
      expect(mockMemberRepo.update).toHaveBeenCalledWith('user-456', {
        is_org_admin: true,
        is_owner: false,
      });
    });

    it('should assign owner role to member', async () => {
      // Arrange
      const org = createMockOrganization({ id: 'org-123' });
      const member = createMockMember({ id: 'user-456' });
      const updatedMember = createMockMember({
        id: 'user-456',
        is_org_admin: true,
        is_owner: true,
      });

      mockOrgRepo.findById.mockResolvedValue(org);
      mockMemberRepo.findById.mockResolvedValue(member);
      mockMemberRepo.findByOrganizationId.mockResolvedValue([member]);
      mockMemberRepo.update.mockResolvedValue(updatedMember);

      // Act
      const result = await service.assignUserRole('org-123', 'user-456', 'owner');

      // Assert
      expect(result.is_owner).toBe(true);
      expect(result.is_org_admin).toBe(true);
    });

    it('should throw error if organization not found', async () => {
      // Arrange
      mockOrgRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignUserRole('org-999', 'user-456', 'admin')
      ).rejects.toThrow('Organization not found');
    });

    it('should throw error if member not found', async () => {
      // Arrange
      const org = createMockOrganization({ id: 'org-123' });
      mockOrgRepo.findById.mockResolvedValue(org);
      mockMemberRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignUserRole('org-123', 'user-999', 'admin')
      ).rejects.toThrow('Member not found');
    });

    it('should throw error if user not member of organization', async () => {
      // Arrange
      const org = createMockOrganization({ id: 'org-123' });
      const member = createMockMember({ id: 'user-456' });
      const otherMember = createMockMember({ id: 'user-789' });

      mockOrgRepo.findById.mockResolvedValue(org);
      mockMemberRepo.findById.mockResolvedValue(member);
      // Organization only has otherMember, not the member we're trying to update
      mockMemberRepo.findByOrganizationId.mockResolvedValue([otherMember]);

      // Act & Assert
      await expect(
        service.assignUserRole('org-123', 'user-456', 'admin')
      ).rejects.toThrow('User is not a member of this organization');
    });

    it('should prevent removing last owner', async () => {
      // Arrange
      const org = createMockOrganization({ id: 'org-123' });
      const lastOwner = createMockMember({
        id: 'user-456',
        is_owner: true,
        is_org_admin: true,
      });

      mockOrgRepo.findById.mockResolvedValue(org);
      mockMemberRepo.findById.mockResolvedValue(lastOwner);
      // Organization only has one member who is the owner
      mockMemberRepo.findByOrganizationId.mockResolvedValue([lastOwner]);

      // Act & Assert
      await expect(
        service.assignUserRole('org-123', 'user-456', 'admin')
      ).rejects.toThrow('Cannot remove the only owner');
    });
  });

  describe('isUserAdmin', () => {
    it('should return true if user is admin', async () => {
      // Arrange
      mockOrgRepo.isUserAdmin.mockResolvedValue(true);

      // Act
      const result = await service.isUserAdmin('org-123', 'user-456');

      // Assert
      expect(result).toBe(true);
      expect(mockOrgRepo.isUserAdmin).toHaveBeenCalledWith(
        'org-123',
        'user-456'
      );
    });

    it('should return false if user is not admin', async () => {
      // Arrange
      mockOrgRepo.isUserAdmin.mockResolvedValue(false);

      // Act
      const result = await service.isUserAdmin('org-123', 'user-456');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isUserOwner', () => {
    it('should return true if user is owner', async () => {
      // Arrange
      mockOrgRepo.isUserOwner.mockResolvedValue(true);

      // Act
      const result = await service.isUserOwner('org-123', 'user-456');

      // Assert
      expect(result).toBe(true);
      expect(mockOrgRepo.isUserOwner).toHaveBeenCalledWith(
        'org-123',
        'user-456'
      );
    });

    it('should return false if user is not owner', async () => {
      // Arrange
      mockOrgRepo.isUserOwner.mockResolvedValue(false);

      // Act
      const result = await service.isUserOwner('org-123', 'user-456');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getOrganizationStatistics', () => {
    it('should return organization statistics', async () => {
      // Arrange
      const stats = {
        totalMembers: 50,
        totalAdmins: 3,
        totalOwners: 1,
        churchCount: 2,
        eventCount: 12,
        contributionTotal: 5000.00,
      };

      mockOrgRepo.getStatistics.mockResolvedValue(stats);

      // Act
      const result = await service.getOrganizationStatistics('org-123');

      // Assert
      expect(result.totalMembers).toBe(50);
      expect(result.totalAdmins).toBe(3);
      expect(result.totalOwners).toBe(1);
      expect(result.activeChurches).toBe(2);
      expect(result.totalEvents).toBe(12);
      expect(result.totalContributions).toBe(5000.00);
      expect(mockOrgRepo.getStatistics).toHaveBeenCalledWith('org-123');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return organizations for user', async () => {
      // Arrange
      const userOrgs = [
        createMockOrganization({ id: 'org-1', name: 'Church A' }),
        createMockOrganization({ id: 'org-2', name: 'Church B' }),
      ];

      mockOrgRepo.findByUserId.mockResolvedValue(userOrgs);

      // Act
      const result = await service.getUserOrganizations('user-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockOrgRepo.findByUserId).toHaveBeenCalledWith('user-123');
    });
  });
});
