-- Row Level Security policies for team profiles

-- Enable RLS on member_profiles and org_settings
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- Member profiles policies
CREATE POLICY "Users can read member profiles in their org"
  ON member_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can update member profiles in their org"
  ON member_profiles FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can insert member profiles in their org"
  ON member_profiles FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

-- Org settings policies
CREATE POLICY "Users can read org settings in their org"
  ON org_settings FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can update org settings in their org"
  ON org_settings FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

CREATE POLICY "Users can insert org settings in their org"
  ON org_settings FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM members
      WHERE email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        'anonymous'
      )
    )
    OR get_user_org_id() IS NULL -- Allow if no auth (dev mode)
  );

