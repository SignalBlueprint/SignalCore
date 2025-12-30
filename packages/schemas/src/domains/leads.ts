/**
 * Lead domain schemas
 */

import { z } from "zod";

/**
 * Lead status
 */
export const LeadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export type LeadStatus = z.infer<typeof LeadStatusSchema>;

/**
 * Lead source
 */
export const LeadSourceSchema = z.enum([
  "manual",
  "import",
  "scrape",
  "referral",
  "partner",
]);

export type LeadSource = z.infer<typeof LeadSourceSchema>;

/**
 * Lead intelligence data from AI analysis
 */
export const LeadIntelligenceSchema = z.object({
  companySize: z.enum(["startup", "small", "medium", "enterprise", "unknown"]).optional(),
  industry: z.string().optional(),
  estimatedRevenue: z.string().optional(),
  fundingStatus: z.enum(["bootstrapped", "seed", "series-a", "series-b+", "public", "unknown"]).optional(),
  qualificationLevel: z.enum(["high", "medium", "low"]),
  qualificationReason: z.string(),
  keyInsights: z.array(z.string()),
  techStack: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()),
  opportunities: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  confidence: z.number(),
  analyzedAt: z.string(),
  modelUsed: z.string(),
});

export type LeadIntelligence = z.infer<typeof LeadIntelligenceSchema>;

/**
 * Lead entity
 */
export const LeadSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  url: z.string().url(),
  companyName: z.string().optional(),
  score: z.number().optional(),
  status: LeadStatusSchema.optional(),
  source: LeadSourceSchema,
  notes: z.string().optional(),
  intelligence: LeadIntelligenceSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Lead = z.infer<typeof LeadSchema>;
