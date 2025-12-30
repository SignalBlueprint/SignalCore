/**
 * Tests for questboard AI functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runClarifyGoal, runDecomposeGoal, runExpandTask, runLevelUpGoal, runImproveGoal } from './questboard';
import type { ClarifyOutput, TeamSnapshot, Goal } from '@sb/schemas';

// Mock dependencies
vi.mock('@sb/cache', () => ({
  hashInput: vi.fn((input: string) => `hash-${input.slice(0, 10)}`),
  getJson: vi.fn(() => null),
  setJson: vi.fn(),
}));

vi.mock('@sb/events', () => ({
  publish: vi.fn(),
}));

vi.mock('@sb/telemetry', () => ({
  recordAiCall: vi.fn(),
}));

vi.mock('@sb/config', () => ({}));

vi.mock('./org-context', () => ({
  buildOrgContext: vi.fn(() => Promise.resolve({
    orgId: 'org-1',
    activeGoals: [],
    completedGoals: [],
    activeQuests: [],
    completedQuests: [],
    knowledgeCards: [],
  })),
  formatOrgContext: vi.fn(() => 'Org context summary'),
}));

// Mock OpenAI with a proper class constructor
const mockOpenAICreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockOpenAICreate,
        },
      };
    },
  };
});

describe('runClarifyGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable for OpenAI
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should clarify a goal successfully', async () => {
    // Mock OpenAI response
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              goal: 'Build authentication system',
              clarified: {
                what: 'A secure user authentication system with OAuth support',
                why: 'To protect user data and enable personalization',
                success: 'Users can sign up, log in, and manage their accounts securely',
                constraints: ['Must be GDPR compliant', 'Support OAuth 2.0'],
              },
            }),
          },
        },
      ],
    });

    const result = await runClarifyGoal('Build authentication system');

    expect(result).toBeDefined();
    expect(result.goal).toBe('Build authentication system');
    expect(result.clarified).toBeDefined();
    expect(result.clarified.what).toContain('authentication');
    expect(result.clarified.constraints).toBeInstanceOf(Array);
  });

  it('should handle cache hits', async () => {
    const cache = await import('@sb/cache');
    const cachedResult: ClarifyOutput = {
      goal: 'Cached goal',
      clarified: {
        what: 'Cached what',
        why: 'Cached why',
        success: 'Cached success',
        constraints: [],
      },
    };

    vi.mocked(cache.getJson).mockReturnValueOnce(cachedResult);

    const result = await runClarifyGoal('Test input');

    expect(result).toEqual(cachedResult);
    expect(cache.getJson).toHaveBeenCalled();
  });

  it('should include org context when orgId is provided', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              goal: 'Test goal',
              clarified: {
                what: 'Test what',
                why: 'Test why',
                success: 'Test success',
                constraints: [],
              },
            }),
          },
        },
      ],
    });

    const orgContext = await import('./org-context');

    await runClarifyGoal('Test goal', { orgId: 'org-123' });

    expect(orgContext.buildOrgContext).toHaveBeenCalledWith('org-123', expect.any(Object));
    expect(orgContext.formatOrgContext).toHaveBeenCalled();
  });

  it('should throw error when OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(runClarifyGoal('Test goal')).rejects.toThrow('OPENAI_API_KEY');
  });
});

describe('runDecomposeGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  const mockClarifyOutput: ClarifyOutput = {
    goal: 'Build auth system',
    clarified: {
      what: 'OAuth authentication',
      why: 'Security',
      success: 'Users can log in',
      constraints: [],
    },
  };

  const mockTeamSnapshot: TeamSnapshot = {
    orgId: 'org-1',
    members: [
      {
        id: 'user-1',
        email: 'alice@example.com',
        role: 'Engineer',
        profile: {
          memberId: 'user-1',
          orgId: 'org-1',
          top2: ['W', 'I'],
          competency2: ['D', 'G'],
          frustration2: ['E', 'T'],
          dailyCapacityMinutes: 480,
          updatedAt: new Date().toISOString(),
        },
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  it('should decompose a goal into questlines', async () => {
    // Mock the decomposeGoalStructured function
    const openaiClient = await import('./openai-client');
    vi.spyOn(openaiClient, 'decomposeGoalStructured').mockResolvedValue({
      result: {
        questlines: [
          {
            id: 'ql-1',
            title: 'Backend Setup',
            outcome: 'Backend infrastructure ready',
          },
        ],
        tasks: [
          {
            id: 'task-1',
            title: 'Setup database',
            description: 'Configure PostgreSQL',
            questline_id: 'ql-1',
            phase: 'I',
            estimate_min: 120,
            priority: 'high',
            requires_approval: false,
            acceptance_criteria: ['Database is accessible'],
            depends_on_task_ids: [],
          },
        ],
        expansion_candidates: [],
      },
      cached: false,
      inputHash: 'test-hash',
    });

    const result = await runDecomposeGoal('goal-1', mockClarifyOutput, mockTeamSnapshot);

    expect(result).toBeDefined();
    expect(result.goalId).toBe('goal-1');
    expect(result.questlines).toBeInstanceOf(Array);
    expect(result.questlines.length).toBeGreaterThan(0);
    expect(result.questlines[0].quests).toBeDefined();
    expect(result.questlines[0].quests![0].tasks).toBeDefined();
  });

  it('should handle decomposition without team snapshot', async () => {
    const openaiClient = await import('./openai-client');
    vi.spyOn(openaiClient, 'decomposeGoalStructured').mockResolvedValue({
      result: {
        questlines: [],
        tasks: [],
        expansion_candidates: [],
      },
      cached: false,
      inputHash: 'test-hash',
    });

    const result = await runDecomposeGoal('goal-1', mockClarifyOutput);

    expect(result).toBeDefined();
    expect(result.goalId).toBe('goal-1');
  });

  it('should include org context when provided', async () => {
    const openaiClient = await import('./openai-client');
    vi.spyOn(openaiClient, 'decomposeGoalStructured').mockResolvedValue({
      result: {
        questlines: [],
        tasks: [],
      },
      cached: false,
      inputHash: 'test-hash',
    });

    const orgContext = await import('./org-context');

    await runDecomposeGoal('goal-1', mockClarifyOutput, mockTeamSnapshot, { orgId: 'org-123' });

    expect(orgContext.buildOrgContext).toHaveBeenCalled();
  });
});

describe('runExpandTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('should expand a task into subtasks', async () => {
    const openaiClient = await import('./openai-client');
    vi.spyOn(openaiClient, 'expandTaskStructured').mockResolvedValue({
      result: {
        task_id: 'task-1',
        subtasks: [
          {
            id: 'subtask-1',
            title: 'Design schema',
            description: 'Design database schema',
            phase: 'I',
            estimate_min: 60,
            acceptance_criteria: ['Schema documented'],
            depends_on_subtask_ids: [],
            priority: 'high',
          },
        ],
        updated_acceptance_criteria: ['All subtasks completed'],
      },
      cached: false,
      inputHash: 'test-hash',
    });

    const result = await runExpandTask({
      task: {
        id: 'task-1',
        title: 'Setup database',
        description: 'Configure and setup database',
        phase: 'I',
        acceptance: ['Database is running'],
      },
    });

    expect(result).toBeDefined();
    expect(result.taskId).toBe('task-1');
    expect(result.subtasks).toBeInstanceOf(Array);
    expect(result.subtasks.length).toBeGreaterThan(0);
    expect(result.updatedAcceptanceCriteria).toBeDefined();
  });

  it('should handle task expansion with team snapshot', async () => {
    const openaiClient = await import('./openai-client');
    vi.spyOn(openaiClient, 'expandTaskStructured').mockResolvedValue({
      result: {
        task_id: 'task-1',
        subtasks: [],
        updated_acceptance_criteria: [],
      },
      cached: false,
      inputHash: 'test-hash',
    });

    const teamSnapshot: TeamSnapshot = {
      orgId: 'org-1',
      members: [],
      generatedAt: new Date().toISOString(),
    };

    const result = await runExpandTask({
      task: {
        id: 'task-1',
        title: 'Test task',
      },
      teamSnapshot,
    });

    expect(result).toBeDefined();
  });
});

describe('runLevelUpGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  const mockGoal: Goal = {
    id: 'goal-1',
    orgId: 'org-1',
    title: 'Launch Product',
    createdAt: new Date().toISOString(),
    status: 'active',
    level: 1,
  };

  it('should generate level up content for a goal', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              next_level: 2,
              summary: 'Enhanced with more detailed planning',
              goal_updates: {
                outcome: 'More specific outcome',
                plan_markdown: '## Updated Plan\n\nDetailed steps',
              },
              milestones: [
                { title: 'Alpha Release', due_date: '2025-03-01' },
              ],
              quests: [
                { title: 'Build MVP', objective: 'Create minimum viable product', priority: 'high' },
              ],
            }),
          },
        },
      ],
    });

    const result = await runLevelUpGoal(mockGoal);

    expect(result).toBeDefined();
    expect(result.next_level).toBe(2);
    expect(result.summary).toBeDefined();
    expect(result.goal_updates).toBeDefined();
  });

  it('should use cached level up response', async () => {
    const cache = await import('@sb/cache');
    const cachedResponse = {
      next_level: 2,
      summary: 'Cached summary',
      goal_updates: {},
    };

    vi.mocked(cache.getJson).mockReturnValueOnce(cachedResponse);

    const result = await runLevelUpGoal(mockGoal);

    expect(result).toEqual(cachedResponse);
  });

  it('should include org context when provided', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              next_level: 2,
              summary: 'Test',
              goal_updates: {},
            }),
          },
        },
      ],
    });

    const orgContext = await import('./org-context');

    await runLevelUpGoal(mockGoal, { orgId: 'org-123' });

    expect(orgContext.buildOrgContext).toHaveBeenCalled();
  });
});

describe('runImproveGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  const mockGoal: Goal = {
    id: 'goal-1',
    orgId: 'org-1',
    title: 'Launch Product',
    createdAt: new Date().toISOString(),
    status: 'draft',
    problem: 'Need to enter new market',
    outcome: 'Product launched',
    scope_level: 'team',
  };

  it('should improve goal structure', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              improved_title: 'Launch SaaS Product to Enterprise Market',
              improved_problem: 'We need to establish presence in the enterprise SaaS market',
              improved_outcome: 'Successfully launch product with 100 enterprise customers',
              metrics: [
                { name: 'Active Customers', target: 100, window: 'monthly' },
                { name: 'Revenue', target: '$500k', window: 'quarterly' },
              ],
              scope_level: 'team',
              milestones: [
                { title: 'Beta Release', due_date: '2025-06-01' },
              ],
              dependencies: ['Infrastructure ready'],
              risks: ['Market competition', 'Resource constraints'],
              summary: 'Refined goal with clear metrics and milestones',
            }),
          },
        },
      ],
    });

    const result = await runImproveGoal(mockGoal);

    expect(result).toBeDefined();
    expect(result.improved_title).toBeDefined();
    expect(result.improved_problem).toBeDefined();
    expect(result.improved_outcome).toBeDefined();
    expect(result.metrics).toBeInstanceOf(Array);
    expect(result.scope_level).toBeDefined();
  });

  it('should use cached improve goal response', async () => {
    const cache = await import('@sb/cache');
    const cachedResponse = {
      improved_title: 'Cached Title',
      improved_problem: 'Cached Problem',
      improved_outcome: 'Cached Outcome',
      metrics: [],
      scope_level: 'team' as const,
      milestones: [],
      dependencies: [],
      risks: [],
      summary: 'Cached',
    };

    vi.mocked(cache.getJson).mockReturnValueOnce(cachedResponse);

    const result = await runImproveGoal(mockGoal);

    expect(result).toEqual(cachedResponse);
  });

  it('should handle goal with spec_json', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              improved_title: 'Improved Title',
              improved_problem: 'Improved Problem',
              improved_outcome: 'Improved Outcome',
              metrics: [],
              scope_level: 'team',
              milestones: [],
              dependencies: [],
              risks: [],
              summary: 'Test',
            }),
          },
        },
      ],
    });

    const goalWithSpec: Goal = {
      ...mockGoal,
      spec_json: {
        title: 'Product Launch',
        scope_level: 'team',
        owner_role_id: 'role-1',
        problem: 'Market opportunity',
        outcome: 'Product in market',
        metrics: [],
        milestones: [],
        plan_markdown: '## Plan',
      },
    };

    const result = await runImproveGoal(goalWithSpec);

    expect(result).toBeDefined();
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('should handle malformed JSON responses gracefully', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '```json\n{"goal": "test", "clarified": {"what": "test", "why": "test", "success": "test", "constraints": []}}\n```',
          },
        },
      ],
    });

    const result = await runClarifyGoal('Test goal');

    expect(result).toBeDefined();
    expect(result.goal).toBe('test');
  });

  it('should handle empty team snapshot', async () => {
    const openaiClient = await import('./openai-client');
    vi.spyOn(openaiClient, 'decomposeGoalStructured').mockResolvedValue({
      result: {
        questlines: [],
        tasks: [],
      },
      cached: false,
      inputHash: 'test-hash',
    });

    const emptyTeamSnapshot: TeamSnapshot = {
      orgId: 'org-1',
      members: [],
      generatedAt: new Date().toISOString(),
    };

    const clarifyOutput: ClarifyOutput = {
      goal: 'Test',
      clarified: {
        what: 'Test',
        why: 'Test',
        success: 'Test',
        constraints: [],
      },
    };

    const result = await runDecomposeGoal('goal-1', clarifyOutput, emptyTeamSnapshot);

    expect(result).toBeDefined();
  });
});
