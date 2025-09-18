-- Complete Database Setup for Ruby Auto Parts with Batch Functionality
-- Run this in your new Supabase SQL Editor

-- Create products table with batch support
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  variant VARCHAR(255) NOT NULL,
  class_of_product VARCHAR(100),
  brand VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  qty_on_hold INTEGER DEFAULT 0,
  qty_active INTEGER DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  shelf_code VARCHAR(50),
  expiry_date DATE,
  barcode VARCHAR(50) UNIQUE,
  batch_id VARCHAR(8),
  date_added DATE DEFAULT CURRENT_DATE,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create minimal batches table (4 columns only)
CREATE TABLE batches (
  batch_id VARCHAR(8) PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  arrival_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vendor_invoice VARCHAR(100) NOT NULL
);

-- Create bills table
CREATE TABLE bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  total_amount DECIMAL(10,2) NOT NULL,
  total_discount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL,
  batch_id VARCHAR(8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for batch_id
ALTER TABLE products ADD CONSTRAINT fk_products_batch_id 
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id);

-- Add indexes for performance
CREATE INDEX idx_products_batch_id ON products(batch_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_qty_active ON products(qty_active);
CREATE INDEX idx_batches_vendor_name ON batches(vendor_name);
CREATE INDEX idx_batches_arrival_timestamp ON batches(arrival_timestamp);
CREATE INDEX idx_sales_batch_id ON sales(batch_id);
CREATE INDEX idx_sales_bill_id ON sales(bill_id);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_bills_customer_name ON bills(customer_name);
CREATE INDEX idx_bills_created_at ON bills(created_at);

-- Add constraints
ALTER TABLE products ADD CONSTRAINT chk_quantity_positive 
  CHECK (quantity >= 0);

ALTER TABLE products ADD CONSTRAINT chk_qty_active_positive 
  CHECK (qty_active >= 0);

ALTER TABLE products ADD CONSTRAINT chk_qty_on_hold_positive 
  CHECK (qty_on_hold >= 0);

ALTER TABLE products ADD CONSTRAINT chk_price_positive 
  CHECK (price > 0);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now)
CREATE POLICY "Allow all operations on products" ON products
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on bills" ON bills
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on sales" ON sales
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on suppliers" ON suppliers
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on batches" ON batches
  FOR ALL USING (true);

-- Create function to update qty_active when quantity or qty_on_hold changes
CREATE OR REPLACE FUNCTION update_qty_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qty_active = GREATEST(NEW.quantity - COALESCE(NEW.qty_on_hold, 0), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update qty_active
CREATE TRIGGER trigger_update_qty_active
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_qty_active();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO batches (batch_id, vendor_name, arrival_timestamp, vendor_invoice) VALUES
('A1B2C3D4', 'ABC Auto Parts', '2025-01-15 10:30:00+00', 'INV-001'),
('X9Y8Z7W6', 'XYZ Motors', '2025-01-16 14:45:00+00', 'INV-002'),
('P5Q4R3S2', 'PQR Industries', '2025-01-17 09:15:00+00', 'INV-003');

INSERT INTO products (name, variant, class_of_product, brand, quantity, price, shelf_code, barcode, batch_id) VALUES
('Brake Pad', 'Ceramic', 'Brake', 'Bosch', 50, 1500.00, 'A1-B2', 'A1B2C3D4', 'A1B2C3D4'),
('Oil Filter', 'Standard', 'Engine', 'Mahle', 30, 800.00, 'B2-C3', 'X9Y8Z7W6', 'X9Y8Z7W6'),
('Air Filter', 'High Flow', 'Engine', 'K&N', 25, 1200.00, 'C3-D4', 'P5Q4R3S2', 'P5Q4R3S2');

INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('ABC Auto Parts', 'John Smith', '+91-9876543210', 'john@abcautoparts.com', '123 Main St, Mumbai'),
('XYZ Motors', 'Jane Doe', '+91-9876543211', 'jane@xyzmotors.com', '456 Park Ave, Delhi'),
('PQR Industries', 'Bob Johnson', '+91-9876543212', 'bob@pqrindustries.com', '789 Business Rd, Bangalore');
