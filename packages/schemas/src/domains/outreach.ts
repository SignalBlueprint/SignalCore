/**
 * Outreach domain schemas
 */

import { z } from "zod";

export const AudienceFiltersSchema = z.object({
  industry: z.string().optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export type AudienceFilters = z.infer<typeof AudienceFiltersSchema>;

export const MessageTemplateSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  audienceFilters: AudienceFiltersSchema,
  template: MessageTemplateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const CompiledMessageSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  leadId: z.string(),
  subject: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export type CompiledMessage = z.infer<typeof CompiledMessageSchema>;
