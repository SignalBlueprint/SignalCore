-- Migration: Create users table for authentication
-- Description: Creates the users table to store user accounts with password hashes
-- Date: 2025-12-31

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own record
CREATE POLICY "Users can read their own record"
  ON users FOR SELECT
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- RLS Policy: Users can update their own record
CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  )
  WITH CHECK (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- RLS Policy: Allow user creation during signup (without auth)
-- This is necessary for the signup endpoint to work
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Service accounts can read all users
CREATE POLICY "Service accounts can read all users"
  ON users FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::json->>'service' = 'true'
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE users IS 'User accounts for authentication. Passwords are hashed with bcrypt.';
COMMENT ON COLUMN users.id IS 'Primary key, used as JWT subject (sub)';
COMMENT ON COLUMN users.email IS 'Unique email address, used for login';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of user password';
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, or pending_verification';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
