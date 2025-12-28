-- Row Level Security (RLS) policies
-- Data is scoped by org_id, members can read/write within their org

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE questlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org_id from JWT
-- In production, this would extract org_id from auth.users or a user_orgs table
-- For now, we'll use a simple approach with a custom claim
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get org_id from JWT claim
  RETURN current_setting('request.jwt.claims', true)::json->>'org_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For development, allow all operations if no auth context
-- In production, you'd want stricter policies
CREATE OR REPLACE FUNCTION is_member_of_org(org_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id TEXT;
BEGIN
  user_org_id := get_user_org_id();
  
  -- If no org_id in JWT, allow access (for development)
  -- In production, return false here
  IF user_org_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if user is a member of the org
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE org_id = org_id_param
    AND email = current_setting('request.jwt.claims', true)::json->>'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Orgs policies
CREATE POLICY "Users can read orgs they belong to"
  ON orgs FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can create orgs"
  ON orgs FOR INSERT
  WITH CHECK (true); -- Allow all for now, restrict in production

-- Members policies
CREATE POLICY "Users can read members of their orgs"
  ON members FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage members in their orgs"
  ON members FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- Goals policies
CREATE POLICY "Users can read goals in their orgs"
  ON goals FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage goals in their orgs"
  ON goals FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- Questlines policies
CREATE POLICY "Users can read questlines in their orgs"
  ON questlines FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage questlines in their orgs"
  ON questlines FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- Quests policies
CREATE POLICY "Users can read quests in their orgs"
  ON quests FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage quests in their orgs"
  ON quests FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- Tasks policies
CREATE POLICY "Users can read tasks in their orgs"
  ON tasks FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage tasks in their orgs"
  ON tasks FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- AI outputs policies
CREATE POLICY "Users can read ai_outputs in their orgs"
  ON ai_outputs FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage ai_outputs in their orgs"
  ON ai_outputs FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

