/**
 * LeadScout Lead Provider
 * Fetches leads from LeadScout API and maps them to Outreach LeadProfile format
 */

import type { Lead } from "@sb/schemas";
import type { AudienceFilters } from "@sb/schemas";
import { LeadScoutClient } from "./leadscoutClient";
import { logger } from "@sb/logger";

export interface LeadProfile {
  id: string;
  email: string;
  businessName?: string;
  domain?: string;
  painPoint?: string;
  industry?: string;
  score?: number;
  tags?: string[];
  // LeadScout intelligence-based fields
  companySize?: string;
  fundingStatus?: string;
  qualificationReason?: string;
  keyInsight?: string;
  opportunity?: string;
  recommendedAction?: string;
  techStack?: string;
}

export interface LeadProvider {
  getLeads(filters: AudienceFilters): Promise<LeadProfile[]>;
}

/**
 * Derives an email address from a company URL
 * Uses common email patterns like contact@, hello@, info@
 */
function deriveEmailFromUrl(url: string, companyName?: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");

    // Try to use a professional prefix based on context
    const prefixes = ["contact", "hello", "info", "sales"];
    const prefix = prefixes[0]; // Default to "contact"

    return `${prefix}@${domain}`;
  } catch (error) {
    logger.warn("Failed to derive email from URL", { url, error });
    return "contact@example.com"; // Fallback
  }
}

/**
 * Maps a LeadScout Lead to an Outreach LeadProfile
 */
function mapLeadToProfile(lead: Lead): LeadProfile {
  // Derive email from URL
  const email = deriveEmailFromUrl(lead.url, lead.companyName);

  // Extract domain from URL
  let domain: string | undefined;
  try {
    const urlObj = new URL(lead.url);
    domain = urlObj.hostname.replace(/^www\./, "");
  } catch (error) {
    domain = lead.url;
  }

  // Determine pain point from intelligence
  let painPoint: string | undefined;
  if (lead.intelligence) {
    // Use qualification reason as pain point
    painPoint = lead.intelligence.qualificationReason;

    // Or use first opportunity
    if (!painPoint && lead.intelligence.opportunities.length > 0) {
      painPoint = lead.intelligence.opportunities[0];
    }
  }

  // Get industry from intelligence
  const industry = lead.intelligence?.industry;

  // Create tags from various sources
  const tags: string[] = [];

  // Add source as tag
  tags.push(lead.source);

  // Add status as tag if available
  if (lead.status) {
    tags.push(lead.status);
  }

  // Add qualification level as tag
  if (lead.intelligence?.qualificationLevel) {
    tags.push(`qual-${lead.intelligence.qualificationLevel}`);
  }

  // Add company size as tag
  if (lead.intelligence?.companySize) {
    tags.push(`size-${lead.intelligence.companySize}`);
  }

  // Add key insights as tags
  if (lead.intelligence?.keyInsights) {
    tags.push(...lead.intelligence.keyInsights.slice(0, 3)); // Limit to 3 insights
  }

  return {
    id: lead.id,
    email,
    businessName: lead.companyName,
    domain,
    painPoint,
    industry,
    score: lead.score,
    tags,
    // Add intelligence-based fields for richer templating
    companySize: lead.intelligence?.companySize,
    fundingStatus: lead.intelligence?.fundingStatus,
    qualificationReason: lead.intelligence?.qualificationReason,
    keyInsight: lead.intelligence?.keyInsights?.[0],
    opportunity: lead.intelligence?.opportunities?.[0],
    recommendedAction: lead.intelligence?.recommendedActions?.[0],
    techStack: lead.intelligence?.techStack?.join(", "),
  };
}

/**
 * Checks if a lead matches the audience filters
 */
function matchLead(profile: LeadProfile, filters: AudienceFilters): boolean {
  // Filter by industry
  if (filters.industry && profile.industry !== filters.industry) {
    return false;
  }

  // Filter by minimum score
  if (filters.minScore !== undefined && (profile.score ?? 0) < filters.minScore) {
    return false;
  }

  // Filter by maximum score
  if (filters.maxScore !== undefined && (profile.score ?? 0) > filters.maxScore) {
    return false;
  }

  // Filter by tags (all tags must match)
  if (filters.tags && filters.tags.length > 0) {
    const profileTags = profile.tags ?? [];
    const hasAll = filters.tags.every((tag: string) => profileTags.includes(tag));
    if (!hasAll) {
      return false;
    }
  }

  return true;
}

export class LeadScoutLeadProvider implements LeadProvider {
  private client: LeadScoutClient;

  constructor(client: LeadScoutClient) {
    this.client = client;
  }

  async getLeads(filters: AudienceFilters): Promise<LeadProfile[]> {
    try {
      // Fetch leads from LeadScout API
      // We can pass minScore filter to LeadScout API to reduce data transfer
      const leadFilters: any = {};

      if (filters.minScore !== undefined) {
        leadFilters.minScore = filters.minScore;
      }

      const leads = await this.client.getLeads(leadFilters);

      logger.info("Fetched leads from LeadScout", {
        total: leads.length,
        filters: leadFilters,
      });

      // Map leads to profiles
      const profiles = leads.map(mapLeadToProfile);

      // Apply client-side filtering for industry and tags
      const filtered = profiles.filter((profile) => matchLead(profile, filters));

      logger.info("Filtered leads for campaign", {
        total: profiles.length,
        matched: filtered.length,
        filters,
      });

      return filtered;
    } catch (error) {
      logger.error("Failed to get leads from LeadScout", { error });
      throw error;
    }
  }
}
