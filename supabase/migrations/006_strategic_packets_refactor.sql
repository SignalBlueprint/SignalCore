-- Strategic Packets Refactor Migration
-- Replaces goal-leveling with Goal Specs, adds org hierarchy, cascading goals, and knowledge pool

-- ============================================================================
-- 1. ORGANIZATIONAL HIERARCHY: Roles and Org Members
-- ============================================================================

-- Roles table: defines position in org hierarchy with scope levels
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('company', 'program', 'team', 'individual')),
  reports_to_role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Org members table: links users to roles
CREATE TABLE IF NOT EXISTS org_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- References auth.users(id) or external user system
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Indexes for roles
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_roles_scope_level ON roles(scope_level);
CREATE INDEX IF NOT EXISTS idx_roles_reports_to ON roles(reports_to_role_id);

-- Indexes for org_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role_id ON org_members(role_id);

-- Trigger for roles updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for org_members updated_at
CREATE TRIGGER update_org_members_updated_at
  BEFORE UPDATE ON org_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. GOALS REFACTOR: Remove levels, add Goal Spec JSON
-- ============================================================================

-- Remove level column and related constraints
ALTER TABLE goals DROP COLUMN IF EXISTS level;

-- Add Goal Spec fields
ALTER TABLE goals
  -- Scope and ownership
  ADD COLUMN IF NOT EXISTS scope_level TEXT CHECK (scope_level IN ('company', 'program', 'team', 'individual')),
  ADD COLUMN IF NOT EXISTS owner_role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stakeholder_role_ids TEXT[] DEFAULT '{}',
  
  -- Goal Spec JSON (stores the complete spec)
  ADD COLUMN IF NOT EXISTS spec_json JSONB,
  
  -- Individual spec fields (for querying/indexing, also stored in spec_json)
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS metrics_json JSONB DEFAULT '[]'::jsonb, -- Array of {name, target, window}
  ADD COLUMN IF NOT EXISTS plan_markdown TEXT,
  ADD COLUMN IF NOT EXISTS dependencies_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risks_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_outputs_json JSONB DEFAULT '[]'::jsonb; -- Array of {type, name}

-- Update status constraint to new flow: draft → ready → active → done/archived
ALTER TABLE goals DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE goals
  ADD CONSTRAINT valid_status CHECK (
    status IN ('draft', 'ready', 'active', 'done', 'archived', 
               -- Keep old statuses for backward compatibility during migration
               'clarified_pending_approval', 'approved', 'denied', 'decomposed', 'paused')
  );

-- Add cascade tracking
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS cascade_plan_json JSONB, -- Stores cascade configuration
  ADD COLUMN IF NOT EXISTS cascade_children_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cascade_required_min INT,
  ADD COLUMN IF NOT EXISTS cascade_required_max INT;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_goals_scope_level ON goals(scope_level);
CREATE INDEX IF NOT EXISTS idx_goals_owner_role_id ON goals(owner_role_id);
CREATE INDEX IF NOT EXISTS idx_goals_status_scope ON goals(status, scope_level);

-- ============================================================================
-- 3. OUTPUTS TABLE: First-class artifacts from quests/goals
-- ============================================================================

CREATE TABLE IF NOT EXISTS outputs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  quest_id TEXT REFERENCES quests(id) ON DELETE SET NULL,
  
  type TEXT NOT NULL CHECK (type IN ('doc', 'code', 'template', 'asset', 'decision', 'metric_snapshot')),
  title TEXT NOT NULL,
  body_markdown TEXT,
  url TEXT,
  
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL, -- user_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for outputs
CREATE INDEX IF NOT EXISTS idx_outputs_org_id ON outputs(org_id);
CREATE INDEX IF NOT EXISTS idx_outputs_goal_id ON outputs(goal_id);
CREATE INDEX IF NOT EXISTS idx_outputs_quest_id ON outputs(quest_id);
CREATE INDEX IF NOT EXISTS idx_outputs_type ON outputs(type);
CREATE INDEX IF NOT EXISTS idx_outputs_tags ON outputs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_outputs_created_by ON outputs(created_by);

