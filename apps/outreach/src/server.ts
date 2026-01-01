import http from "http";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  AudienceFiltersSchema,
  MessageTemplateSchema,
  type AudienceFilters,
  type Campaign,
  type CompiledMessage,
  type MessageTemplate,
} from "@sb/schemas";
import { getSuiteApp } from "@sb/suite";
import { StorageCampaignRepository } from "./campaignRepository";
import { executeCampaign, getCampaignHistory } from "./campaignService";
import { handleSendGridWebhook } from "./webhookHandler";
import { createLeadScoutClient } from "./leadscoutClient";
import { LeadScoutLeadProvider, type LeadProfile, type LeadProvider } from "./leadscoutProvider";

class MockLeadProvider implements LeadProvider {
  private leads: LeadProfile[];

  constructor() {
    this.leads = [
      {
        id: "lead-1",
        email: "contact@acme.example.com",
        businessName: "Acme Co",
        domain: "acme.example.com",
        painPoint: "retention dips after onboarding",
        industry: "saas",
        score: 82,
        tags: ["growth", "onboarding"],
      },
      {
        id: "lead-2",
        email: "hello@globex.example.com",
        businessName: "Globex",
        domain: "globex.example.com",
        painPoint: "manual lead triage",
        industry: "finance",
        score: 71,
        tags: ["ops", "automation"],
      },
      {
        id: "lead-3",
        email: "info@initech.example.com",
        businessName: "Initech",
        domain: "initech.example.com",
        painPoint: "slow demo-to-close handoff",
        industry: "saas",
        score: 64,
        tags: ["sales", "handoff"],
      },
    ];
  }

  async getLeads(filters: AudienceFilters): Promise<LeadProfile[]> {
    return this.leads.filter((lead) => matchLead(lead, filters));
  }
}

const suiteApp = getSuiteApp("outreach");
const port = Number(process.env.PORT ?? suiteApp.defaultPort);

// Initialize LeadScout integration
const useLeadScout = process.env.USE_LEADSCOUT !== "false"; // Default to true
const leadProvider: LeadProvider = useLeadScout
  ? new LeadScoutLeadProvider(createLeadScoutClient())
  : new MockLeadProvider();

const repository = new StorageCampaignRepository();

const createCampaignSchema = z.object({
  name: z.string().min(1),
  audienceFilters: AudienceFiltersSchema.optional(),
  template: MessageTemplateSchema,
});

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function sendNotFound(res: http.ServerResponse): void {
  sendJson(res, 404, { error: "Not found" });
}

async function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function matchLead(lead: LeadProfile, filters: AudienceFilters): boolean {
  if (filters.industry && lead.industry !== filters.industry) {
    return false;
  }
  if (filters.minScore !== undefined && (lead.score ?? 0) < filters.minScore) {
    return false;
  }
  if (filters.maxScore !== undefined && (lead.score ?? 0) > filters.maxScore) {
    return false;
  }
  if (filters.tags && filters.tags.length > 0) {
    const leadTags = lead.tags ?? [];
    const hasAll = filters.tags.every((tag: string) => leadTags.includes(tag));
    if (!hasAll) {
      return false;
    }
  }
  return true;
}

const DEFAULT_FALLBACKS: Record<string, string> = {
  business_name: "there",
  domain: "your site",
  pain_point: "a growth bottleneck",
  industry: "your industry",
  company_size: "your company",
  funding_status: "your funding stage",
  qualification_reason: "your business needs",
  key_insight: "your growth potential",
  opportunity: "new growth opportunities",
  recommended_action: "exploring our solution",
  tech_stack: "your technology stack",
  score: "high potential",
};

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (_match, key: string) => {
    return variables[key] ?? DEFAULT_FALLBACKS[key] ?? "";
  });
}

function compileMessage(
  campaign: Campaign,
  lead: LeadProfile,
  template: MessageTemplate
): CompiledMessage {
  const variables = {
    business_name: lead.businessName ?? DEFAULT_FALLBACKS.business_name,
    domain: lead.domain ?? DEFAULT_FALLBACKS.domain,
    pain_point: lead.painPoint ?? DEFAULT_FALLBACKS.pain_point,
    industry: lead.industry ?? DEFAULT_FALLBACKS.industry,
    company_size: lead.companySize ?? DEFAULT_FALLBACKS.company_size,
    funding_status: lead.fundingStatus ?? DEFAULT_FALLBACKS.funding_status,
    qualification_reason: lead.qualificationReason ?? DEFAULT_FALLBACKS.qualification_reason,
    key_insight: lead.keyInsight ?? DEFAULT_FALLBACKS.key_insight,
    opportunity: lead.opportunity ?? DEFAULT_FALLBACKS.opportunity,
    recommended_action: lead.recommendedAction ?? DEFAULT_FALLBACKS.recommended_action,
    tech_stack: lead.techStack ?? DEFAULT_FALLBACKS.tech_stack,
    score: lead.score?.toString() ?? DEFAULT_FALLBACKS.score,
  };

  return {
    id: randomUUID(),
    campaignId: campaign.id,
    leadId: lead.id,
    subject: renderTemplate(template.subject, variables),
    body: renderTemplate(template.body, variables),
    createdAt: new Date().toISOString(),
  };
}


