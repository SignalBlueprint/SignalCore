-- Signal Blueprint - Catalog Analytics Migration
-- Creates analytics tables and functions for comprehensive tracking and insights
-- Run this in your Supabase SQL Editor after 002_catalog_tables.sql

-- ============================================================================
-- Analytics Events Table
-- ============================================================================

-- Track all user interactions and events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- product_view, product_search, cart_add, cart_remove, checkout_start, order_placed, etc.
  event_data JSONB NOT NULL DEFAULT '{}', -- Flexible event data
  session_id TEXT, -- User session identifier
  product_id TEXT, -- Related product (if applicable)
  order_id TEXT, -- Related order (if applicable)
  metadata JSONB DEFAULT '{}', -- Additional metadata (user agent, referrer, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_analytics_events_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_analytics_events_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ============================================================================
-- Daily Analytics Aggregates
-- ============================================================================

-- Aggregated daily metrics for performance
CREATE TABLE IF NOT EXISTS daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  date DATE NOT NULL,

  -- Revenue metrics
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value NUMERIC(10, 2) DEFAULT 0,

  -- Product metrics
  products_viewed INTEGER DEFAULT 0,
  unique_products_viewed INTEGER DEFAULT 0,
  products_added_to_cart INTEGER DEFAULT 0,

  -- Search metrics
  total_searches INTEGER DEFAULT 0,
  semantic_searches INTEGER DEFAULT 0,
  searches_with_results INTEGER DEFAULT 0,
  average_results_per_search NUMERIC(6, 2) DEFAULT 0,

  -- Conversion metrics
  cart_additions INTEGER DEFAULT 0,
  checkout_starts INTEGER DEFAULT 0,
  orders_completed INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage

  -- Customer metrics
  unique_sessions INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,

  -- Cart metrics
  carts_created INTEGER DEFAULT 0,
  carts_abandoned INTEGER DEFAULT 0,
  abandonment_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_daily_analytics_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT uq_daily_analytics_org_date UNIQUE(org_id, date)
);

-- ============================================================================
-- Product Performance Analytics
-- ============================================================================

