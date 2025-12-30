-- Row Level Security policies for org_profiles and patterns
-- Members can read/write within their org

-- Enable RLS
ALTER TABLE org_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Org Profiles policies
CREATE POLICY "Users can read org profiles for their org"
  ON org_profiles FOR SELECT
  USING (is_member_of_org(org_id));

CREATE POLICY "Users can insert org profiles for their org"
  ON org_profiles FOR INSERT
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can update org profiles for their org"
  ON org_profiles FOR UPDATE
  USING (is_member_of_org(org_id))
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can delete org profiles for their org"
  ON org_profiles FOR DELETE
  USING (is_member_of_org(org_id));

-- Patterns policies
CREATE POLICY "Users can read patterns for their org"
  ON patterns FOR SELECT
  USING (is_member_of_org(org_id));

CREATE POLICY "Users can insert patterns for their org"
  ON patterns FOR INSERT
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can update patterns for their org"
  ON patterns FOR UPDATE
  USING (is_member_of_org(org_id))
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can delete patterns for their org"
  ON patterns FOR DELETE
  USING (is_member_of_org(org_id));
