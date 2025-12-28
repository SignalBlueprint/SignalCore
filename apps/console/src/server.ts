/**
 * Console Server - Suite hub UI
 */

// Load environment variables from root .env file
// This is done automatically via @sb/config, but we import it here to ensure it loads
import "@sb/config";

import express from "express";
import * as path from "path";
import { SUITE_APPS, getSuiteApp } from "@sb/suite";
import { readEvents } from "@sb/events";
import { getTelemetryState } from "@sb/telemetry";

const app = express();
const suiteApp = getSuiteApp("console");
const PORT = Number(process.env.PORT ?? suiteApp.defaultPort);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// API Routes

// Get suite apps
app.get("/api/apps", (req, res) => {
  res.json(SUITE_APPS);
});

app.get(suiteApp.routes.health, (req, res) => {
  res.status(200).json({ status: "ok", app: suiteApp.id });
});

// Get latest events (last 200)
app.get("/api/events", (req, res) => {
  try {
    const events = readEvents(200);
    res.json(events);
  } catch (error) {
    console.error("Error reading events:", error);
    res.status(500).json({ error: "Failed to read events" });
  }
});

// Get telemetry state
app.get("/api/telemetry", (req, res) => {
  try {
    const state = getTelemetryState();
    res.json(state);
  } catch (error) {
    console.error("Error getting telemetry:", error);
    res.status(500).json({ error: "Failed to get telemetry" });
  }
});

// Serve index.html for all other routes (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${PORT}${suiteApp.routes.base}`
  );
});
