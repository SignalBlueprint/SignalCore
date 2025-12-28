-- Team profiles and org settings
-- Adds member_profiles table for Working Genius profiles and capacity
-- Adds org_settings table for team notes and org-level team configuration

-- Member profiles table
CREATE TABLE IF NOT EXISTS member_profiles (
  id TEXT PRIMARY KEY, -- Same as member_id for storage lookup
  member_id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  top2 TEXT[] NOT NULL CHECK (array_length(top2, 1) = 2),
  competency2 TEXT[] NOT NULL CHECK (array_length(competency2, 1) = 2),
  frustration2 TEXT[] NOT NULL CHECK (array_length(frustration2, 1) = 2),
  daily_capacity_minutes INTEGER NOT NULL,
  timezone TEXT,
  role TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, member_id),
  CONSTRAINT valid_wg_phase CHECK (
    -- Validate all phases are valid WGPhase values (W, I, D, G, E, T)
    (top2 <@ ARRAY['W', 'I', 'D', 'G', 'E', 'T']::TEXT[]) AND
    (competency2 <@ ARRAY['W', 'I', 'D', 'G', 'E', 'T']::TEXT[]) AND
    (frustration2 <@ ARRAY['W', 'I', 'D', 'G', 'E', 'T']::TEXT[])
  )
);

-- Org settings table (for team notes and org-level team configuration)
CREATE TABLE IF NOT EXISTS org_settings (
  id TEXT PRIMARY KEY, -- Same as org_id for storage lookup
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  team_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_profiles_org_id ON member_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON member_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON org_settings(org_id);

-- Function to update updated_at timestamp (reuse existing if available)
-- Add trigger for member_profiles
CREATE TRIGGER update_member_profiles_updated_at
  BEFORE UPDATE ON member_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for org_settings
CREATE TRIGGER update_org_settings_updated_at
  BEFORE UPDATE ON org_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

