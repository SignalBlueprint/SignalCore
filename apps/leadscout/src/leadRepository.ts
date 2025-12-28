import { Lead, LeadSource, LeadStatus } from "@sb/schemas";
import { randomUUID } from "crypto";

export interface LeadCreateInput {
  orgId: string;
  url: string;
  companyName?: string;
  source: LeadSource;
  status?: LeadStatus;
  score?: number;
  notes?: string;
}

export interface LeadUpdateInput {
  status?: LeadStatus;
  score?: number;
  notes?: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  minScore?: number;
}

export interface LeadRepository {
  create(input: LeadCreateInput): Lead;
  list(filters?: LeadFilters): Lead[];
  getById(id: string): Lead | null;
  update(id: string, update: LeadUpdateInput): Lead | null;
}

// TODO: Swap this in-memory implementation for @sb/db-backed storage.
export class InMemoryLeadRepository implements LeadRepository {
  private readonly leads = new Map<string, Lead>();

  create(input: LeadCreateInput): Lead {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: `lead-${randomUUID()}`,
      orgId: input.orgId,
      url: input.url,
      companyName: input.companyName,
      source: input.source,
      score: input.score,
      status: input.status ?? "new",
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(lead.id, lead);
    return lead;
  }

  list(filters: LeadFilters = {}): Lead[] {
    const leads = Array.from(this.leads.values());
    return leads.filter((lead) => {
      if (filters.status && lead.status !== filters.status) {
        return false;
      }
      if (filters.source && lead.source !== filters.source) {
        return false;
      }
      if (filters.minScore !== undefined) {
        const leadScore = lead.score ?? 0;
        if (leadScore < filters.minScore) {
          return false;
        }
      }
      return true;
    });
  }

  getById(id: string): Lead | null {
    return this.leads.get(id) ?? null;
  }

  update(id: string, update: LeadUpdateInput): Lead | null {
    const existing = this.leads.get(id);
    if (!existing) {
      return null;
    }

    const updated: Lead = {
      ...existing,
      status: update.status ?? existing.status,
      score: update.score ?? existing.score,
      notes: update.notes ?? existing.notes,
      updatedAt: new Date().toISOString(),
    };

    this.leads.set(id, updated);
    return updated;
  }
}
