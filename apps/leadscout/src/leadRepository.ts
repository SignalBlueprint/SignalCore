import { Lead, LeadSource, LeadStatus } from "@sb/schemas";
import { storage } from "@sb/storage";
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
  create(input: LeadCreateInput): Lead | Promise<Lead>;
  list(filters?: LeadFilters): Lead[] | Promise<Lead[]>;
  getById(id: string): Lead | null | Promise<Lead | null>;
  update(id: string, update: LeadUpdateInput): Lead | null | Promise<Lead | null>;
}

// In-memory implementation for testing/development
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

/**
 * Persistent storage implementation using @sb/storage
 * Supports both Supabase and local JSON file storage
 */
export class StorageLeadRepository implements LeadRepository {
  private readonly kind = "leads";

  async create(input: LeadCreateInput): Promise<Lead> {
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

    await storage.upsert(this.kind, lead);
    return lead;
  }

  async list(filters: LeadFilters = {}): Promise<Lead[]> {
    const leads = await storage.list<Lead>(this.kind, (lead) => {
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
    return leads;
  }

  async getById(id: string): Promise<Lead | null> {
    return storage.get<Lead>(this.kind, id);
  }

  async update(id: string, update: LeadUpdateInput): Promise<Lead | null> {
    const existing = await storage.get<Lead>(this.kind, id);
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

    await storage.upsert(this.kind, updated);
    return updated;
  }
}
