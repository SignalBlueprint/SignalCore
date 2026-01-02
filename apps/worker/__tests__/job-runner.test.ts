/**
 * Tests for job runner with automatic execution tracking
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runJobWithTracking } from '../src/job-runner';
import * as executions from '../src/executions';
import { runJob as runJobCore, getJob } from '@sb/jobs';
import type { JobExecution } from '@sb/schemas';

// Mock dependencies
vi.mock('@sb/jobs', () => ({
  runJob: vi.fn(),
  getJob: vi.fn(),
}));

vi.mock('../src/executions', async () => {
  const actual = await vi.importActual('../src/executions');
  return {
    ...actual,
    createJobExecution: vi.fn(),
    markJobSuccess: vi.fn(),
    markJobFailure: vi.fn(),
  };
});

describe('Job Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runJobWithTracking', () => {
    it('should execute job successfully and track execution', async () => {
      const mockJob = {
        id: 'test.job',
        name: 'Test Job',
        run: vi.fn().mockResolvedValue(undefined),
      };

      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getJob).mockReturnValue(mockJob);
      vi.mocked(executions.createJobExecution).mockResolvedValue(mockExecution);
      vi.mocked(runJobCore).mockResolvedValue(undefined);

      await runJobWithTracking('test.job', { orgId: 'test-org' });

      expect(getJob).toHaveBeenCalledWith('test.job');
      expect(executions.createJobExecution).toHaveBeenCalledWith({
        jobId: 'test.job',
        jobName: 'Test Job',
        orgId: 'test-org',
        input: { orgId: 'test-org' },
      });
      expect(runJobCore).toHaveBeenCalledWith('test.job', { orgId: 'test-org' });
      expect(executions.markJobSuccess).toHaveBeenCalledWith({
        executionId: 'exec-123',
        output: {},
      });
      expect(executions.markJobFailure).not.toHaveBeenCalled();
    });

    it('should track job failure when job throws error', async () => {
      const mockJob = {
        id: 'test.job',
        name: 'Test Job',
        run: vi.fn().mockRejectedValue(new Error('Job failed')),
      };

      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getJob).mockReturnValue(mockJob);
      vi.mocked(executions.createJobExecution).mockResolvedValue(mockExecution);
      vi.mocked(runJobCore).mockRejectedValue(new Error('Job failed'));

      await expect(runJobWithTracking('test.job')).rejects.toThrow('Job failed');

      expect(executions.markJobFailure).toHaveBeenCalledWith({
        executionId: 'exec-123',
        error: 'Job failed',
      });
      expect(executions.markJobSuccess).not.toHaveBeenCalled();
    });

    it('should throw error if job not found', async () => {
      vi.mocked(getJob).mockReturnValue(null);

      await expect(runJobWithTracking('nonexistent.job')).rejects.toThrow(
        'Job "nonexistent.job" not found'
      );

      expect(executions.createJobExecution).not.toHaveBeenCalled();
    });

    it('should handle job execution without input', async () => {
      const mockJob = {
        id: 'test.job',
        name: 'Test Job',
        run: vi.fn().mockResolvedValue(undefined),
      };

      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getJob).mockReturnValue(mockJob);
      vi.mocked(executions.createJobExecution).mockResolvedValue(mockExecution);
      vi.mocked(runJobCore).mockResolvedValue(undefined);

      await runJobWithTracking('test.job');

      expect(executions.createJobExecution).toHaveBeenCalledWith({
        jobId: 'test.job',
        jobName: 'Test Job',
        orgId: undefined,
        input: undefined,
      });
    });

    it('should extract orgId from input', async () => {
      const mockJob = {
        id: 'test.job',
        name: 'Test Job',
        run: vi.fn().mockResolvedValue(undefined),
      };

      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        orgId: 'org-123',
        status: 'running',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getJob).mockReturnValue(mockJob);
      vi.mocked(executions.createJobExecution).mockResolvedValue(mockExecution);
      vi.mocked(runJobCore).mockResolvedValue(undefined);

      await runJobWithTracking('test.job', { orgId: 'org-123', foo: 'bar' });

      expect(executions.createJobExecution).toHaveBeenCalledWith({
        jobId: 'test.job',
        jobName: 'Test Job',
        orgId: 'org-123',
        input: { orgId: 'org-123', foo: 'bar' },
      });
    });

    it('should handle non-Error exceptions', async () => {
      const mockJob = {
        id: 'test.job',
        name: 'Test Job',
        run: vi.fn().mockRejectedValue('String error'),
      };

      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getJob).mockReturnValue(mockJob);
      vi.mocked(executions.createJobExecution).mockResolvedValue(mockExecution);
      vi.mocked(runJobCore).mockRejectedValue('String error');

      await expect(runJobWithTracking('test.job')).rejects.toBe('String error');

      expect(executions.markJobFailure).toHaveBeenCalledWith({
        executionId: 'exec-123',
        error: 'String error',
      });
    });

    it('should re-throw error after tracking failure', async () => {
      const mockJob = {
        id: 'test.job',
        name: 'Test Job',
        run: vi.fn().mockRejectedValue(new Error('Custom error')),
      };

      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getJob).mockReturnValue(mockJob);
      vi.mocked(executions.createJobExecution).mockResolvedValue(mockExecution);
      vi.mocked(runJobCore).mockRejectedValue(new Error('Custom error'));

      const promise = runJobWithTracking('test.job');

      await expect(promise).rejects.toThrow('Custom error');
    });
  });
});
