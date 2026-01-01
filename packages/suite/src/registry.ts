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
  | "lexome";

export type AppStatus = "skeleton" | "wip" | "beta" | "prod";

export interface SuiteApp {
  id: AppId;
  name: string;
  description: string;
  status: AppStatus;
  defaultPort: number;
  routes: {
    health: string;
    base: string;
  };
  owners: string[];
}

export const SUITE_REGISTRY = {
  questboard: {
    id: "questboard",
    name: "Questboard",
    description:
      "Questline task system combined with Working Genius team assignment, orchestrated by daily Questmaster role",
    status: "skeleton",
    defaultPort: 4020,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/questboard-owners"],
  },
  leadscout: {
    id: "leadscout",
    name: "LeadScout",
    description: "Lead discovery and qualification system",
    status: "skeleton",
    defaultPort: 4021,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/platform"],
  },
  siteforge: {
    id: "siteforge",
    name: "SiteForge",
    description: "Website generation and management platform",
    status: "skeleton",
    defaultPort: 4022,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/platform"],
  },
  catalog: {
    id: "catalog",
    name: "Catalog",
    description: "Product catalog and inventory management",
    status: "skeleton",
    defaultPort: 4023,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/platform"],
  },
  outreach: {
    id: "outreach",
    name: "Outreach",
    description: "Outreach campaign management and automation",
    status: "skeleton",
    defaultPort: 4024,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/platform"],
  },
  console: {
    id: "console",
    name: "Console",
    description: "Unified admin console for suite management",
    status: "skeleton",
    defaultPort: 4000,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/platform"],
  },
  lexome: {
    id: "lexome",
    name: "Lexome",
    description: "AI-enhanced e-reader for Project Gutenberg library with contextual assistance",
    status: "wip",
    defaultPort: 4026,
    routes: {
      base: "/",
      health: "/health",
    },
    owners: ["@signal-blueprint/platform"],
  },
} satisfies Record<AppId, SuiteApp>;

export const SUITE_APPS = Object.values(SUITE_REGISTRY);

export const getSuiteApp = (id: AppId): SuiteApp => SUITE_REGISTRY[id];
