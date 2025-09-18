-- Add activated_at column to existing products table
-- Run this in your Supabase SQL Editor

-- Add the activated_at column to the products table
ALTER TABLE products ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;

-- Add an index for better performance on activation queries
CREATE INDEX idx_products_activated_at ON products(activated_at);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN products.activated_at IS 'Timestamp when product stock was activated from on-hold to active';

