import http, { IncomingMessage, ServerResponse } from "http";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { getSuiteApp } from "@sb/suite";
import { GenerationJob, SiteProject } from "@sb/schemas";
import { InMemoryJobQueue } from "@sb/utils";
import { ProjectRepository, GenerationJobRepository } from "./repository";
import { GenerationJobProcessor } from "./job-processor";

const suiteApp = getSuiteApp("siteforge");
const port = Number(process.env.PORT ?? suiteApp.defaultPort);

const projectRepo = new ProjectRepository();
const jobRepo = new GenerationJobRepository();
const generationQueue = new InMemoryJobQueue<GenerationJob>();

// Initialize and start job processor
const jobProcessor = new GenerationJobProcessor(
  generationQueue,
  projectRepo,
  jobRepo
);
jobProcessor.start(3000); // Check for jobs every 3 seconds

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[siteforge] Shutting down...");
  jobProcessor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[siteforge] Shutting down...");
  jobProcessor.stop();
  process.exit(0);
});

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

  if (req.method === "GET" && url.pathname === "/projects") {
    const projects = await projectRepo.list();
    sendJson(res, 200, { projects });
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
      await projectRepo.create(project);
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
    const project = await projectRepo.getById(id);
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
    const project = await projectRepo.getById(id);
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
    await jobRepo.create(job);
    generationQueue.enqueue(job);
    project.status = "queued";
    project.updatedAt = now;
    await projectRepo.update(project);

    sendJson(res, 202, { message: "Generation job created and queued", job });
    return;
  }

  // Get project generation status
  if (
    req.method === "GET" &&
    url.pathname.startsWith("/projects/") &&
    url.pathname.endsWith("/status")
  ) {
    const id = url.pathname.split("/")[2];
    if (!id) {
      notFound(res);
      return;
    }
    const project = await projectRepo.getById(id);
    if (!project) {
      notFound(res);
      return;
    }

    // Get all jobs for this project
    const allJobs = await jobRepo.list();
    const projectJobs = allJobs.filter((j) => j.projectId === id);

    sendJson(res, 200, {
      projectId: id,
      status: project.status,
      error: project.error,
      hasGeneratedSite: !!project.generatedSite,
      jobs: projectJobs,
    });
    return;
  }

  // Get generated site preview (HTML)
  if (
    req.method === "GET" &&
    url.pathname.startsWith("/projects/") &&
    url.pathname.endsWith("/preview")
  ) {
    const id = url.pathname.split("/")[2];
    if (!id) {
      notFound(res);
      return;
    }
    const project = await projectRepo.getById(id);
    if (!project) {
      notFound(res);
      return;
    }

    if (!project.generatedSite) {
      sendJson(res, 404, {
        error: "No generated site available. Generate the site first.",
      });
      return;
    }

    // Return the generated HTML
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(project.generatedSite.html);
    return;
  }

  // Get generated site data (JSON)
  if (
    req.method === "GET" &&
    url.pathname.startsWith("/projects/") &&
    url.pathname.endsWith("/site")
  ) {
    const id = url.pathname.split("/")[2];
    if (!id) {
      notFound(res);
      return;
    }
    const project = await projectRepo.getById(id);
    if (!project) {
      notFound(res);
      return;
    }

    if (!project.generatedSite) {
      sendJson(res, 404, {
        error: "No generated site available. Generate the site first.",
      });
      return;
    }

    sendJson(res, 200, { generatedSite: project.generatedSite });
    return;
  }

  // List all generation jobs
  if (req.method === "GET" && url.pathname === "/jobs") {
    const jobs = await jobRepo.list();
    sendJson(res, 200, { jobs });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`${suiteApp.name} server with generation pipeline`);
});

server.listen(port, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${port}${suiteApp.routes.base}`
  );
});
