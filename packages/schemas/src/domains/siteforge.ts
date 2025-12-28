/**
 * SiteForge domain schemas
 */

export type SiteProjectStatus = "draft" | "queued" | "generating" | "ready";

export interface SiteProject {
  id: string;
  businessName: string;
  domain: string;
  niche: string;
  notes?: string;
  status: SiteProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export type GenerationJobStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  projectId: string;
  status: GenerationJobStatus;
  createdAt: string;
  updatedAt: string;
}
