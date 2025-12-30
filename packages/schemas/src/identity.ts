/**
 * Identity and organization schemas
 */

import type { Role } from "@sb/rbac";
import type { WorkingGeniusProfile } from "./questboard";

/**
 * Organization entity
 */
export interface Org {
  id: string;
  name: string;
  notificationSettings?: {
    slackChannelId?: string;
    slackEnabled?: boolean;
    emailEnabled?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

/**
 * Organization Profile - Rich context about the organization's identity, culture, and operating model
 * Used to provide AI with deep organizational awareness for better planning and recommendations
 */
export interface OrgProfile {
  id: string;
  orgId: string;

  // Identity
  mission?: string;
  vision?: string;
  industry?: string; // "SaaS", "E-commerce", "Consulting", "Agency", etc.
  stage?: "startup" | "growth" | "scale" | "enterprise";
  teamSize?: number;

  // Technical context
  techStack?: string[]; // ["TypeScript", "React", "Supabase", "OpenAI"]
  architecture?: string; // "monorepo", "microservices", "modular-monolith"
  repositories?: string[]; // ["SignalCore", "SignalDocs"]

  // Cultural context
  values?: string[]; // ["Move fast", "Customer-first", "Quality over speed"]
  decisionFramework?: string; // "Data-driven", "Consensus-based", "Trusted leader"
  qualityStandards?: string; // "Tests required", "Code review mandatory", "Ship and iterate"

  // Process context
  teamStructure?: "functional" | "pods" | "matrix" | "flat";
  sprintLengthDays?: number;
  currentCycle?: string; // "Q4 2025", "Sprint 12"

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Member entity (organization membership)
 */
export interface Member {
  id: string;
  orgId: string;
  email: string;
  role: Role;
  workingGeniusProfile?: WorkingGeniusProfile;
  dailyCapacityMinutes?: number; // Daily work capacity in minutes (e.g., 480 = 8 hours)
  createdAt: string;
  updatedAt: string;
}

