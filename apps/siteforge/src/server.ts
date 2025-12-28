import http, { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { getSuiteApp } from "@sb/suite";
import { GenerationJob, SiteProject } from "@sb/schemas";
import { InMemoryJobQueue } from "@sb/utils";

const suiteApp = getSuiteApp("siteforge");
const port = Number(process.env.PORT ?? suiteApp.defaultPort);

const projects = new Map<string, SiteProject>();
const generationJobs = new Map<string, GenerationJob>();
const generationQueue = new InMemoryJobQueue<GenerationJob>();

const parseJsonBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  const payload = Buffer.concat(chunks).toString("utf-8");
  return JSON.parse(payload) as Record<string, unknown>;
};

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const notFound = (res: ServerResponse) => {
  sendJson(res, 404, { error: "Not Found" });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url ?? suiteApp.routes.base,
    `http://${req.headers.host ?? "localhost"}`
  );

  if (req.method === "GET" && url.pathname === suiteApp.routes.health) {
    sendJson(res, 200, { status: "ok", app: suiteApp.id });
    return;
  }

  if (req.method === "GET" && url.pathname === "/projects") {
    sendJson(res, 200, { projects: Array.from(projects.values()) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/projects") {
    try {
      const body = await parseJsonBody(req);
      const businessName = String(body?.businessName ?? "").trim();
      const domain = String(body?.domain ?? "").trim();
      const niche = String(body?.niche ?? "").trim();
      const notes = body?.notes ? String(body.notes) : undefined;

      if (!businessName || !domain || !niche) {
        sendJson(res, 400, {
          error: "Missing required fields: businessName, domain, niche",
        });
        return;
      }

      const now = new Date().toISOString();
      const project: SiteProject = {
        id: randomUUID(),
        businessName,
        domain,
        niche,
        notes,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      projects.set(project.id, project);
      sendJson(res, 201, { project });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON payload" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/projects/")) {
    const id = url.pathname.split("/")[2];
    if (!id) {
      notFound(res);
      return;
    }
    const project = projects.get(id);
    if (!project) {
      notFound(res);
      return;
    }
    sendJson(res, 200, { project });
    return;
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/projects/") &&
    url.pathname.endsWith("/generate")
  ) {
    const id = url.pathname.split("/")[2];
    if (!id) {
      notFound(res);
      return;
    }
    const project = projects.get(id);
    if (!project) {
      notFound(res);
      return;
    }
    const now = new Date().toISOString();
    const job: GenerationJob = {
      id: randomUUID(),
      projectId: project.id,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    generationJobs.set(job.id, job);
    generationQueue.enqueue(job);
    project.status = "queued";
    project.updatedAt = now;
    projects.set(project.id, project);

    // TODO: Replace with real website generation pipeline.
    sendJson(res, 202, { message: "generation job created", job });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`${suiteApp.name} skeleton server`);
});

server.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
});
