/**
 * Lexome Server - AI-enhanced e-reader for Project Gutenberg
 */

import "@sb/config";
import express from "express";
import * as path from "path";
import { getSuiteApp } from "@sb/suite";
import booksRouter from "./routes/books";
import libraryRouter from "./routes/library";
import sessionsRouter from "./routes/sessions";
import annotationsRouter from "./routes/annotations";
import aiRouter from "./routes/ai";

const app = express();
const suiteApp = getSuiteApp("lexome");
const PORT = Number(process.env.PORT ?? suiteApp.defaultPort);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// API Routes
app.use("/api/books", booksRouter);
app.use("/api/library", libraryRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/annotations", annotationsRouter);
app.use("/api/ai", aiRouter);

// Health check
app.get(suiteApp.routes.health, (req, res) => {
  res.status(200).json({
    status: "ok",
    app: suiteApp.id,
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint - API info
app.get("/api", (req, res) => {
  res.json({
    name: "Lexome API",
    version: "0.1.0",
    description: "AI-enhanced e-reader for Project Gutenberg",
    endpoints: {
      books: {
        search: "GET /api/books/search?q=<query>",
        popular: "GET /api/books/popular",
        category: "GET /api/books/category/:category",
        details: "GET /api/books/:id",
        content: "GET /api/books/:id/content",
      },
      library: {
        list: "GET /api/library",
        add: "POST /api/library/books",
        update: "PATCH /api/library/books/:id",
        remove: "DELETE /api/library/books/:id",
        stats: "GET /api/library/stats",
      },
      sessions: {
        start: "POST /api/sessions/start",
        end: "POST /api/sessions/:id/end",
        history: "GET /api/sessions/history",
        stats: "GET /api/sessions/stats",
        active: "GET /api/sessions/active/:bookId",
      },
      annotations: {
        list: "GET /api/annotations",
        book: "GET /api/annotations/book/:bookId",
        create: "POST /api/annotations",
        update: "PATCH /api/annotations/:id",
        delete: "DELETE /api/annotations/:id",
        search: "GET /api/annotations/search?q=<query>",
        tags: "GET /api/annotations/tags",
        stats: "GET /api/annotations/stats",
      },
      ai: {
        explain: "POST /api/ai/explain",
        translate: "POST /api/ai/translate",
        define: "POST /api/ai/define",
        summarize: "POST /api/ai/summarize",
        analyzeCharacter: "POST /api/ai/analyze-character",
        questions: "POST /api/ai/questions",
        recommendations: "GET /api/ai/recommendations",
      },
    },
  });
});

// Serve index.html for all other routes (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `[${suiteApp.id}] Lexome server running on http://localhost:${PORT}${suiteApp.routes.base}`
  );
  console.log(`[${suiteApp.id}] API documentation: http://localhost:${PORT}/api`);
});
