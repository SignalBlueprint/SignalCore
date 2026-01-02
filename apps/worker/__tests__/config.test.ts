/**
 * Tests for scheduler configuration loading and validation
 */
import { describe, it, expect } from 'vitest';
import { validateSchedulerConfig } from '../src/config';
import type { SchedulerConfig } from '@sb/jobs';

describe('validateSchedulerConfig', () => {
  it('should pass validation for valid config', () => {
    const validConfig: SchedulerConfig = {
      schedules: [
        {
          jobId: 'daily.questmaster',
          schedule: '0 9 * * *',
          enabled: true,
          description: 'Daily Questmaster job',
        },
        {
          jobId: 'weekly.sprintplanner',
          schedule: '0 8 * * 1',
          enabled: true,
          timezone: 'America/New_York',
        },
      ],
    };

    const errors = validateSchedulerConfig(validConfig);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when schedules is missing', () => {
    const invalidConfig = {} as SchedulerConfig;
    const errors = validateSchedulerConfig(invalidConfig);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('schedules');
  });

  it('should fail validation when schedules is not an array', () => {
    const invalidConfig = { schedules: 'not-an-array' } as unknown as SchedulerConfig;
    const errors = validateSchedulerConfig(invalidConfig);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('schedules');
  });

  it('should fail validation when jobId is missing', () => {
    const invalidConfig: SchedulerConfig = {
      schedules: [
        {
          jobId: '',
          schedule: '0 9 * * *',
          enabled: true,
        },
      ],
    };

    const errors = validateSchedulerConfig(invalidConfig);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('jobId'))).toBe(true);
  });

  it('should fail validation when schedule (cron expression) is missing', () => {
    const invalidConfig: SchedulerConfig = {
      schedules: [
        {
          jobId: 'test.job',
          schedule: '',
          enabled: true,
        },
      ],
    };

    const errors = validateSchedulerConfig(invalidConfig);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('schedule'))).toBe(true);
  });

  it('should fail validation when enabled flag is missing', () => {
    const invalidConfig: SchedulerConfig = {
      schedules: [
        {
          jobId: 'test.job',
          schedule: '0 9 * * *',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
    };

    const errors = validateSchedulerConfig(invalidConfig);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('enabled'))).toBe(true);
  });

  it('should report multiple validation errors', () => {
    const invalidConfig: SchedulerConfig = {
      schedules: [
        {
          jobId: '',
          schedule: '',
          enabled: true,
        },
        {
          jobId: 'valid.job',
          schedule: '0 9 * * *',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
    };

    const errors = validateSchedulerConfig(invalidConfig);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('should allow optional fields in valid config', () => {
    const validConfig: SchedulerConfig = {
      schedules: [
        {
          jobId: 'test.job',
          schedule: '0 9 * * *',
          enabled: true,
          timezone: 'UTC',
          description: 'Test job',
          input: { orgId: 'test-org' },
        },
      ],
    };

    const errors = validateSchedulerConfig(validConfig);
    expect(errors).toHaveLength(0);
  });

  it('should handle empty schedules array', () => {
    const validConfig: SchedulerConfig = {
      schedules: [],
    };

    const errors = validateSchedulerConfig(validConfig);
    expect(errors).toHaveLength(0);
  });
});
