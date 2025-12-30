/**
 * Tests for questboard schemas and types
 */
import { describe, it, expect } from 'vitest';
import type {
  WorkingGenius,
  WGPhase,
  WorkingGeniusProfile,
  MemberProfile,
  TeamSnapshot,
  ClarifyOutput,
  QuestState,
  UnlockCondition,
  Questline,
  Quest,
  DecomposeOutput,
  GoalSpec,
  Goal,
  GoalLevel,
  Milestone,
  GoalRollup,
  LevelUpResponse,
  MemberQuestDeck,
  SprintPlan,
  Template,
  TemplateQuestline,
  DailyDeck,
  JobRunSummary,
} from './questboard';

describe('Working Genius Types', () => {
  it('should accept valid WorkingGenius types', () => {
    const validTypes: WorkingGenius[] = [
      'Wonder',
      'Invention',
      'Discernment',
      'Galvanizing',
      'Enablement',
      'Tenacity',
    ];
    expect(validTypes).toHaveLength(6);
  });

  it('should accept valid WGPhase abbreviations', () => {
    const validPhases: WGPhase[] = ['W', 'I', 'D', 'G', 'E', 'T'];
    expect(validPhases).toHaveLength(6);
  });

  it('should create valid WorkingGeniusProfile', () => {
    const profile: WorkingGeniusProfile = {
      top2: ['Wonder', 'Invention'],
      competency2: ['Discernment', 'Galvanizing'],
      frustration2: ['Enablement', 'Tenacity'],
    };
    expect(profile.top2).toHaveLength(2);
    expect(profile.competency2).toHaveLength(2);
    expect(profile.frustration2).toHaveLength(2);
  });
});

describe('MemberProfile', () => {
  it('should create valid MemberProfile with required fields', () => {
    const profile: MemberProfile = {
      memberId: 'user-123',
      orgId: 'org-456',
      top2: ['W', 'I'],
      competency2: ['D', 'G'],
      frustration2: ['E', 'T'],
      dailyCapacityMinutes: 480,
      updatedAt: new Date().toISOString(),
    };
    expect(profile.memberId).toBe('user-123');
    expect(profile.orgId).toBe('org-456');
    expect(profile.dailyCapacityMinutes).toBe(480);
  });

  it('should create MemberProfile with optional fields', () => {
    const profile: MemberProfile = {
      memberId: 'user-123',
      orgId: 'org-456',
      top2: ['W', 'I'],
      competency2: ['D', 'G'],
      frustration2: ['E', 'T'],
      dailyCapacityMinutes: 480,
      timezone: 'America/New_York',
      role: 'Engineer',
      strengths: ['TypeScript', 'React'],
      weaknesses: ['DevOps'],
      notes: 'Senior developer',
      updatedAt: new Date().toISOString(),
    };
    expect(profile.timezone).toBe('America/New_York');
    expect(profile.role).toBe('Engineer');
    expect(profile.strengths).toContain('TypeScript');
  });
});

