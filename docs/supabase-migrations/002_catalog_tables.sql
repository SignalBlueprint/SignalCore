-- Signal Blueprint - Catalog Migration
-- Creates catalog tables for product management, inventory, and vector search
-- Run this in your Supabase SQL Editor after 001_create_tables.sql

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Catalog Tables
-- ============================================================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  category TEXT,
  attributes JSONB DEFAULT '{}',
  images JSONB NOT NULL DEFAULT '[]', -- Array of ProductImage objects
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived, out_of_stock
  inventory JSONB, -- InventoryData object
  vision_analysis JSONB, -- VisionAnalysis object
  embedding vector(1536), -- OpenAI text-embedding-3-small (1536 dimensions)
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_products_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Lookbooks table
CREATE TABLE IF NOT EXISTS lookbooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  products TEXT[] NOT NULL DEFAULT '{}', -- Array of product IDs
  cover_image TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_lookbooks_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- Store settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY, -- Same as org_id
  org_id TEXT NOT NULL UNIQUE,
  store_name TEXT,
  store_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_public BOOLEAN DEFAULT FALSE,
  custom_domain TEXT,
  branding JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_store_settings_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Vector similarity search index (HNSW is faster for large datasets)
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (good for smaller datasets, faster to build)
-- CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- Lookbooks indexes
CREATE INDEX IF NOT EXISTS idx_lookbooks_org_id ON lookbooks(org_id);
CREATE INDEX IF NOT EXISTS idx_lookbooks_is_public ON lookbooks(is_public);
CREATE INDEX IF NOT EXISTS idx_lookbooks_created_at ON lookbooks(created_at DESC);

-- Store settings indexes
CREATE INDEX IF NOT EXISTS idx_store_settings_org_id ON store_settings(org_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow all for service role)
-- For production, add more restrictive policies based on org_id and user roles
CREATE POLICY "Allow all for service role" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON lookbooks FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON store_settings FOR ALL USING (true);

-- Public read policy for public lookbooks (for storefront)
CREATE POLICY "Public lookbooks are viewable by everyone"
  ON lookbooks FOR SELECT
  USING (is_public = true);

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function to search products by vector similarity
CREATE OR REPLACE FUNCTION search_products_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_org_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  description text,
  price numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM products p
  WHERE
    (filter_org_id IS NULL OR p.org_id = filter_org_id)
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookbooks_updated_at BEFORE UPDATE ON lookbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Create default org if it doesn't exist
INSERT INTO orgs (id, name, created_at)
VALUES ('default-org', 'Default Organization', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create default store settings
INSERT INTO store_settings (id, org_id, currency, is_public)
VALUES ('default-org', 'default-org', 'USD', false)
ON CONFLICT (id) DO NOTHING;
