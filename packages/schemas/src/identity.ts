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
  email: string;
  role: Role;
  workingGeniusProfile?: WorkingGeniusProfile;
  dailyCapacityMinutes?: number; // Daily work capacity in minutes (e.g., 480 = 8 hours)
  createdAt: string;
  updatedAt: string;
}

