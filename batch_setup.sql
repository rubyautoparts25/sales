-- Minimal Batch Table Setup for Ruby Auto Parts
-- Only 4 columns as requested: batch_id, vendor_name, arrival_timestamp, vendor_invoice

-- Create batches table
CREATE TABLE batches (
  batch_id VARCHAR(8) PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  arrival_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vendor_invoice VARCHAR(100) NOT NULL
);

-- Add batch_id column to products table
ALTER TABLE products ADD COLUMN batch_id VARCHAR(8) REFERENCES batches(batch_id);

-- Add index for performance
CREATE INDEX idx_products_batch_id ON products(batch_id);
CREATE INDEX idx_batches_vendor_name ON batches(vendor_name);
CREATE INDEX idx_batches_arrival_timestamp ON batches(arrival_timestamp);

-- Enable RLS on batches table
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Create policy for batches table
CREATE POLICY "Allow all operations on batches" ON batches
  FOR ALL USING (true);

