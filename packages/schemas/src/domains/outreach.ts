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

export const CampaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
]);

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  audienceFilters: AudienceFiltersSchema,
  template: MessageTemplateSchema,
  status: CampaignStatusSchema.default("draft"),
  sentCount: z.number().default(0),
  failedCount: z.number().default(0),
  lastSentAt: z.string().optional(),
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

export const EmailSendHistorySchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  leadId: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.enum(["sent", "failed", "bounced", "delivered", "opened", "clicked"]),
  messageId: z.string().optional(),
  error: z.string().optional(),
  sentAt: z.string(),
  deliveredAt: z.string().optional(),
  openedAt: z.string().optional(),
  clickedAt: z.string().optional(),
});

export type EmailSendHistory = z.infer<typeof EmailSendHistorySchema>;
