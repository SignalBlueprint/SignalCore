/**
 * Lead domain schemas
 */

/**
 * Lead status
 */
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

/**
 * Lead entity
 */
export interface Lead {
  id: string;
  orgId: string;
  url: string;
  companyName?: string;
  score?: number;
  status?: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

