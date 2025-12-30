-- Organizational Context Enhancement
-- Adds org_profiles and patterns tables for enhanced organizational awareness
-- Part of Phase 1 of org context improvement plan

-- Organization Profiles table
-- Stores rich organizational context (mission, values, tech stack, etc.)
CREATE TABLE IF NOT EXISTS org_profiles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Identity
  mission TEXT,
  vision TEXT,
  industry TEXT,
  stage TEXT CHECK (stage IN ('startup', 'growth', 'scale', 'enterprise')),
  team_size INTEGER,

  -- Technical context
  tech_stack TEXT[], -- ["TypeScript", "React", "Supabase"]
  architecture TEXT,
  repositories TEXT[],

  -- Cultural context
  values TEXT[], -- ["Move fast", "Customer-first"]
  decision_framework TEXT,
  quality_standards TEXT,

  -- Process context
  team_structure TEXT CHECK (team_structure IN ('functional', 'pods', 'matrix', 'flat')),
  sprint_length_days INTEGER,
  current_cycle TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id)
);

-- Patterns table
-- Stores organizational learnings extracted from completed work
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Pattern classification
  type TEXT NOT NULL CHECK (type IN ('success_pattern', 'antipattern', 'process_insight', 'risk_pattern')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  context TEXT,

  -- Evidence (stored as JSONB for flexibility)
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{"type": "goal", "id": "goal-123", "title": "Goal title"}, ...]

  -- Confidence and impact
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  times_observed INTEGER DEFAULT 1,

  -- Categorization
  tags TEXT[],
  domain TEXT,

  -- Provenance
  extracted_by TEXT NOT NULL CHECK (extracted_by IN ('ai', 'manual')),
  extracted_from TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_profiles_org_id ON org_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_patterns_org_id ON patterns(org_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON patterns(status);
CREATE INDEX IF NOT EXISTS idx_patterns_domain ON patterns(domain);
CREATE INDEX IF NOT EXISTS idx_patterns_tags ON patterns USING gin(tags);

-- Add triggers for updated_at
CREATE TRIGGER update_org_profiles_updated_at
  BEFORE UPDATE ON org_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
