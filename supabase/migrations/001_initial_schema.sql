-- Initial schema for Questboard entities
-- Includes orgs, members, goals, questlines, quests, tasks

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members table (organization membership with roles)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  org_id TEXT, -- Optional for backward compatibility
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  clarify_output JSONB,
  decompose_output JSONB,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  decomposed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'clarified_pending_approval', 'approved', 'denied', 'decomposed'))
);

-- Questlines table
CREATE TABLE IF NOT EXISTS questlines (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  epic TEXT,
  quest_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  questline_id TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  unlock_conditions JSONB NOT NULL DEFAULT '[]',
  task_ids TEXT[] DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'locked',
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  owner TEXT,
  dod TEXT,
  blockers TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI outputs table (optional, for storing clarify/decompose outputs)
CREATE TABLE IF NOT EXISTS ai_outputs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  goal_id TEXT,
  type TEXT NOT NULL, -- 'clarify' or 'decompose'
  output JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goals_org_id ON goals(org_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_questlines_goal_id ON questlines(goal_id);
CREATE INDEX IF NOT EXISTS idx_questlines_org_id ON questlines(org_id);
CREATE INDEX IF NOT EXISTS idx_quests_questline_id ON quests(questline_id);
CREATE INDEX IF NOT EXISTS idx_quests_org_id ON quests(org_id);
CREATE INDEX IF NOT EXISTS idx_quests_state ON quests(state);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON members(org_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questlines_updated_at
  BEFORE UPDATE ON questlines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

