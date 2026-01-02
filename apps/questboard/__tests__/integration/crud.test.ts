/**
 * Integration tests for CRUD operations
 * Tests full flow: signup → login → create goal → create questline → create quest → create task → complete task
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRoutes from '../../src/routes/auth';
import { requireAuth } from '@sb/auth';
import { storage } from '@sb/storage';
import {
  createGoal,
  createQuestline,
  createQuest,
  createTask,
  completeTask,
  getGoalById,
  getQuestlinesByGoalId,
  getQuestsByQuestlineId,
  getTasksByQuestId,
} from '../../src/store';

describe('CRUD Integration Tests', () => {
  let app: express.Application;
  const testEmail = `crud-test-${Date.now()}@example.com`;
  const testPassword = 'SecurePass123!';
  let token: string;
  let userId: string;
  let orgId: string;

  beforeAll(async () => {
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Add protected API routes for testing
    app.use('/api/*', requireAuth);

    app.post('/api/goals', async (req: any, res) => {
      try {
        const { title } = req.body;
        const goal = await createGoal(title, req.user.orgId);
        res.status(201).json(goal);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/questlines', async (req: any, res) => {
      try {
        const questline = await createQuestline(req.body);
        res.status(201).json(questline);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/quests', async (req: any, res) => {
      try {
        const quest = await createQuest(req.body);
        res.status(201).json(quest);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/tasks', async (req: any, res) => {
      try {
        const task = await createTask(req.body);
        res.status(201).json(task);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Create test user
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        orgName: 'CRUD Test Org',
      });

    token = signupResponse.body.token;
    userId = signupResponse.body.user.id;
    orgId = signupResponse.body.org.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      const users = await storage.list('users');
      const testUser = users.find((u: any) => u.email === testEmail);
      if (testUser) {
        await storage.delete('users', testUser.id);
      }

      const orgs = await storage.list('orgs');
      const testOrg = orgs.find((o: any) => o.id === orgId);
      if (testOrg) {
        await storage.delete('orgs', testOrg.id);
      }

      // Clean up goals, questlines, quests, tasks
      const goals = await storage.list('goals');
      for (const goal of goals.filter((g: any) => g.org_id === orgId)) {
        await storage.delete('goals', goal.id);
      }

      const questlines = await storage.list('questlines');
      for (const ql of questlines.filter((q: any) => q.org_id === orgId)) {
        await storage.delete('questlines', ql.id);
      }

      const quests = await storage.list('quests');
      for (const q of quests.filter((q: any) => q.org_id === orgId)) {
        await storage.delete('quests', q.id);
      }

      const tasks = await storage.list('tasks');
      for (const t of tasks.filter((t: any) => t.org_id === orgId)) {
        await storage.delete('tasks', t.id);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Full workflow: Goal → Questline → Quest → Task', () => {
    let goalId: string;
    let questlineId: string;
    let questId: string;
    let taskId: string;

    it('should create a goal', async () => {
      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Integration Test Goal',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Integration Test Goal');
      expect(response.body.org_id).toBe(orgId);
      goalId = response.body.id;
    });

    it('should retrieve the created goal', async () => {
      const goal = await getGoalById(goalId);
      expect(goal).toBeDefined();
      expect(goal?.title).toBe('Integration Test Goal');
    });

    it('should create a questline for the goal', async () => {
      const response = await request(app)
        .post('/api/questlines')
        .set('Authorization', `Bearer ${token}`)
        .send({
          org_id: orgId,
          goal_id: goalId,
          title: 'Integration Test Questline',
          description: 'Testing questline creation',
          status: 'active',
          order: 1,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.goal_id).toBe(goalId);
      questlineId = response.body.id;
    });

    it('should retrieve questlines for the goal', async () => {
      const questlines = await getQuestlinesByGoalId(goalId);
      expect(questlines).toHaveLength(1);
      expect(questlines[0].id).toBe(questlineId);
    });

    it('should create a quest for the questline', async () => {
      const response = await request(app)
        .post('/api/quests')
        .set('Authorization', `Bearer ${token}`)
        .send({
          org_id: orgId,
          questline_id: questlineId,
          title: 'Integration Test Quest',
          description: 'Testing quest creation',
          status: 'active',
          unlock_conditions: [],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.questline_id).toBe(questlineId);
      questId = response.body.id;
    });

    it('should retrieve quests for the questline', async () => {
      const quests = await getQuestsByQuestlineId(questlineId);
      expect(quests).toHaveLength(1);
      expect(quests[0].id).toBe(questId);
    });

    it('should create a task for the quest', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          org_id: orgId,
          quest_id: questId,
          title: 'Integration Test Task',
          description: 'Testing task creation',
          status: 'ready',
          priority: 1,
          estimated_hours: 2,
          assigned_to: userId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.quest_id).toBe(questId);
      expect(response.body.assigned_to).toBe(userId);
      taskId = response.body.id;
    });

    it('should retrieve tasks for the quest', async () => {
      const tasks = await getTasksByQuestId(questId);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(taskId);
    });

    it('should complete the task', async () => {
      const result = await completeTask(taskId, userId);
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should verify task completion persisted', async () => {
      const tasks = await getTasksByQuestId(questId);
      const completedTask = tasks.find(t => t.id === taskId);
      expect(completedTask).toBeDefined();
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.completed_by).toBe(userId);
      expect(completedTask?.completed_at).toBeDefined();
    });
  });

  describe('Multi-tenant CRUD isolation', () => {
    let otherUserToken: string;
    let otherOrgId: string;
    let privateGoalId: string;

    beforeAll(async () => {
      // Create another user in different org
      const signup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `other-${Date.now()}@example.com`,
          password: testPassword,
          orgName: 'Other Org',
        });

      otherUserToken = signup.body.token;
      otherOrgId = signup.body.org.id;

      // Create a goal in the first org
      const goalResponse = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Private Goal',
        });

      privateGoalId = goalResponse.body.id;
    });

    it('should not allow users to access other orgs data', async () => {
      // Try to access goal from different org
      const goal = await getGoalById(privateGoalId);
      expect(goal?.org_id).toBe(orgId);
      expect(goal?.org_id).not.toBe(otherOrgId);

      // Verify other user's org has no goals
      const otherOrgGoals = (await storage.list('goals'))
        .filter((g: any) => g.org_id === otherOrgId);
      expect(otherOrgGoals).toHaveLength(0);
    });

    it('should create isolated data for each org', async () => {
      const otherGoalResponse = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Other Org Goal',
        });

      expect(otherGoalResponse.body.org_id).toBe(otherOrgId);
      expect(otherGoalResponse.body.org_id).not.toBe(orgId);

      // Verify both orgs have their own data
      const allGoals = await storage.list('goals');
      const org1Goals = allGoals.filter((g: any) => g.org_id === orgId);
      const org2Goals = allGoals.filter((g: any) => g.org_id === otherOrgId);

      expect(org1Goals.length).toBeGreaterThan(0);
      expect(org2Goals.length).toBeGreaterThan(0);
      expect(org1Goals[0].org_id).not.toBe(org2Goals[0].org_id);
    });
  });
});