describe('TeamSnapshot', () => {
  it('should create valid TeamSnapshot', () => {
    const snapshot: TeamSnapshot = {
      orgId: 'org-456',
      members: [
        {
          id: 'user-1',
          email: 'alice@example.com',
          role: 'Engineer',
          profile: {
            memberId: 'user-1',
            orgId: 'org-456',
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
    expect(snapshot.orgId).toBe('org-456');
    expect(snapshot.members).toHaveLength(1);
    expect(snapshot.members[0].email).toBe('alice@example.com');
  });
});

describe('ClarifyOutput', () => {
  it('should create valid ClarifyOutput', () => {
    const output: ClarifyOutput = {
      goal: 'Build a new feature',
      clarified: {
        what: 'A user authentication system',
        why: 'To secure user data and enable personalization',
        success: 'Users can sign up, log in, and manage their accounts',
        constraints: ['Must support OAuth', 'GDPR compliant'],
      },
    };
    expect(output.goal).toBe('Build a new feature');
    expect(output.clarified.constraints).toHaveLength(2);
  });

  it('should allow empty constraints array', () => {
    const output: ClarifyOutput = {
      goal: 'Simple task',
      clarified: {
        what: 'A simple feature',
        why: 'To improve UX',
        success: 'Feature is live',
        constraints: [],
      },
    };
    expect(output.clarified.constraints).toHaveLength(0);
  });
});

describe('Quest and Questline Types', () => {
  it('should accept valid QuestState values', () => {
    const states: QuestState[] = ['locked', 'unlocked', 'in-progress', 'completed'];
    expect(states).toHaveLength(4);
  });

  it('should create valid UnlockCondition for taskCompleted', () => {
    const condition: UnlockCondition = {
      type: 'taskCompleted',
      taskId: 'task-123',
    };
    expect(condition.type).toBe('taskCompleted');
    expect(condition.taskId).toBe('task-123');
  });

  it('should create valid UnlockCondition for questCompleted', () => {
    const condition: UnlockCondition = {
      type: 'questCompleted',
      questId: 'quest-456',
    };
    expect(condition.type).toBe('questCompleted');
    expect(condition.questId).toBe('quest-456');
  });

  it('should create valid UnlockCondition for allTasksCompleted', () => {
    const condition: UnlockCondition = {
      type: 'allTasksCompleted',
      taskIds: ['task-1', 'task-2', 'task-3'],
    };
    expect(condition.type).toBe('allTasksCompleted');
    expect(condition.taskIds).toHaveLength(3);
  });

  it('should create valid Questline', () => {
    const questline: Questline = {
      id: 'ql-1',
      orgId: 'org-1',
      goalId: 'goal-1',
      title: 'Authentication System',
      description: 'Build user authentication',
      epic: 'User Management',
      questIds: ['quest-1', 'quest-2'],
      owner: 'alice@example.com',
      assignmentReason: 'Expert in auth systems',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(questline.title).toBe('Authentication System');
    expect(questline.questIds).toHaveLength(2);
  });

  it('should create valid Quest', () => {
    const quest: Quest = {
      id: 'quest-1',
      orgId: 'org-1',
      questlineId: 'ql-1',
      title: 'Setup OAuth',
      objective: 'Implement OAuth authentication flow',
      unlockConditions: [],
      taskIds: ['task-1', 'task-2'],
      state: 'unlocked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(quest.state).toBe('unlocked');
    expect(quest.taskIds).toHaveLength(2);
  });

  it('should create Quest with unlock conditions', () => {
    const quest: Quest = {
      id: 'quest-2',
      orgId: 'org-1',
      questlineId: 'ql-1',
      title: 'Testing',
      objective: 'Test the auth system',
      unlockConditions: [
        { type: 'questCompleted', questId: 'quest-1' },
      ],
      taskIds: ['task-3'],
      state: 'locked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(quest.state).toBe('locked');
    expect(quest.unlockConditions).toHaveLength(1);
  });
});

describe('DecomposeOutput', () => {
  it('should create valid DecomposeOutput', () => {
    const output: DecomposeOutput = {
      goalId: 'goal-1',
      questlines: [
        {
          id: 'ql-1',
          title: 'Backend Setup',
          description: 'Setup backend infrastructure',
          order: 1,
          locked: false,
          quests: [
            {
              id: 'quest-1',
              title: 'Database Schema',
              objective: 'Design and implement database schema',
              tasks: [
                {
                  id: 'task-1',
                  title: 'Design schema',
                  phase: 'I',
                  estimatedMinutes: 120,
                  priority: 'high',
                },
              ],
            },
          ],
        },
      ],
      estimatedComplexity: 'medium',
      expansionCandidates: ['task-1'],
    };
    expect(output.questlines).toHaveLength(1);
    expect(output.questlines[0].quests).toHaveLength(1);
    expect(output.estimatedComplexity).toBe('medium');
  });
});

describe('Goal Types', () => {
  it('should create valid Goal with minimal fields', () => {
    const goal: Goal = {
      id: 'goal-1',
      orgId: 'org-1',
      title: 'Launch Product',
      createdAt: new Date().toISOString(),
      status: 'draft',
    };
    expect(goal.status).toBe('draft');
    expect(goal.title).toBe('Launch Product');
  });

  it('should create Goal with clarify and decompose outputs', () => {
    const goal: Goal = {
      id: 'goal-1',
      orgId: 'org-1',
      title: 'Launch Product',
      createdAt: new Date().toISOString(),
      status: 'decomposed',
      clarifyOutput: {
        goal: 'Launch Product',
        clarified: {
          what: 'A new SaaS product',
          why: 'To enter new market',
          success: 'First 100 customers',
          constraints: ['6 month timeline', 'Budget: $500k'],
        },
      },
      decomposeOutput: {
        goalId: 'goal-1',
        questlines: [],
        estimatedComplexity: 'high',
      },
    };
    expect(goal.status).toBe('decomposed');
    expect(goal.clarifyOutput).toBeDefined();
    expect(goal.decomposeOutput).toBeDefined();
  });

  it('should create Goal with Strategic Packets fields', () => {
    const goalSpec: GoalSpec = {
      title: 'Launch MVP',
      scope_level: 'team',
      owner_role_id: 'role-1',
      stakeholder_role_ids: ['role-2', 'role-3'],
      problem: 'Need to validate market fit',
      outcome: 'MVP launched with 100 users',
      metrics: [
        { name: 'Active Users', target: 100, window: 'monthly' },
        { name: 'Conversion Rate', target: '5%', window: 'rolling_30d' },
      ],
      milestones: [
        { title: 'Alpha Release', due_date: '2025-03-01' },
        { title: 'Beta Release', due_date: '2025-04-15' },
      ],
      plan_markdown: '## Plan\n\n- Phase 1: Research\n- Phase 2: Build',
      dependencies: ['Infrastructure setup'],
      risks: ['Resource constraints', 'Market timing'],
      required_outputs: [
        { type: 'doc', name: 'Product Requirements Doc' },
        { type: 'code', name: 'MVP Codebase' },
      ],
    };

    const goal: Goal = {
      id: 'goal-1',
      orgId: 'org-1',
      title: 'Launch MVP',
      createdAt: new Date().toISOString(),
      status: 'active',
      spec_json: goalSpec,
      scope_level: 'team',
      owner_role_id: 'role-1',
      problem: 'Need to validate market fit',
      outcome: 'MVP launched with 100 users',
      metrics_json: goalSpec.metrics,
      plan_markdown: goalSpec.plan_markdown,
      dependencies_json: goalSpec.dependencies,
      risks_json: goalSpec.risks,
    };

    expect(goal.spec_json).toBeDefined();
    expect(goal.scope_level).toBe('team');
    expect(goal.metrics_json).toHaveLength(2);
  });

  it('should accept valid GoalLevel values', () => {
    const levels: GoalLevel[] = [0, 1, 2, 3, 4, 5];
    expect(levels).toHaveLength(6);
  });
});

describe('Milestone', () => {
  it('should create valid Milestone', () => {
    const milestone: Milestone = {
      id: 'milestone-1',
      goalId: 'goal-1',
      title: 'Beta Release',
      dueDate: '2025-04-15',
      status: 'planned',
      orderIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(milestone.status).toBe('planned');
    expect(milestone.title).toBe('Beta Release');
  });
});

describe('GoalRollup', () => {
  it('should create valid GoalRollup', () => {
    const rollup: GoalRollup = {
      goalId: 'goal-1',
      totalQuests: 10,
      doneQuests: 7,
      xp: 350,
      updatedAt: new Date().toISOString(),
    };
    expect(rollup.totalQuests).toBe(10);
    expect(rollup.doneQuests).toBe(7);
    expect(rollup.xp).toBe(350);
  });
});

describe('LevelUpResponse', () => {
  it('should create valid LevelUpResponse', () => {
    const response: LevelUpResponse = {
      next_level: 2,
      summary: 'Added more detailed planning and milestones',
      goal_updates: {
        outcome: 'Enhanced outcome description',
        plan_markdown: '## Updated Plan\n\nDetailed steps...',
      },
      milestones: [
        { title: 'Milestone 1', due_date: '2025-06-01' },
      ],
      quests: [
        { title: 'Quest 1', objective: 'Complete feature X', priority: 'high', points: 50 },
      ],
    };
    expect(response.next_level).toBe(2);
    expect(response.milestones).toHaveLength(1);
    expect(response.quests).toHaveLength(1);
  });
});

describe('MemberQuestDeck', () => {
  it('should create valid MemberQuestDeck', () => {
    const deck: MemberQuestDeck = {
      id: 'deck-user-1-2025-12-30',
      memberId: 'user-1',
      orgId: 'org-1',
      date: '2025-12-30',
      deckEntries: [
        {
          questId: 'quest-1',
          questTitle: 'Build Feature',
          taskIds: ['task-1', 'task-2'],
          totalEstimatedMinutes: 240,
        },
      ],
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(deck.date).toBe('2025-12-30');
    expect(deck.deckEntries).toHaveLength(1);
  });
});

describe('SprintPlan', () => {
  it('should create valid SprintPlan', () => {
    const plan: SprintPlan = {
      id: 'sprint-org-1-2025-12-30',
      orgId: 'org-1',
      weekStart: '2025-12-30',
      weekEnd: '2026-01-03',
      memberPlans: [
        {
          memberId: 'user-1',
          memberEmail: 'alice@example.com',
          quests: [
            { questId: 'quest-1', questTitle: 'Auth System', priority: 'high' },
          ],
          tasks: [
            {
              taskId: 'task-1',
              taskTitle: 'OAuth Setup',
              priority: 'high',
              estimatedMinutes: 240,
            },
          ],
          totalCapacityMinutes: 2400,
          allocatedMinutes: 240,
          capacityUtilization: 0.1,
        },
      ],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(plan.status).toBe('draft');
    expect(plan.memberPlans).toHaveLength(1);
  });
});

describe('Template and TemplateQuestline', () => {
  it('should create valid Template', () => {
    const template: Template = {
      id: 'template-1',
      orgId: 'org-1',
      title: 'Standard Feature Template',
      description: 'Template for building new features',
      tags: ['feature', 'development'],
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
    };
    expect(template.tags).toContain('feature');
    expect(template.title).toBe('Standard Feature Template');
  });

  it('should create valid TemplateQuestline', () => {
    const templateQuestline: TemplateQuestline = {
      id: 'template-1',
      templateId: 'template-1',
      questlineDefinition: {
        title: 'Feature Development',
        description: 'Build a new feature',
        epic: 'Product Development',
        quests: [
          {
            title: 'Planning',
            objective: 'Plan the feature',
            unlockConditions: [],
            tasks: [
              {
                title: 'Requirements gathering',
                description: 'Gather requirements from stakeholders',
                requiresApproval: true,
                priority: 'high',
              },
            ],
          },
        ],
      },
    };
    expect(templateQuestline.questlineDefinition.quests).toHaveLength(1);
  });
});

describe('DailyDeck', () => {
  it('should create valid DailyDeck', () => {
    const deck: DailyDeck = {
      id: 'daily-deck-org-1-2025-12-30',
      orgId: 'org-1',
      date: '2025-12-30',
      generatedAt: new Date().toISOString(),
      items: [
        {
          taskId: 'task-1',
          taskTitle: 'Complete OAuth setup',
          questId: 'quest-1',
          questTitle: 'Auth System',
          questlineId: 'ql-1',
          questlineTitle: 'User Management',
          assignedToMemberId: 'user-1',
          assignedToMemberEmail: 'alice@example.com',
          estimatedMinutes: 120,
          priority: 'high',
          phase: 'I',
          reason: 'Blocks other tasks',
          status: 'todo',
        },
      ],
      teamCapacity: [
        {
          memberId: 'user-1',
          memberEmail: 'alice@example.com',
          capacityMinutes: 480,
          plannedMinutes: 120,
          utilizationPercent: 25,
        },
      ],
      summary: {
        totalTasks: 1,
        totalEstimatedMinutes: 120,
        tasksConsidered: 10,
        warnings: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(deck.items).toHaveLength(1);
    expect(deck.teamCapacity).toHaveLength(1);
    expect(deck.summary.totalTasks).toBe(1);
  });

  it('should handle warnings in DailyDeck', () => {
    const deck: DailyDeck = {
      id: 'daily-deck-org-1-2025-12-30',
      orgId: 'org-1',
      date: '2025-12-30',
      generatedAt: new Date().toISOString(),
      items: [],
      teamCapacity: [],
      summary: {
        totalTasks: 0,
        totalEstimatedMinutes: 0,
        tasksConsidered: 5,
        warnings: ['Capacity overflow for user@example.com'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(deck.summary.warnings).toHaveLength(1);
  });
});

describe('JobRunSummary', () => {
  it('should create valid JobRunSummary', () => {
    const summary: JobRunSummary = {
      id: 'summary-daily.questmaster-org-1-1735578000000',
      orgId: 'org-1',
      jobId: 'daily.questmaster',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: 'success',
      stats: {
        goals: 5,
        questlines: 12,
        quests: 24,
        tasks: 87,
        decksGenerated: 1,
        unlockedQuests: 3,
        dailyDeckTasks: 7,
        dailyDeckWarnings: 0,
      },
      createdAt: new Date().toISOString(),
    };
    expect(summary.status).toBe('success');
    expect(summary.stats.tasks).toBe(87);
  });

  it('should create JobRunSummary with error', () => {
    const summary: JobRunSummary = {
      id: 'summary-daily.questmaster-org-1-1735578000000',
      orgId: 'org-1',
      jobId: 'daily.questmaster',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: 'failed',
      error: 'Database connection failed',
      stats: {},
      createdAt: new Date().toISOString(),
    };
    expect(summary.status).toBe('failed');
    expect(summary.error).toBe('Database connection failed');
  });
});