function extractCampaignId(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)$/);
  return match?.[1] ?? null;
}

function extractCompileCampaignId(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)\/compile$/);
  return match?.[1] ?? null;
}

function extractSendCampaignId(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)\/send$/);
  return match?.[1] ?? null;
}

function extractHistoryCampaignId(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)\/history$/);
  return match?.[1] ?? null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url ?? suiteApp.routes.base,
    `http://${req.headers.host ?? "localhost"}`
  );

  if (req.method === "GET" && url.pathname === suiteApp.routes.health) {
    sendJson(res, 200, { status: "ok", app: suiteApp.id });
    return;
  }

  // Serve static files
  if (req.method === "GET" && (url.pathname === "/" || url.pathname.startsWith("/app.js") || url.pathname.startsWith("/index.html"))) {
    const publicDir = path.join(__dirname, "..", "public");
    let filePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    filePath = path.join(publicDir, filePath);

    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType = ext === ".js" ? "application/javascript" : ext === ".html" ? "text/html" : "text/plain";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
      return;
    } catch (error) {
      // File not found, continue to API routes
    }
  }

  if (req.method === "POST" && url.pathname === "/campaigns") {
    let payload: unknown;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const parsed = createCampaignSchema.safeParse(payload);
    if (!parsed.success) {
      sendJson(res, 400, {
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }

    const campaign = await repository.create({
      name: parsed.data.name,
      audienceFilters: parsed.data.audienceFilters ?? {},
      template: parsed.data.template,
    });
    sendJson(res, 201, { campaign });
    return;
  }

  if (req.method === "GET" && url.pathname === "/campaigns") {
    const campaigns = await repository.list();
    sendJson(res, 200, { campaigns });
    return;
  }

  const compileId = extractCompileCampaignId(url.pathname);
  if (req.method === "POST" && compileId) {
    const campaign = await repository.getById(compileId);
    if (!campaign) {
      sendNotFound(res);
      return;
    }

    const leads = await leadProvider.getLeads(campaign.audienceFilters);
    const messages = leads.map((lead) =>
      compileMessage(campaign, lead, campaign.template)
    );
    sendJson(res, 200, { messages });
    return;
  }

  const sendId = extractSendCampaignId(url.pathname);
  if (req.method === "POST" && sendId) {
    const campaign = await repository.getById(sendId);
    if (!campaign) {
      sendNotFound(res);
      return;
    }

    // Get leads matching campaign filters
    const leads = await leadProvider.getLeads(campaign.audienceFilters);

    if (leads.length === 0) {
      sendJson(res, 400, {
        error: "No leads matched the campaign filters",
        filters: campaign.audienceFilters,
      });
      return;
    }

    try {
      // Execute campaign
      const result = await executeCampaign(campaign, leads);

      sendJson(res, 200, {
        message: "Campaign sent successfully",
        result,
      });
    } catch (error) {
      sendJson(res, 500, {
        error: "Failed to send campaign",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  const historyId = extractHistoryCampaignId(url.pathname);
  if (req.method === "GET" && historyId) {
    try {
      const history = await getCampaignHistory(historyId);
      sendJson(res, 200, { history });
    } catch (error) {
      sendJson(res, 500, {
        error: "Failed to retrieve campaign history",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  // SendGrid webhook endpoint
  if (req.method === "POST" && url.pathname === "/webhooks/sendgrid") {
    let payload: unknown;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    if (!Array.isArray(payload)) {
      sendJson(res, 400, { error: "Expected array of events" });
      return;
    }

    try {
      await handleSendGridWebhook(payload);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  const campaignId = extractCampaignId(url.pathname);
  if (req.method === "GET" && campaignId) {
    const campaign = await repository.getById(campaignId);
    if (!campaign) {
      sendNotFound(res);
      return;
    }
    sendJson(res, 200, { campaign });
    return;
  }

  sendNotFound(res);
});

server.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
});
