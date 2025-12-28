import http from "http";
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

interface LeadProfile {
  id: string;
  businessName?: string;
  domain?: string;
  painPoint?: string;
  industry?: string;
  score?: number;
  tags?: string[];
}

interface LeadProvider {
  getLeads(filters: AudienceFilters): Promise<LeadProfile[]>;
}

class MockLeadProvider implements LeadProvider {
  private leads: LeadProfile[];

  constructor() {
    this.leads = [
      {
        id: "lead-1",
        businessName: "Acme Co",
        domain: "acme.example.com",
        painPoint: "retention dips after onboarding",
        industry: "saas",
        score: 82,
        tags: ["growth", "onboarding"],
      },
      {
        id: "lead-2",
        businessName: "Globex",
        domain: "globex.example.com",
        painPoint: "manual lead triage",
        industry: "finance",
        score: 71,
        tags: ["ops", "automation"],
      },
      {
        id: "lead-3",
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
const leadProvider = new MockLeadProvider();
const campaigns: Campaign[] = [];

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
    const hasAll = filters.tags.every((tag) => leadTags.includes(tag));
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

function createCampaign(
  name: string,
  audienceFilters: AudienceFilters,
  template: MessageTemplate
): Campaign {
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: randomUUID(),
    name,
    audienceFilters,
    template,
    createdAt: now,
    updatedAt: now,
  };
  campaigns.push(campaign);
  return campaign;
}

function findCampaign(id: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.id === id);
}

function extractCampaignId(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)$/);
  return match?.[1] ?? null;
}

function extractCompileCampaignId(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)\/compile$/);
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

    const campaign = createCampaign(
      parsed.data.name,
      parsed.data.audienceFilters ?? {},
      parsed.data.template
    );
    sendJson(res, 201, { campaign });
    return;
  }

  if (req.method === "GET" && url.pathname === "/campaigns") {
    sendJson(res, 200, { campaigns });
    return;
  }

  const compileId = extractCompileCampaignId(url.pathname);
  if (req.method === "POST" && compileId) {
    const campaign = findCampaign(compileId);
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

  const campaignId = extractCampaignId(url.pathname);
  if (req.method === "GET" && campaignId) {
    const campaign = findCampaign(campaignId);
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
