import type { Lead } from "@sb/schemas";

console.log("[leadscout] booted (skeleton). See docs/SUITE_MAP.md");

// Example: Lead schema is available for use
const exampleLead: Lead = {
  id: "example",
  orgId: "org1",
  url: "https://example.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

console.log("Lead schema imported successfully:", exampleLead.id);
