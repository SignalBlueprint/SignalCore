import { SiteProject, GenerationJob } from "@sb/schemas";
import { storage } from "@sb/storage";

/**
 * Repository for SiteProject entities
 */
export class ProjectRepository {
  private readonly kind = "projects";

  async create(project: SiteProject): Promise<SiteProject> {
    await storage.upsert(this.kind, project);
    return project;
  }

  async list(): Promise<SiteProject[]> {
    return storage.list<SiteProject>(this.kind);
  }

  async getById(id: string): Promise<SiteProject | null> {
    return storage.get<SiteProject>(this.kind, id);
  }

  async update(project: SiteProject): Promise<SiteProject> {
    await storage.upsert(this.kind, project);
    return project;
  }

  async remove(id: string): Promise<boolean> {
    return storage.remove(this.kind, id);
  }
}

/**
 * Repository for GenerationJob entities
 */
export class GenerationJobRepository {
  private readonly kind = "generation_jobs";

  async create(job: GenerationJob): Promise<GenerationJob> {
    await storage.upsert(this.kind, job);
    return job;
  }

  async list(): Promise<GenerationJob[]> {
    return storage.list<GenerationJob>(this.kind);
  }

  async getById(id: string): Promise<GenerationJob | null> {
    return storage.get<GenerationJob>(this.kind, id);
  }

  async update(job: GenerationJob): Promise<GenerationJob> {
    await storage.upsert(this.kind, job);
    return job;
  }

  async remove(id: string): Promise<boolean> {
    return storage.remove(this.kind, id);
  }
}