-- Track product performance metrics
CREATE TABLE IF NOT EXISTS product_analytics (
  product_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  date DATE NOT NULL,

  -- View metrics
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0, -- Approximate unique sessions

  -- Engagement metrics
  cart_additions INTEGER DEFAULT 0,
  cart_removals INTEGER DEFAULT 0,

  -- Sales metrics
  times_ordered INTEGER DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  revenue NUMERIC(12, 2) DEFAULT 0,

  -- Search metrics
  times_in_search_results INTEGER DEFAULT 0,
  search_click_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (product_id, date),
  CONSTRAINT fk_product_analytics_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_analytics_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Search Analytics
-- ============================================================================

-- Track search query performance
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  query TEXT NOT NULL,
  search_type TEXT NOT NULL, -- semantic, text, hybrid
  results_count INTEGER NOT NULL,
  filters JSONB DEFAULT '{}', -- Category, price range, etc.
  session_id TEXT,
  clicked_products TEXT[], -- Products clicked from results
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_search_analytics_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Customer Analytics
-- ============================================================================

-- Track customer behavior and lifetime value
CREATE TABLE IF NOT EXISTS customer_analytics (
  email TEXT NOT NULL,
  org_id TEXT NOT NULL,

  -- Order metrics
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(12, 2) DEFAULT 0,
  average_order_value NUMERIC(10, 2) DEFAULT 0,

  -- Engagement metrics
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  days_since_last_order INTEGER,

  -- Product preferences
  favorite_categories TEXT[],
  total_products_purchased INTEGER DEFAULT 0,

  -- Session metrics
  total_sessions INTEGER DEFAULT 0,
  total_cart_additions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (email, org_id),
  CONSTRAINT fk_customer_analytics_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_id ON analytics_events(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product ON analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_order ON analytics_events(order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_composite ON analytics_events(org_id, event_type, created_at DESC);

-- Daily analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_org_id ON daily_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_org_date ON daily_analytics(org_id, date DESC);

-- Product analytics indexes
CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_date ON product_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_org ON product_analytics(org_id, date DESC);

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_org ON search_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);

-- Customer analytics indexes
CREATE INDEX IF NOT EXISTS idx_customer_analytics_org ON customer_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_email ON customer_analytics(email);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_total_spent ON customer_analytics(total_spent DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "Allow all for service role" ON analytics_events;
CREATE POLICY "Allow all for service role" ON analytics_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON daily_analytics;
CREATE POLICY "Allow all for service role" ON daily_analytics FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON product_analytics;
CREATE POLICY "Allow all for service role" ON product_analytics FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON search_analytics;
CREATE POLICY "Allow all for service role" ON search_analytics FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON customer_analytics;
CREATE POLICY "Allow all for service role" ON customer_analytics FOR ALL USING (true);

-- ============================================================================
-- Analytics Functions
-- ============================================================================

-- Trigger to auto-update updated_at
CREATE TRIGGER update_daily_analytics_updated_at BEFORE UPDATE ON daily_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_analytics_updated_at BEFORE UPDATE ON product_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_analytics_updated_at BEFORE UPDATE ON customer_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Analytics Helper Functions
-- ============================================================================

-- Function to get top selling products
CREATE OR REPLACE FUNCTION get_top_selling_products(
  filter_org_id TEXT,
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id TEXT,
  product_name TEXT,
  total_quantity INTEGER,
  total_revenue NUMERIC,
  times_ordered INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.product_id,
    p.name as product_name,
    SUM(pa.quantity_sold)::INTEGER as total_quantity,
    SUM(pa.revenue) as total_revenue,
    SUM(pa.times_ordered)::INTEGER as times_ordered
  FROM product_analytics pa
  JOIN products p ON p.id = pa.product_id
  WHERE
    pa.org_id = filter_org_id
    AND pa.date >= CURRENT_DATE - days_back
  GROUP BY pa.product_id, p.name
  ORDER BY total_revenue DESC
  LIMIT limit_count;
END;
$$;

-- Function to get customer lifetime value rankings
CREATE OR REPLACE FUNCTION get_top_customers(
  filter_org_id TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  email TEXT,
  total_orders INTEGER,
  total_spent NUMERIC,
  average_order_value NUMERIC,
  days_since_last_order INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.email,
    ca.total_orders,
    ca.total_spent,
    ca.average_order_value,
    ca.days_since_last_order
  FROM customer_analytics ca
  WHERE ca.org_id = filter_org_id
  ORDER BY ca.total_spent DESC
  LIMIT limit_count;
END;
$$;

-- Function to get search performance insights
CREATE OR REPLACE FUNCTION get_top_search_queries(
  filter_org_id TEXT,
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  avg_results NUMERIC,
  click_through_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.query,
    COUNT(*)::BIGINT as search_count,
    AVG(sa.results_count) as avg_results,
    (SUM(CASE WHEN array_length(sa.clicked_products, 1) > 0 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100) as click_through_rate
  FROM search_analytics sa
  WHERE
    sa.org_id = filter_org_id
    AND sa.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY sa.query
  ORDER BY search_count DESC
  LIMIT limit_count;
END;
$$;

-- Function to calculate conversion funnel metrics
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  filter_org_id TEXT,
  start_date DATE DEFAULT CURRENT_DATE - 30,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  product_views BIGINT;
  cart_adds BIGINT;
  checkouts BIGINT;
  orders BIGINT;
BEGIN
  -- Get counts for each stage
  SELECT COUNT(*) INTO product_views
  FROM analytics_events
  WHERE org_id = filter_org_id
    AND event_type = 'product_view'
    AND created_at::DATE BETWEEN start_date AND end_date;

  SELECT COUNT(*) INTO cart_adds
  FROM analytics_events
  WHERE org_id = filter_org_id
    AND event_type = 'cart_add'
    AND created_at::DATE BETWEEN start_date AND end_date;

  SELECT COUNT(*) INTO checkouts
  FROM analytics_events
  WHERE org_id = filter_org_id
    AND event_type = 'checkout_start'
    AND created_at::DATE BETWEEN start_date AND end_date;

  SELECT COUNT(*) INTO orders
  FROM analytics_events
  WHERE org_id = filter_org_id
    AND event_type = 'order_placed'
    AND created_at::DATE BETWEEN start_date AND end_date;

  -- Return funnel stages with conversion rates
  RETURN QUERY
  SELECT 'Product Views'::TEXT, product_views, 100.0::NUMERIC
  UNION ALL
  SELECT 'Cart Additions'::TEXT, cart_adds,
    CASE WHEN product_views > 0 THEN (cart_adds::NUMERIC / product_views * 100) ELSE 0 END
  UNION ALL
  SELECT 'Checkout Started'::TEXT, checkouts,
    CASE WHEN cart_adds > 0 THEN (checkouts::NUMERIC / cart_adds * 100) ELSE 0 END
  UNION ALL
  SELECT 'Orders Placed'::TEXT, orders,
    CASE WHEN checkouts > 0 THEN (orders::NUMERIC / checkouts * 100) ELSE 0 END;
END;
$$;

-- Function to get revenue trends
CREATE OR REPLACE FUNCTION get_revenue_trend(
  filter_org_id TEXT,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  orders INTEGER,
  average_order_value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.date,
    da.total_revenue as revenue,
    da.total_orders as orders,
    da.average_order_value
  FROM daily_analytics da
  WHERE
    da.org_id = filter_org_id
    AND da.date >= CURRENT_DATE - days_back
  ORDER BY da.date DESC;
END;
$$;

-- ============================================================================
-- Event Type Constants (for reference in application code)
-- ============================================================================

-- Event types:
-- - product_view: User views a product detail
-- - product_search: User performs a search
-- - cart_add: Product added to cart
-- - cart_remove: Product removed from cart
-- - cart_update: Cart quantity updated
-- - checkout_start: User begins checkout
-- - checkout_complete: Checkout form submitted
-- - order_placed: Order successfully created
-- - order_updated: Order status changed
-- - product_created: New product added
-- - product_updated: Product edited
-- - inventory_updated: Stock levels changed
