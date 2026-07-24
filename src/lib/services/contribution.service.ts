/**
 * Contribution Service Controller
 * 
 * Orchestrates contribution (giving) use cases
 */

import {
  ContributionRepository,
  type IContributionRepository,
} from '@/lib/repositories';
import type { ContributionDTO } from '@/lib/api/dto/finance.dto';
import type { CreateContributionRequest } from '@/lib/api/request-schemas';

export class ContributionService {
  private repository: IContributionRepository;

  constructor(repository?: IContributionRepository) {
    this.repository = repository || new ContributionRepository();
  }

  /**
   * List contributions with pagination
   */
  async listContributions(
    orgId: string,
    options?: {
      page?: number;
      pageSize?: number;
      category?: string;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<{
    contributions: ContributionDTO[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let contributions: ContributionDTO[];
    let total: number;

    if (options?.category) {
      contributions = await this.repository.findByCategory(
        options.category,
        {
          limit: pageSize,
          offset,
        }
      );
      // TODO: Filter by orgId
      total = (
        await this.repository.findByCategory(options.category)
      ).length;
    } else {
      contributions = await this.repository.findByOrganizationId(orgId, {
        limit: pageSize,
        offset,
        orderBy: options?.orderBy || 'created_at',
        order: options?.order || 'desc',
      });
      total = (
        await this.repository.findByOrganizationId(orgId)
      ).length;
    }

    return {
      contributions,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get contribution by ID
   */
  async getContributionById(
    contributionId: string
  ): Promise<ContributionDTO | null> {
    return this.repository.findById(contributionId);
  }

  /**
   * Create new contribution
   */
  async createContribution(
    orgId: string,
    data: CreateContributionRequest
  ): Promise<ContributionDTO> {
    // TODO: Validate member exists
    // TODO: Create contribution record
    // TODO: Update statistics

    return this.repository.create({
      ...data,
      organization_id: orgId,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update contribution
   */
  async updateContribution(
    contributionId: string,
    data: Partial<ContributionDTO>
  ): Promise<ContributionDTO | null> {
    return this.repository.update(contributionId, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Delete contribution
   */
  async deleteContribution(contributionId: string): Promise<boolean> {
    return this.repository.delete(contributionId);
  }

  /**
   * Get contribution summary/statistics
   */
  async getSummary(orgId: string): Promise<{
    totalContributions: number;
    averageContribution: number;
    contributorCount: number;
    topCategory: string;
    contributionsByCategory: Record<string, number>;
  }> {
    const summary = await this.repository.getSummary(orgId);

    return {
      totalContributions: summary.totalContributions,
      averageContribution: summary.averageContribution,
      contributorCount: summary.contributorCount,
      topCategory: summary.topCategory,
      contributionsByCategory: {}, // TODO: Query by category
    };
  }

  /**
   * Get contributions by member
   */
  async getContributionsByMember(
    memberId: string
  ): Promise<ContributionDTO[]> {
    return this.repository.findByMemberId(memberId);
  }

  /**
   * Get total amount contributed this month
   */
  async getMonthlyTotal(orgId: string): Promise<number> {
    // TODO: Filter to this month only
    return this.repository.sumByOrganization(orgId);
  }
}

/**
 * Default instance
 */
export const contributionService = new ContributionService();
