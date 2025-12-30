import http from "http";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import {
  LeadSourceSchema,
  LeadStatusSchema,
  type Lead,
} from "@sb/schemas";
import { getSuiteApp } from "@sb/suite";
import {
  StorageLeadRepository,
  type LeadCreateInput,
  type LeadFilters,
  type LeadUpdateInput,
} from "./leadRepository";

const suiteApp = getSuiteApp("leadscout");
const port = Number(process.env.PORT ?? suiteApp.defaultPort);
const repository = new StorageLeadRepository();

const createLeadSchema = z.object({
  orgId: z.string(),
  url: z.string().url(),
  companyName: z.string().optional(),
  source: LeadSourceSchema,
  status: LeadStatusSchema.optional(),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const updateLeadSchema = z
  .object({
    status: LeadStatusSchema.optional(),
    score: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
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

function parseFilters(url: URL): LeadFilters | { error: string } {
  const filters: LeadFilters = {};
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const minScore = url.searchParams.get("min_score");

  if (status) {
    const parsedStatus = LeadStatusSchema.safeParse(status);
    if (!parsedStatus.success) {
      return { error: "Invalid status filter" };
    }
    filters.status = parsedStatus.data;
  }

  if (source) {
    const parsedSource = LeadSourceSchema.safeParse(source);
    if (!parsedSource.success) {
      return { error: "Invalid source filter" };
    }
    filters.source = parsedSource.data;
  }

  if (minScore) {
    const parsed = Number(minScore);
    if (Number.isNaN(parsed)) {
      return { error: "Invalid min_score filter" };
    }
    filters.minScore = parsed;
  }

  return filters;
}

function extractLeadId(pathname: string): string | null {
  const match = pathname.match(/^\/leads\/([^/]+)$/);
  return match?.[1] ?? null;
}

async function seedLeads(): Promise<Lead[]> {
  const samples: LeadCreateInput[] = [
    {
      orgId: "org-demo",
      url: "https://acme.example.com",
      companyName: "Acme Co",
      source: "manual",
      score: 82,
      status: "new",
      notes: "Inbound request for demo.",
    },
    {
      orgId: "org-demo",
      url: "https://globex.example.com",
      companyName: "Globex",
      source: "referral",
      score: 74,
      status: "contacted",
      notes: "Referred by partner network.",
    },
    {
      orgId: "org-demo",
      url: "https://initech.example.com",
      companyName: "Initech",
      source: "scrape",
      score: 65,
      status: "qualified",
      notes: "High traffic landing page.",
    },
  ];

  return Promise.all(samples.map((sample) => repository.create(sample)));
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

  if (req.method === "POST" && url.pathname === "/dev/seed") {
    if (process.env.NODE_ENV !== "development") {
      sendNotFound(res);
      return;
    }

    const seeded = await seedLeads();
    sendJson(res, 201, { seeded });
    return;
  }

  if (req.method === "POST" && url.pathname === "/leads") {
    let payload: unknown;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const parsed = createLeadSchema.safeParse(payload);
    if (!parsed.success) {
      sendJson(res, 400, {
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }

    const lead = await repository.create(parsed.data);
    sendJson(res, 201, { lead });
    return;
  }

  if (req.method === "GET" && url.pathname === "/leads") {
    const filters = parseFilters(url);
    if ("error" in filters) {
      sendJson(res, 400, { error: filters.error });
      return;
    }

    const leads = await repository.list(filters);
    sendJson(res, 200, { leads });
    return;
  }

  const leadId = extractLeadId(url.pathname);
  if (leadId && req.method === "GET") {
    const lead = await repository.getById(leadId);
    if (!lead) {
      sendNotFound(res);
      return;
    }

    sendJson(res, 200, { lead });
    return;
  }

  if (leadId && req.method === "PATCH") {
    let payload: unknown;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const parsed = updateLeadSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      sendJson(res, 400, {
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }

    const updated = await repository.update(leadId, parsed.data as LeadUpdateInput);
    if (!updated) {
      sendNotFound(res);
      return;
    }

    sendJson(res, 200, { lead: updated });
    return;
  }

  sendNotFound(res);
});

server.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
});
