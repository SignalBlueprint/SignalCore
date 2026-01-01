/**
 * Campaign execution service
 * Handles sending campaign emails and tracking delivery
 */

import { sendBulkEmails, type EmailMessage, type EmailResult } from "@sb/notify";
import { storage } from "@sb/storage";
import { randomUUID } from "crypto";
import type { Campaign, EmailSendHistory } from "@sb/schemas";
import { StorageCampaignRepository } from "./campaignRepository";
import { logger } from "@sb/logger";

export interface LeadWithEmail {
  id: string;
  email: string;
  businessName?: string;
  domain?: string;
  painPoint?: string;
  industry?: string;
}

export interface CampaignExecutionResult {
  campaignId: string;
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  history: EmailSendHistory[];
}

const DEFAULT_FALLBACKS: Record<string, string> = {
  business_name: "there",
  domain: "your site",
  pain_point: "a growth bottleneck",
  industry: "your industry",
};

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (_match, key: string) => {
    return variables[key] ?? DEFAULT_FALLBACKS[key] ?? "";
  });
}

/**
 * Execute a campaign by sending emails to all matched leads
 */
export async function executeCampaign(
  campaign: Campaign,
  leads: LeadWithEmail[],
  onProgress?: (sent: number, total: number) => void
): Promise<CampaignExecutionResult> {
  const repository = new StorageCampaignRepository();
  const history: EmailSendHistory[] = [];
  let sentCount = 0;
  let failedCount = 0;

  logger.info(`Executing campaign: ${campaign.name}`, {
    campaignId: campaign.id,
    totalLeads: leads.length,
  });

  // Prepare email messages
  const messages: EmailMessage[] = leads.map((lead) => {
    const variables = {
      business_name: lead.businessName ?? DEFAULT_FALLBACKS.business_name,
      domain: lead.domain ?? DEFAULT_FALLBACKS.domain,
      pain_point: lead.painPoint ?? DEFAULT_FALLBACKS.pain_point,
      industry: lead.industry ?? DEFAULT_FALLBACKS.industry,
    };

    const subject = renderTemplate(campaign.template.subject, variables);
    const body = renderTemplate(campaign.template.body, variables);

    return {
      to: lead.email,
      subject,
      html: body.replace(/\n/g, "<br>"),
      text: body,
      customArgs: {
        campaignId: campaign.id,
        leadId: lead.id,
      },
      categories: ["campaign", `campaign-${campaign.id}`],
    };
  });

  // Send emails in bulk
  const results = await sendBulkEmails(messages, (sent, total) => {
    if (onProgress) {
      onProgress(sent, total);
    }
  });

  // Process results and create history
  const now = new Date().toISOString();
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const lead = leads[i];
    const message = messages[i];

    const historyEntry: EmailSendHistory = {
      id: randomUUID(),
      campaignId: campaign.id,
      leadId: lead.id,
      to: lead.email,
      subject: message.subject,
      body: message.text || "",
      status: result.success ? "sent" : "failed",
      messageId: result.messageId,
      error: result.error,
      sentAt: now,
    };

    await storage.upsert("email_send_history", historyEntry);
    history.push(historyEntry);

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  // Update campaign statistics
  await repository.update(campaign.id, {
    sentCount: campaign.sentCount + sentCount,
    failedCount: campaign.failedCount + failedCount,
    lastSentAt: now,
    status: "active",
  });

  logger.info(`Campaign execution completed`, {
    campaignId: campaign.id,
    sentCount,
    failedCount,
    totalLeads: leads.length,
  });

  return {
    campaignId: campaign.id,
    totalLeads: leads.length,
    sentCount,
    failedCount,
    history,
  };
}

/**
 * Get email send history for a campaign
 */
export async function getCampaignHistory(
  campaignId: string
): Promise<EmailSendHistory[]> {
  const allHistory = await storage.list<EmailSendHistory>("email_send_history");
  return allHistory.filter((h) => h.campaignId === campaignId);
}

/**
 * Get email send history for a specific lead
 */
export async function getLeadHistory(leadId: string): Promise<EmailSendHistory[]> {
  const allHistory = await storage.list<EmailSendHistory>("email_send_history");
  return allHistory.filter((h) => h.leadId === leadId);
}