-- Trigger for outputs updated_at
CREATE TRIGGER update_outputs_updated_at
  BEFORE UPDATE ON outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. KNOWLEDGE CARDS TABLE: Reusable knowledge compiled from outputs
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_cards (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_output_id TEXT NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
  
  card_type TEXT NOT NULL CHECK (card_type IN ('sop', 'playbook', 'pattern', 'lesson', 'pitch', 'snippet')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for knowledge_cards
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_org_id ON knowledge_cards(org_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_source_output_id ON knowledge_cards(source_output_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_card_type ON knowledge_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_tags ON knowledge_cards USING GIN(tags);

-- Trigger for knowledge_cards updated_at
CREATE TRIGGER update_knowledge_cards_updated_at
  BEFORE UPDATE ON knowledge_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. UPDATE QUESTS: Add output requirements
-- ============================================================================

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS required_outputs_json JSONB DEFAULT '[]'::jsonb, -- Array of {type, name}
  ADD COLUMN IF NOT EXISTS output_ids TEXT[] DEFAULT '{}'; -- Links to outputs produced

-- Index for quest output_ids
CREATE INDEX IF NOT EXISTS idx_quests_output_ids ON quests USING GIN(output_ids);

-- ============================================================================
-- 6. FUNCTIONS: Spec completeness validation and cascade helpers
-- ============================================================================

-- Function to validate Goal Spec completeness
CREATE OR REPLACE FUNCTION is_goal_spec_complete(goal_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  goal_rec RECORD;
  spec JSONB;
BEGIN
  SELECT * INTO goal_rec FROM goals WHERE id = goal_id_param;
  
  IF goal_rec.spec_json IS NULL THEN
    RETURN false;
  END IF;
  
  spec := goal_rec.spec_json;
  
  -- Check required fields
  RETURN (
    (spec->>'title') IS NOT NULL AND
    (spec->>'scope_level') IS NOT NULL AND
    (spec->>'problem') IS NOT NULL AND
    (spec->>'outcome') IS NOT NULL AND
    jsonb_array_length(COALESCE(spec->'metrics', '[]'::jsonb)) >= 2 AND
    jsonb_array_length(COALESCE(spec->'metrics', '[]'::jsonb)) <= 5 AND
    (spec->>'owner_role_id') IS NOT NULL AND
    jsonb_array_length(COALESCE(spec->'milestones', '[]'::jsonb)) > 0 AND
    (spec->>'plan_markdown') IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get next scope level for cascading
CREATE OR REPLACE FUNCTION get_next_scope_level(current_scope TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE current_scope
    WHEN 'company' THEN RETURN 'program';
    WHEN 'program' THEN RETURN 'team';
    WHEN 'team' THEN RETURN 'individual';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get cascade requirements for a scope level
CREATE OR REPLACE FUNCTION get_cascade_requirements(scope_level TEXT)
RETURNS TABLE(min_children INT, max_children INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE scope_level
      WHEN 'company' THEN 2
      WHEN 'program' THEN 3
      WHEN 'team' THEN 5
      ELSE 0
    END::INT AS min_children,
    CASE scope_level
      WHEN 'company' THEN 5
      WHEN 'program' THEN 7
      WHEN 'team' THEN 20
      ELSE 0
    END::INT AS max_children;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check cascade completeness
CREATE OR REPLACE FUNCTION is_cascade_complete(goal_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  goal_rec RECORD;
  child_count INT;
  required_min INT;
  required_max INT;
  next_scope TEXT;
BEGIN
  SELECT * INTO goal_rec FROM goals WHERE id = goal_id_param;
  
  -- If no cascade required, return true
  IF goal_rec.cascade_required_min IS NULL THEN
    -- Check if this scope level should have cascade requirements
    next_scope := get_next_scope_level(goal_rec.scope_level);
    IF next_scope IS NULL THEN
      RETURN true; -- Individual goals don't cascade
    END IF;
    -- If cascade_required_min is NULL but should cascade, return false
    RETURN false;
  END IF;
  
  required_min := goal_rec.cascade_required_min;
  required_max := COALESCE(goal_rec.cascade_required_max, 999);
  
  -- Count ready/active child goals at the next scope level
  SELECT COUNT(*) INTO child_count
  FROM goals
  WHERE parent_goal_id = goal_id_param
    AND status IN ('ready', 'active');
  
  RETURN child_count >= required_min AND child_count <= required_max;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-set cascade requirements based on scope level
CREATE OR REPLACE FUNCTION set_cascade_requirements(goal_id_param TEXT)
RETURNS void AS $$
DECLARE
  goal_rec RECORD;
  next_scope TEXT;
  req_min INT;
  req_max INT;
BEGIN
  SELECT * INTO goal_rec FROM goals WHERE id = goal_id_param;
  
  -- Only set if not already set
  IF goal_rec.cascade_required_min IS NOT NULL THEN
    RETURN;
  END IF;
  
  next_scope := get_next_scope_level(goal_rec.scope_level);
  IF next_scope IS NULL THEN
    RETURN; -- Individual goals don't cascade
  END IF;
  
  SELECT min_children, max_children INTO req_min, req_max
  FROM get_cascade_requirements(goal_rec.scope_level);
  
  UPDATE goals
  SET cascade_required_min = req_min,
      cascade_required_max = req_max
  WHERE id = goal_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update goal status based on spec and cascade completeness
CREATE OR REPLACE FUNCTION update_goal_readiness(goal_id_param TEXT)
RETURNS void AS $$
DECLARE
  goal_rec RECORD;
  spec_complete BOOLEAN;
  cascade_complete BOOLEAN;
BEGIN
  SELECT * INTO goal_rec FROM goals WHERE id = goal_id_param;
  
  -- Auto-set cascade requirements if needed
  PERFORM set_cascade_requirements(goal_id_param);
  
  spec_complete := is_goal_spec_complete(goal_id_param);
  cascade_complete := is_cascade_complete(goal_id_param);
  
  -- Auto-transition to 'ready' if spec is complete
  IF goal_rec.status = 'draft' AND spec_complete AND cascade_complete THEN
    UPDATE goals SET status = 'ready' WHERE id = goal_id_param;
  END IF;
  
  -- Cannot activate if not ready
  IF goal_rec.status = 'active' AND NOT (spec_complete AND cascade_complete) THEN
    UPDATE goals SET status = 'draft' WHERE id = goal_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update readiness when spec changes
CREATE OR REPLACE FUNCTION trigger_update_goal_readiness()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_goal_readiness(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_spec_readiness_check
  AFTER INSERT OR UPDATE OF spec_json, cascade_plan_json, status ON goals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_goal_readiness();

-- ============================================================================
-- 7. UPDATE CASCADE ROLLUP FUNCTION: Include cascade children in rollup
-- ============================================================================

-- Update the existing goal rollup function to account for cascade children
CREATE OR REPLACE FUNCTION update_goal_rollup(goal_id_param TEXT)
RETURNS void AS $$
DECLARE
  total_count INT;
  done_count INT;
  xp_total INT;
BEGIN
  -- Count quests directly linked to this goal and all descendant goals
  WITH RECURSIVE goal_tree AS (
    SELECT id FROM goals WHERE id = goal_id_param
    UNION ALL
    SELECT g.id FROM goals g
    INNER JOIN goal_tree gt ON g.parent_goal_id = gt.id
  )
  SELECT 
    COUNT(DISTINCT q.id)::INT,
    COUNT(DISTINCT CASE WHEN q.state = 'completed' THEN q.id END)::INT,
    COALESCE(SUM(
      CASE 
        WHEN q.state = 'completed' THEN 1
        ELSE 0
      END
    ), 0)::INT
  INTO total_count, done_count, xp_total
  FROM goal_tree gt
  LEFT JOIN quests q ON q.goal_id = gt.id;
  
  -- Also update cascade_children_count
  UPDATE goals
  SET cascade_children_count = (
    SELECT COUNT(*) FROM goals WHERE parent_goal_id = goal_id_param
  )
  WHERE id = goal_id_param;
  
  -- Upsert rollup
  INSERT INTO goal_rollups (goal_id, total_quests, done_quests, xp, updated_at)
  VALUES (goal_id_param, total_count, done_count, xp_total, NOW())
  ON CONFLICT (goal_id) 
  DO UPDATE SET
    total_quests = EXCLUDED.total_quests,
    done_quests = EXCLUDED.done_quests,
    xp = EXCLUDED.xp,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

