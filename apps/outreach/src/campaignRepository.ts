import { Campaign, AudienceFilters, MessageTemplate } from "@sb/schemas";
import { storage } from "@sb/storage";
import { randomUUID } from "crypto";

export interface CampaignCreateInput {
  name: string;
  audienceFilters?: AudienceFilters;
  template: MessageTemplate;
}

export interface CampaignUpdateInput {
  name?: string;
  audienceFilters?: AudienceFilters;
  template?: MessageTemplate;
}

export interface CampaignRepository {
  create(input: CampaignCreateInput): Campaign | Promise<Campaign>;
  list(): Campaign[] | Promise<Campaign[]>;
  getById(id: string): Campaign | null | Promise<Campaign | null>;
  update(id: string, update: CampaignUpdateInput): Campaign | null | Promise<Campaign | null>;
}

/**
 * Persistent storage implementation using @sb/storage
 * Supports both Supabase and local JSON file storage
 */
export class StorageCampaignRepository implements CampaignRepository {
  private readonly kind = "campaigns";

  async create(input: CampaignCreateInput): Promise<Campaign> {
    const now = new Date().toISOString();

    const campaign: Campaign = {
      id: randomUUID(),
      name: input.name,
      audienceFilters: input.audienceFilters ?? {},
      template: input.template,
      createdAt: now,
      updatedAt: now,
    };

    await storage.upsert(this.kind, campaign);
    return campaign;
  }

  async list(): Promise<Campaign[]> {
    const campaigns = await storage.list<Campaign>(this.kind);
    // Sort by creation date, newest first
    return campaigns.sort(
      (a: Campaign, b: Campaign) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getById(id: string): Promise<Campaign | null> {
    return storage.get<Campaign>(this.kind, id);
  }

  async update(
    id: string,
    update: CampaignUpdateInput
  ): Promise<Campaign | null> {
    const existing = await storage.get<Campaign>(this.kind, id);
    if (!existing) {
      return null;
    }

    const updated: Campaign = {
      ...existing,
      name: update.name ?? existing.name,
      audienceFilters: update.audienceFilters ?? existing.audienceFilters,
      template: update.template ?? existing.template,
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert(this.kind, updated);
    return updated;
  }
}
