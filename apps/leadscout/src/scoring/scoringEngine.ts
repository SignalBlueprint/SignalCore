/**
 * Lead Scoring Engine
 * Configurable rules-based scoring system for lead qualification
 */

import { Lead, LeadSource } from "@sb/schemas";

/**
 * Scoring configuration with weights for different factors
 */
export interface ScoringConfig {
  sourceWeights: Record<LeadSource, number>;
  recencyWeight: number;
  urlQualityWeight: number;
  companyNameWeight: number;
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  sourceWeights: {
    manual: 50,      // User-entered leads
    import: 60,      // Bulk imported leads
    scrape: 40,      // Web-scraped leads (lower quality)
    referral: 70,    // Referred leads (higher quality)
    partner: 80,     // Partner-provided leads (highest quality)
  },
  recencyWeight: 0.15,      // 15% weight for recency
  urlQualityWeight: 0.10,   // 10% weight for URL quality
  companyNameWeight: 0.05,  // 5% weight for having company name
};

/**
 * Calculate lead score based on various factors
 */
export function calculateLeadScore(
  lead: Partial<Lead>,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  let score = 0;

  // 1. Source-based scoring (70% of total score)
  if (lead.source) {
    score = config.sourceWeights[lead.source] * 0.70;
  }

  // 2. Recency bonus (newer leads are more valuable)
  if (lead.createdAt) {
    const recencyScore = calculateRecencyScore(lead.createdAt);
    score += recencyScore * config.recencyWeight * 100;
  }

  // 3. URL quality (domain characteristics)
  if (lead.url) {
    const urlScore = calculateUrlQualityScore(lead.url);
    score += urlScore * config.urlQualityWeight * 100;
  }

  // 4. Company name presence
  if (lead.companyName && lead.companyName.trim().length > 0) {
    score += config.companyNameWeight * 100;
  }

  // Normalize to 0-100 range
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate recency score (1.0 = today, decreases over time)
 */
function calculateRecencyScore(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  // Decay function: 1.0 for today, 0.8 after 7 days, 0.5 after 30 days
  if (daysSinceCreation <= 7) {
    return 1.0;
  } else if (daysSinceCreation <= 30) {
    return 0.8 - ((daysSinceCreation - 7) / 23) * 0.3;
  } else if (daysSinceCreation <= 90) {
    return 0.5 - ((daysSinceCreation - 30) / 60) * 0.3;
  } else {
    return 0.2;
  }
}

/**
 * Calculate URL quality score based on domain characteristics
 */
function calculateUrlQualityScore(url: string): number {
  let score = 0.5; // Base score

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;

    // Bonus for custom domains (not subdomains of common platforms)
    const commonPlatforms = [
      "wordpress.com",
      "wix.com",
      "weebly.com",
      "blogspot.com",
      "tumblr.com",
      "github.io",
    ];

    const isCustomDomain = !commonPlatforms.some((platform) =>
      domain.endsWith(platform)
    );

    if (isCustomDomain) {
      score += 0.3;
    }

    // Bonus for HTTPS
    if (parsed.protocol === "https:") {
      score += 0.1;
    }

    // Penalty for very long domains (often spammy)
    if (domain.length > 40) {
      score -= 0.2;
    }

    // Bonus for professional TLDs
    const professionalTlds = [".com", ".io", ".ai", ".tech", ".app"];
    if (professionalTlds.some((tld) => domain.endsWith(tld))) {
      score += 0.1;
    }
  } catch (error) {
    // Invalid URL, return base score
    return 0.3;
  }

  return Math.min(1.0, Math.max(0, score));
}

/**
 * Get scoring explanation for a lead (for debugging/transparency)
 */
export interface ScoringBreakdown {
  totalScore: number;
  factors: {
    source: { weight: number; contribution: number };
    recency: { score: number; contribution: number };
    urlQuality: { score: number; contribution: number };
    companyName: { hasName: boolean; contribution: number };
  };
}

export function getLeadScoringBreakdown(
  lead: Partial<Lead>,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoringBreakdown {
  const sourceWeight = lead.source ? config.sourceWeights[lead.source] : 0;
  const sourceContribution = sourceWeight * 0.70;

  const recencyScore = lead.createdAt ? calculateRecencyScore(lead.createdAt) : 0;
  const recencyContribution = recencyScore * config.recencyWeight * 100;

  const urlScore = lead.url ? calculateUrlQualityScore(lead.url) : 0;
  const urlContribution = urlScore * config.urlQualityWeight * 100;

  const hasCompanyName = Boolean(lead.companyName && lead.companyName.trim().length > 0);
  const companyNameContribution = hasCompanyName ? config.companyNameWeight * 100 : 0;

  const totalScore = calculateLeadScore(lead, config);

  return {
    totalScore,
    factors: {
      source: {
        weight: sourceWeight,
        contribution: sourceContribution,
      },
      recency: {
        score: recencyScore,
        contribution: recencyContribution,
      },
      urlQuality: {
        score: urlScore,
        contribution: urlContribution,
      },
      companyName: {
        hasName: hasCompanyName,
        contribution: companyNameContribution,
      },
    },
  };
}
