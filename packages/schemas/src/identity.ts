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
 * Member entity (organization membership)
 */
export interface Member {
  id: string;
  orgId: string;
  name?: string; // Display name
  email: string;
  role: Role;
  avatar?: string; // Avatar emoji or URL
  workingGeniusProfile?: WorkingGeniusProfile;
  dailyCapacityMinutes?: number; // Daily work capacity in minutes (e.g., 480 = 8 hours)
  currentWorkloadMinutes?: number; // Current workload in minutes
  createdAt: string;
  updatedAt: string;
}

