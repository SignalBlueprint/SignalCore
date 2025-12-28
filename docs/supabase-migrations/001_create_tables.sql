-- Signal Blueprint - Supabase Migration
-- Creates all tables needed for Questboard and related apps
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Core Identity Tables
-- ============================================================================

-- Organizations
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  notification_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Members (organization membership)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  working_genius_profile JSONB,
  daily_capacity_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_members_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Member Profiles (Working Genius profiles)
CREATE TABLE IF NOT EXISTS member_profiles (
  id TEXT PRIMARY KEY, -- Same as member_id
  member_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  top2 TEXT[] NOT NULL, -- Array of 2 WGPhase values
  competency2 TEXT[] NOT NULL, -- Array of 2 WGPhase values
  frustration2 TEXT[] NOT NULL, -- Array of 2 WGPhase values
  daily_capacity_minutes INTEGER NOT NULL,
  timezone TEXT,
  role TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_profiles_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Questboard Tables
-- ============================================================================

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL, -- draft, clarified_pending_approval, approved, denied, decomposed
  clarify_output JSONB,
  decompose_output JSONB,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  decomposed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_goals_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Questlines
CREATE TABLE IF NOT EXISTS questlines (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  epic TEXT,
  quest_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_questlines_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_questlines_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Quests
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  questline_id TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  unlock_conditions JSONB NOT NULL DEFAULT '[]',
  task_ids TEXT[] NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'locked', -- locked, unlocked, in-progress, completed
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_quests_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_quests_questline FOREIGN KEY (questline_id) REFERENCES questlines(id) ON DELETE CASCADE
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_id TEXT,
  quest_id TEXT, -- Optional: task may belong to a quest
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL, -- todo, in-progress, blocked, done
  priority TEXT NOT NULL, -- low, medium, high, urgent
  owner TEXT, -- Member ID
  phase TEXT, -- W, I, D, G, E, T (Working Genius phase)
  estimated_minutes INTEGER,
  assignment_reason JSONB,
  expand_state TEXT, -- ready, expanded, locked
  expansion_depth INTEGER,
  expand_cost_estimate NUMERIC,
  acceptance_criteria TEXT[],
  parent_task_id TEXT, -- For subtasks
  dod TEXT, -- Definition of Done
  blockers TEXT[],
  tags TEXT[],
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  sync_to_github BOOLEAN DEFAULT FALSE,
  github JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_tasks_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_quest FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_owner FOREIGN KEY (owner) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================================
-- Templates
-- ============================================================================

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_by TEXT NOT NULL, -- User ID or email
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT fk_templates_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Template Questlines
CREATE TABLE IF NOT EXISTS template_questlines (
  id TEXT PRIMARY KEY, -- Same as template_id
  template_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,
  questline_definition JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_template_questlines_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_questlines_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Questmaster & Sprint Planning
-- ============================================================================

-- Member Quest Decks (daily decks)
CREATE TABLE IF NOT EXISTS member_quest_decks (
  id TEXT PRIMARY KEY, -- Format: deck-{memberId}-{date}
  member_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  date DATE NOT NULL, -- ISO date string (YYYY-MM-DD)
  deck_entries JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_decks_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_decks_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Sprint Plans
CREATE TABLE IF NOT EXISTS sprint_plans (
  id TEXT PRIMARY KEY, -- Format: sprint-{orgId}-{weekStart}
  org_id TEXT NOT NULL,
  week_start DATE NOT NULL, -- ISO date string (YYYY-MM-DD) - Monday of the week
  week_end DATE NOT NULL, -- ISO date string (YYYY-MM-DD) - Friday of the week
  member_plans JSONB NOT NULL DEFAULT '[]', -- Array of member plan objects
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, active, completed
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sprint_plans_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Jobs & System
-- ============================================================================

-- Job Run Summaries
CREATE TABLE IF NOT EXISTS job_run_summaries (
  id TEXT PRIMARY KEY, -- Format: summary-{jobId}-{orgId}-{timestamp}
  org_id TEXT NOT NULL,
  job_id TEXT NOT NULL, -- e.g., "daily.questmaster", "weekly.sprintplanner"
  status TEXT NOT NULL, -- success, failed, partial
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  error TEXT, -- Error message if failed
  stats JSONB NOT NULL DEFAULT '{}', -- Execution statistics
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_job_summaries_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Org Settings
CREATE TABLE IF NOT EXISTS org_settings (
  id TEXT PRIMARY KEY, -- Same as org_id
  org_id TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_org_settings_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Members
CREATE INDEX IF NOT EXISTS idx_members_org_id ON members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- Member Profiles
CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON member_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_org_id ON member_profiles(org_id);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_org_id ON goals(org_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- Questlines
CREATE INDEX IF NOT EXISTS idx_questlines_org_id ON questlines(org_id);
CREATE INDEX IF NOT EXISTS idx_questlines_goal_id ON questlines(goal_id);

-- Quests
CREATE INDEX IF NOT EXISTS idx_quests_org_id ON quests(org_id);
CREATE INDEX IF NOT EXISTS idx_quests_questline_id ON quests(questline_id);
CREATE INDEX IF NOT EXISTS idx_quests_state ON quests(state);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_quest_id ON tasks(quest_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_org_id ON templates(org_id);

-- Template Questlines
CREATE INDEX IF NOT EXISTS idx_template_questlines_template_id ON template_questlines(template_id);
CREATE INDEX IF NOT EXISTS idx_template_questlines_org_id ON template_questlines(org_id);

-- Member Quest Decks
CREATE INDEX IF NOT EXISTS idx_member_quest_decks_member_id ON member_quest_decks(member_id);
CREATE INDEX IF NOT EXISTS idx_member_quest_decks_org_id ON member_quest_decks(org_id);
CREATE INDEX IF NOT EXISTS idx_member_quest_decks_date ON member_quest_decks(date);

-- Sprint Plans
CREATE INDEX IF NOT EXISTS idx_sprint_plans_org_id ON sprint_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_sprint_plans_week_start ON sprint_plans(week_start);

-- Job Run Summaries
CREATE INDEX IF NOT EXISTS idx_job_run_summaries_org_id ON job_run_summaries(org_id);
CREATE INDEX IF NOT EXISTS idx_job_run_summaries_job_id ON job_run_summaries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_run_summaries_started_at ON job_run_summaries(started_at);

-- ============================================================================
-- Row Level Security (RLS) - Optional but Recommended
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE questlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_questlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_quest_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_run_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies: Allow all operations for service role (used by backend)
-- For production, you'll want to add more restrictive policies based on org_id
CREATE POLICY "Allow all for service role" ON orgs FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON members FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON member_profiles FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON goals FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON questlines FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON quests FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON templates FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON template_questlines FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON member_quest_decks FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON sprint_plans FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON job_run_summaries FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON org_settings FOR ALL USING (true);

