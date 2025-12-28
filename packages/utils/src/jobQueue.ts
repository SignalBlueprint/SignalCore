/**
 * Minimal in-memory job queue abstraction.
 * Intended for dev-only stubs and local workflow scaffolding.
 */

export interface JobQueue<T extends { id: string }> {
  enqueue: (job: T) => T;
  get: (jobId: string) => T | undefined;
  processNext: () => T | undefined;
}

export class InMemoryJobQueue<T extends { id: string; status?: string; updatedAt?: string }>
  implements JobQueue<T>
{
  private readonly queue: T[] = [];
  private readonly jobs = new Map<string, T>();

  enqueue(job: T): T {
    this.queue.push(job);
    this.jobs.set(job.id, job);
    return job;
  }

  get(jobId: string): T | undefined {
    return this.jobs.get(jobId);
  }

  processNext(): T | undefined {
    // TODO: Replace with real job processing once workers are wired up.
    const job = this.queue.shift();
    if (!job) {
      return undefined;
    }
    return job;
  }
}
