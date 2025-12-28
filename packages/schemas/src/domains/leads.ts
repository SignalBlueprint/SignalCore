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
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Lead = z.infer<typeof LeadSchema>;
