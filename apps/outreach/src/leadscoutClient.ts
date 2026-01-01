/**
 * LeadScout API Client
 * Provides access to LeadScout leads for campaign targeting
 */

import type { Lead, LeadStatus } from "@sb/schemas";
import { logger } from "@sb/logger";

export interface LeadScoutClientConfig {
  baseUrl: string;
  orgId?: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  source?: string;
  minScore?: number;
  orgId?: string;
}

export class LeadScoutClient {
  private baseUrl: string;
  private defaultOrgId?: string;

  constructor(config: LeadScoutClientConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultOrgId = config.orgId;
  }

  /**
   * Fetch leads from LeadScout API
   */
  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    try {
      const params = new URLSearchParams();

      const orgId = filters?.orgId || this.defaultOrgId;
      if (orgId) {
        params.append("orgId", orgId);
      }

      if (filters?.status) {
        params.append("status", filters.status);
      }

      if (filters?.source) {
        params.append("source", filters.source);
      }

      if (filters?.minScore !== undefined) {
        params.append("min_score", filters.minScore.toString());
      }

      const url = `${this.baseUrl}/leads${params.toString() ? `?${params.toString()}` : ""}`;

      logger.info("Fetching leads from LeadScout", { url, filters });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`LeadScout API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { leads?: Lead[] };
      const leads = data.leads || [];

      logger.info("Fetched leads from LeadScout", { count: leads.length });

      return leads;
    } catch (error) {
      logger.error("Failed to fetch leads from LeadScout", { error });
      throw error;
    }
  }

  /**
   * Update lead status in LeadScout
   */
  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
    try {
      const url = `${this.baseUrl}/leads/${leadId}`;

      logger.info("Updating lead status in LeadScout", { leadId, status });

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`LeadScout API error: ${response.status} ${response.statusText}`);
      }

      logger.info("Updated lead status in LeadScout", { leadId, status });
    } catch (error) {
      logger.error("Failed to update lead status in LeadScout", { leadId, status, error });
      // Don't throw - we don't want to fail the campaign if status update fails
    }
  }

  /**
   * Get a single lead by ID
   */
  async getLead(leadId: string): Promise<Lead | null> {
    try {
      const url = `${this.baseUrl}/leads/${leadId}`;

      const response = await fetch(url);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`LeadScout API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { lead?: Lead };
      return data.lead || null;
    } catch (error) {
      logger.error("Failed to fetch lead from LeadScout", { leadId, error });
      throw error;
    }
  }
}

/**
 * Create a LeadScout client from environment variables
 */
export function createLeadScoutClient(): LeadScoutClient {
  const baseUrl = process.env.LEADSCOUT_URL || "http://localhost:4021";
  const orgId = process.env.LEADSCOUT_ORG_ID;

  return new LeadScoutClient({ baseUrl, orgId });
}
