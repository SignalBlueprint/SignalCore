/**
 * Background job processor for website generation
 */

import { GenerationJob } from "@sb/schemas";
import { InMemoryJobQueue } from "@sb/utils";
import { ProjectRepository, GenerationJobRepository } from "./repository";
import { generateWebsite } from "./generation-engine";

export class GenerationJobProcessor {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private queue: InMemoryJobQueue<GenerationJob>,
    private projectRepo: ProjectRepository,
    private jobRepo: GenerationJobRepository
  ) {}

  /**
   * Start processing jobs from the queue
   */
  start(intervalMs: number = 5000) {
    console.log("[job-processor] Starting job processor...");

    this.processingInterval = setInterval(() => {
      this.processNext();
    }, intervalMs);

    // Process immediately on start
    this.processNext();
  }

  /**
   * Stop processing jobs
   */
  stop() {
    console.log("[job-processor] Stopping job processor...");
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the next job in the queue
   */
  private async processNext() {
    // Skip if already processing a job
    if (this.isProcessing) {
      return;
    }

    // Get next job from queue
    const job = this.queue.processNext();
    if (!job) {
      return; // No jobs to process
    }

    this.isProcessing = true;

    try {
      console.log(`[job-processor] Processing job: ${job.id} for project: ${job.projectId}`);

      // Update job status to processing
      job.status = "processing";
      job.updatedAt = new Date().toISOString();
      await this.jobRepo.update(job);

      // Get the project
      const project = await this.projectRepo.getById(job.projectId);
      if (!project) {
        throw new Error(`Project not found: ${job.projectId}`);
      }

      // Update project status to generating
      project.status = "generating";
      project.updatedAt = new Date().toISOString();
      await this.projectRepo.update(project);

      // Generate the website
      const result = await generateWebsite(project);

      const now = new Date().toISOString();

      if (result.success && result.generatedSite) {
        // Update job status to completed
        job.status = "completed";
        job.updatedAt = now;
        job.completedAt = now;
        await this.jobRepo.update(job);

        // Update project with generated site
        project.status = "ready";
        project.generatedSite = result.generatedSite;
        project.error = undefined;
        project.updatedAt = now;
        await this.projectRepo.update(project);

        console.log(`[job-processor] Job completed successfully: ${job.id}`);
      } else {
        // Update job status to failed
        job.status = "failed";
        job.error = result.error;
        job.updatedAt = now;
        await this.jobRepo.update(job);

        // Update project status to failed
        project.status = "failed";
        project.error = result.error;
        project.updatedAt = now;
        await this.projectRepo.update(project);

        console.error(`[job-processor] Job failed: ${job.id} - ${result.error}`);
      }
    } catch (error) {
      console.error(`[job-processor] Error processing job: ${job.id}`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      const now = new Date().toISOString();

      // Update job status to failed
      job.status = "failed";
      job.error = errorMessage;
      job.updatedAt = now;
      await this.jobRepo.update(job);

      // Update project status to failed
      try {
        const project = await this.projectRepo.getById(job.projectId);
        if (project) {
          project.status = "failed";
          project.error = errorMessage;
          project.updatedAt = now;
          await this.projectRepo.update(project);
        }
      } catch (projectError) {
        console.error(`[job-processor] Failed to update project status`, projectError);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually process a specific job (for testing or manual triggering)
   */
  async processJob(job: GenerationJob): Promise<void> {
    // Add job to queue and process
    this.queue.enqueue(job);
    await this.processNext();
  }
}
