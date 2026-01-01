/**
 * Lexome Server - AI-enhanced e-reader for Project Gutenberg
 */

import "@sb/config";
import express from "express";
import * as path from "path";
import { getSuiteApp } from "@sb/suite";
import booksRouter from "./routes/books";
import libraryRouter from "./routes/library";

const app = express();
const suiteApp = getSuiteApp("lexome");
const PORT = Number(process.env.PORT ?? suiteApp.defaultPort);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// API Routes
app.use("/api/books", booksRouter);
app.use("/api/library", libraryRouter);

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
