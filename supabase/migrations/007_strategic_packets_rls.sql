-- Row Level Security policies for Strategic Packets refactor
-- Roles, org_members, outputs, knowledge_cards

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROLES POLICIES
-- ============================================================================

CREATE POLICY "Users can read roles in their orgs"
  ON roles FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage roles in their orgs"
  ON roles FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- ============================================================================
-- ORG_MEMBERS POLICIES
-- ============================================================================

CREATE POLICY "Users can read org_members in their orgs"
  ON org_members FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can manage org_members in their orgs"
  ON org_members FOR ALL
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- ============================================================================
-- OUTPUTS POLICIES
-- ============================================================================

CREATE POLICY "Users can read outputs in their orgs"
  ON outputs FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can create outputs in their orgs"
  ON outputs FOR INSERT
  WITH CHECK (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can update outputs in their orgs"
  ON outputs FOR UPDATE
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can delete outputs in their orgs"
  ON outputs FOR DELETE
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- ============================================================================
-- KNOWLEDGE_CARDS POLICIES
-- ============================================================================

CREATE POLICY "Users can read knowledge_cards in their orgs"
  ON knowledge_cards FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can create knowledge_cards in their orgs"
  ON knowledge_cards FOR INSERT
  WITH CHECK (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can update knowledge_cards in their orgs"
  ON knowledge_cards FOR UPDATE
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can delete knowledge_cards in their orgs"
  ON knowledge_cards FOR DELETE
  USING (
    is_member_of_org(org_id)
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

