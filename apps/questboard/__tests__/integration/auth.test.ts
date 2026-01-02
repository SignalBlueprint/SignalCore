/**
 * Integration tests for authentication flow
 * Tests signup, login, token refresh, and multi-tenant isolation
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRoutes from '../../src/routes/auth';
import { storage } from '@sb/storage';

describe('Authentication Integration Tests', () => {
  let app: express.Application;
  const testEmail1 = `test-${Date.now()}-1@example.com`;
  const testEmail2 = `test-${Date.now()}-2@example.com`;
  const testPassword = 'SecurePass123!';

  beforeAll(() => {
    // Set up minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      const users = await storage.list('users');
      const testUsers = users.filter((u: any) =>
        u.email === testEmail1 || u.email === testEmail2
      );
      for (const user of testUsers) {
        await storage.delete('users', user.id);
      }

      const orgs = await storage.list('orgs');
      const testOrgs = orgs.filter((o: any) =>
        o.name.includes('Test Org')
      );
      for (const org of testOrgs) {
        await storage.delete('orgs', org.id);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user and organization', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: testEmail1,
          password: testPassword,
          orgName: 'Test Org 1',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail1);
      expect(response.body).toHaveProperty('org');
      expect(response.body.org.name).toBe('Test Org 1');
    });

    it('should reject signup with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'weak@example.com',
          password: '123',
          orgName: 'Weak Org',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password');
    });

    it('should reject signup with duplicate email', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: testEmail1,
          password: testPassword,
          orgName: 'Duplicate Org',
        })
        .expect(409);
    });

    it('should reject signup with invalid email', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'not-an-email',
          password: testPassword,
          orgName: 'Invalid Email Org',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail1,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testEmail1);
    });

    it('should reject login with invalid password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail1,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail1,
          password: testPassword,
        });
      token = loginResponse.body.token;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail1);
      expect(response.body).toHaveProperty('org');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Multi-tenant isolation', () => {
    let token1: string;
    let token2: string;
    let org1Id: string;
    let org2Id: string;

    beforeAll(async () => {
      // Create second user in different org
      const signup2 = await request(app)
        .post('/api/auth/signup')
        .send({
          email: testEmail2,
          password: testPassword,
          orgName: 'Test Org 2',
        });
      token2 = signup2.body.token;
      org2Id = signup2.body.org.id;

      const login1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail1,
          password: testPassword,
        });
      token1 = login1.body.token;
      org1Id = login1.body.org.id;
    });

    it('should isolate users by organization', async () => {
      expect(org1Id).not.toBe(org2Id);

      const user1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const user2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(user1.body.org.id).toBe(org1Id);
      expect(user2.body.org.id).toBe(org2Id);
      expect(user1.body.org.id).not.toBe(user2.body.org.id);
    });
  });
});
