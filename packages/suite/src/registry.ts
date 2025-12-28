/**
 * Suite Registry
 * Single source of truth for all apps in the Signal Blueprint suite
 */

export type AppId =
  | "questboard"
  | "leadscout"
  | "siteforge"
  | "catalog"
  | "outreach"
  | "console"
  | "demoapp";

export interface SuiteApp {
  id: AppId;
  title: string;
  purpose: string;
  status: "skeleton" | "wip" | "beta" | "prod";
  owners: string[];
}

export const SUITE_APPS: SuiteApp[] = [
  {
    id: "questboard",
    title: "Questboard",
    purpose:
      "Questline task system combined with Working Genius team assignment, orchestrated by daily Questmaster role",
    status: "skeleton",
    owners: ["@signal-blueprint/questboard-owners"],
  },
  {
    id: "leadscout",
    title: "LeadScout",
    purpose: "Lead discovery and qualification system",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
  {
    id: "siteforge",
    title: "SiteForge",
    purpose: "Website generation and management platform",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
  {
    id: "catalog",
    title: "Catalog",
    purpose: "Product catalog and inventory management",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
  {
    id: "outreach",
    title: "Outreach",
    purpose: "Outreach campaign management and automation",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
  {
    id: "console",
    title: "Console",
    purpose: "Unified admin console for suite management",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
  {
    id: "demoapp",
    title: "Demoapp",
    purpose: "[Add purpose description]",
    status: "skeleton",
    owners: ["@signal-blueprint/platform"],
  },
];
