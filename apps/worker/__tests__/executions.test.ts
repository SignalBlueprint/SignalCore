/**
 * Tests for job execution tracking and storage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '@sb/storage';
import type { JobExecution } from '@sb/schemas';
import {
  createJobExecution,
  markJobSuccess,
  markJobFailure,
  getJobExecution,
  getJobExecutions,
  getAllJobExecutions,
  getJobStats,
  cleanupOldExecutions,
} from '../src/executions';

// Mock storage and alert manager
vi.mock('@sb/storage', () => ({
  storage: {
    upsert: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../src/alert-manager', () => ({
  getAlertManager: vi.fn(() => ({
    onJobExecutionComplete: vi.fn(),
  })),
}));

describe('Job Execution Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJobExecution', () => {
    it('should create a new job execution record', async () => {
      const params = {
        jobId: 'test.job',
        jobName: 'Test Job',
        orgId: 'test-org',
        input: { foo: 'bar' },
      };

      const execution = await createJobExecution(params);

      expect(execution).toBeDefined();
      expect(execution.id).toMatch(/^exec-test\.job-/);
      expect(execution.jobId).toBe('test.job');
      expect(execution.jobName).toBe('Test Job');
      expect(execution.orgId).toBe('test-org');
      expect(execution.status).toBe('running');
      expect(execution.startedAt).toBeDefined();
      expect(execution.input).toEqual({ foo: 'bar' });
      expect(storage.upsert).toHaveBeenCalledWith('job-executions', execution);
    });

    it('should create execution without optional fields', async () => {
      const params = {
        jobId: 'test.job',
        jobName: 'Test Job',
      };

      const execution = await createJobExecution(params);

      expect(execution.orgId).toBeUndefined();
      expect(execution.input).toBeUndefined();
      expect(storage.upsert).toHaveBeenCalled();
    });

    it('should generate unique execution IDs', async () => {
      const params = {
        jobId: 'test.job',
        jobName: 'Test Job',
      };

      const exec1 = await createJobExecution(params);
      const exec2 = await createJobExecution(params);

      expect(exec1.id).not.toBe(exec2.id);
    });
  });

  describe('markJobSuccess', () => {
    it('should mark job execution as successful', async () => {
      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date(Date.now() - 5000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.get).mockResolvedValue(mockExecution);

      const result = await markJobSuccess({
        executionId: 'exec-123',
        output: { result: 'success' },
      });

      expect(result.status).toBe('success');
      expect(result.finishedAt).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.output).toEqual({ result: 'success' });
      expect(storage.upsert).toHaveBeenCalled();
    });

    it('should throw error if execution not found', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      await expect(markJobSuccess({ executionId: 'nonexistent' })).rejects.toThrow(
        'Job execution nonexistent not found'
      );
    });
  });

  describe('markJobFailure', () => {
    it('should mark job execution as failed', async () => {
      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'running',
        startedAt: new Date(Date.now() - 5000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.get).mockResolvedValue(mockExecution);

      const result = await markJobFailure({
        executionId: 'exec-123',
        error: 'Something went wrong',
      });

      expect(result.status).toBe('failed');
      expect(result.finishedAt).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.error).toBe('Something went wrong');
      expect(storage.upsert).toHaveBeenCalled();
    });

    it('should throw error if execution not found', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      await expect(
        markJobFailure({ executionId: 'nonexistent', error: 'Test error' })
      ).rejects.toThrow('Job execution nonexistent not found');
    });
  });

  describe('getJobExecution', () => {
    it('should retrieve job execution by ID', async () => {
      const mockExecution: JobExecution = {
        id: 'exec-123',
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'success',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        duration: 5000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(storage.get).mockResolvedValue(mockExecution);

      const result = await getJobExecution('exec-123');

      expect(result).toEqual(mockExecution);
      expect(storage.get).toHaveBeenCalledWith('job-executions', 'exec-123');
    });

    it('should return null if execution not found', async () => {
      vi.mocked(storage.get).mockResolvedValue(null);

      const result = await getJobExecution('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getJobExecutions', () => {
    it('should retrieve executions for a specific job', async () => {
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-1',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'success',
          startedAt: new Date(Date.now() - 10000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-2',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'failed',
          startedAt: new Date(Date.now() - 5000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-3',
          jobId: 'other.job',
          jobName: 'Other Job',
          status: 'success',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockImplementation(async (kind, filter) => {
        if (typeof filter === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockExecutions.filter(filter as any);
        }
        return mockExecutions;
      });

      const result = await getJobExecutions('test.job');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('exec-2'); // Most recent first
      expect(result[1].id).toBe('exec-1');
    });

    it('should apply limit option', async () => {
      const mockExecutions: JobExecution[] = Array.from({ length: 10 }, (_, i) => ({
        id: `exec-${i}`,
        jobId: 'test.job',
        jobName: 'Test Job',
        status: 'success',
        startedAt: new Date(Date.now() - i * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      vi.mocked(storage.list).mockImplementation(async (kind, filter) => {
        if (typeof filter === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockExecutions.filter(filter as any);
        }
        return mockExecutions;
      });

      const result = await getJobExecutions('test.job', { limit: 5 });

      expect(result).toHaveLength(5);
    });

    it('should filter by orgId', async () => {
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-1',
          jobId: 'test.job',
          jobName: 'Test Job',
          orgId: 'org-1',
          status: 'success',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-2',
          jobId: 'test.job',
          jobName: 'Test Job',
          orgId: 'org-2',
          status: 'success',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockImplementation(async (kind, filter) => {
        if (typeof filter === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockExecutions.filter(filter as any);
        }
        return mockExecutions;
      });

      const result = await getJobExecutions('test.job', { orgId: 'org-1' });

      expect(result).toHaveLength(1);
      expect(result[0].orgId).toBe('org-1');
    });
  });

  describe('getAllJobExecutions', () => {
    it('should retrieve all executions across all jobs', async () => {
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-1',
          jobId: 'job-1',
          jobName: 'Job 1',
          status: 'success',
          startedAt: new Date(Date.now() - 10000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-2',
          jobId: 'job-2',
          jobName: 'Job 2',
          status: 'failed',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockImplementation(async (kind, filter) => {
        if (typeof filter === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockExecutions.filter(filter as any);
        }
        return mockExecutions;
      });

      const result = await getAllJobExecutions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('exec-2'); // Most recent first
    });

    it('should filter by status', async () => {
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-1',
          jobId: 'job-1',
          jobName: 'Job 1',
          status: 'success',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-2',
          jobId: 'job-2',
          jobName: 'Job 2',
          status: 'failed',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockImplementation(async (kind, filter) => {
        if (typeof filter === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockExecutions.filter(filter as any);
        }
        return mockExecutions;
      });

      const result = await getAllJobExecutions({ status: 'failed' });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('failed');
    });
  });

  describe('getJobStats', () => {
    it('should calculate job statistics', async () => {
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-1',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'success',
          startedAt: new Date(Date.now() - 30000).toISOString(),
          duration: 1000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-2',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'success',
          startedAt: new Date(Date.now() - 20000).toISOString(),
          duration: 2000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-3',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'failed',
          startedAt: new Date(Date.now() - 10000).toISOString(),
          duration: 500,
          error: 'Test error',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockImplementation(async (kind, filter) => {
        if (typeof filter === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return mockExecutions.filter(filter as any);
        }
        return mockExecutions;
      });

      const stats = await getJobStats('test.job');

      expect(stats.jobId).toBe('test.job');
      expect(stats.totalRuns).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.timeoutCount).toBe(0);
      expect(stats.averageDuration).toBe((1000 + 2000 + 500) / 3);
      expect(stats.lastRun?.id).toBe('exec-3');
      expect(stats.lastSuccess?.id).toBe('exec-2');
      expect(stats.lastFailure?.id).toBe('exec-3');
    });

    it('should handle empty execution history', async () => {
      vi.mocked(storage.list).mockResolvedValue([]);

      const stats = await getJobStats('test.job');

      expect(stats.totalRuns).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.lastRun).toBeUndefined();
    });
  });

  describe('cleanupOldExecutions', () => {
    it('should delete executions older than retention period', async () => {
      const now = Date.now();
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-old',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'success',
          startedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days ago
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exec-recent',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'success',
          startedAt: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockResolvedValue(mockExecutions);

      const deleted = await cleanupOldExecutions(30);

      expect(deleted).toBe(1);
      expect(storage.remove).toHaveBeenCalledWith('job-executions', 'exec-old');
      expect(storage.remove).not.toHaveBeenCalledWith('job-executions', 'exec-recent');
    });

    it('should handle custom retention period', async () => {
      const now = Date.now();
      const mockExecutions: JobExecution[] = [
        {
          id: 'exec-1',
          jobId: 'test.job',
          jobName: 'Test Job',
          status: 'success',
          startedAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(storage.list).mockResolvedValue(mockExecutions);

      const deleted = await cleanupOldExecutions(7);

      expect(deleted).toBe(1);
      expect(storage.remove).toHaveBeenCalledWith('job-executions', 'exec-1');
    });
  });
});
