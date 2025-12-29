-- Hierarchical Goals System Migration
-- Adds goal tree structure, levels, milestones, and quest linking

-- Add hierarchical fields to goals table
ALTER TABLE goals 
  ADD COLUMN IF NOT EXISTS parent_goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 5),
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT,
  ADD COLUMN IF NOT EXISTS order_index INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS success_metric TEXT,
  ADD COLUMN IF NOT EXISTS target_value TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS plan_markdown TEXT,
  ADD COLUMN IF NOT EXISTS playbook_markdown TEXT,
  ADD COLUMN IF NOT EXISTS risks_json JSONB,
  ADD COLUMN IF NOT EXISTS dependencies_json JSONB;

-- Update status constraint to include new statuses
ALTER TABLE goals 
  DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE goals
  ADD CONSTRAINT valid_status CHECK (
    status IN ('draft', 'clarified_pending_approval', 'approved', 'denied', 'decomposed', 'active', 'paused', 'done', 'archived')
  );

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add goal_id and milestone_id to quests table
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS milestone_id TEXT REFERENCES milestones(id) ON DELETE SET NULL;

-- Create goal_rollups table for caching progress
CREATE TABLE IF NOT EXISTS goal_rollups (
  goal_id TEXT PRIMARY KEY REFERENCES goals(id) ON DELETE CASCADE,
  total_quests INT NOT NULL DEFAULT 0,
  done_quests INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_level ON goals(level);
CREATE INDEX IF NOT EXISTS idx_goals_org_id_level ON goals(org_id, level);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_quests_goal_id ON quests(goal_id);
CREATE INDEX IF NOT EXISTS idx_quests_milestone_id ON quests(milestone_id);

-- Trigger for milestones updated_at
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update goal rollups
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
        WHEN q.state = 'completed' THEN 1 -- Base XP = 1, can be enhanced later
        ELSE 0
      END
    ), 0)::INT
  INTO total_count, done_count, xp_total
  FROM goal_tree gt
  LEFT JOIN quests q ON q.goal_id = gt.id;

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

-- Trigger to update rollups when quests change
CREATE OR REPLACE FUNCTION trigger_update_goal_rollup()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rollup for the goal (and potentially parent goals)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.goal_id IS NOT NULL THEN
      PERFORM update_goal_rollup(NEW.goal_id);
      -- Also update parent goals recursively
      WITH RECURSIVE parent_goals AS (
        SELECT parent_goal_id FROM goals WHERE id = NEW.goal_id
        UNION ALL
        SELECT g.parent_goal_id FROM goals g
        INNER JOIN parent_goals p ON g.id = p.parent_goal_id
        WHERE g.parent_goal_id IS NOT NULL
      )
      SELECT update_goal_rollup(p.parent_goal_id) FROM parent_goals p WHERE p.parent_goal_id IS NOT NULL;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.goal_id IS NOT NULL THEN
      PERFORM update_goal_rollup(OLD.goal_id);
      -- Also update parent goals recursively
      WITH RECURSIVE parent_goals AS (
        SELECT parent_goal_id FROM goals WHERE id = OLD.goal_id
        UNION ALL
        SELECT g.parent_goal_id FROM goals g
        INNER JOIN parent_goals p ON g.id = p.parent_goal_id
        WHERE g.parent_goal_id IS NOT NULL
      )
      SELECT update_goal_rollup(p.parent_goal_id) FROM parent_goals p WHERE p.parent_goal_id IS NOT NULL;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quest_rollup_update
  AFTER INSERT OR UPDATE OR DELETE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_goal_rollup();

