-- Ruby Auto Parts - Complete New Database Setup
-- Run this in a fresh Supabase project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products table (main product catalog)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name VARCHAR NOT NULL,
  variant VARCHAR NOT NULL,
  brand VARCHAR NOT NULL,
  class VARCHAR NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  shelf_code VARCHAR,
  min_stock INTEGER DEFAULT 20,
  barcode VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique product combinations
  UNIQUE(part_name, variant, class, brand)
);

-- 2. Batches table (vendor deliveries)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id VARCHAR UNIQUE NOT NULL,
  batch_date DATE NOT NULL,
  batch_time TIME NOT NULL,
  vendor_name VARCHAR NOT NULL,
  vendor_invoice VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR
);

-- 3. Inventory table (junction table linking products to batches)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  quantity_on_hold INTEGER DEFAULT 0,
  quantity_active INTEGER DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure positive quantities
  CHECK (quantity_on_hold >= 0),
  CHECK (quantity_active >= 0)
);

-- 4. Sales table (for billing system)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL,
  price_at_sale DECIMAL(10,2) NOT NULL,
  bill_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (quantity_sold > 0),
  CHECK (price_at_sale > 0)
);

-- 5. Bills table (for billing system)
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (total_amount >= 0)
);

-- 6. Suppliers table (for supplier management)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR NOT NULL,
  phone VARCHAR,
  product_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  invoice_number VARCHAR,
  cost_per_unit DECIMAL(10,2),
  supply_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (quantity > 0),
  CHECK (cost_per_unit >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_part_name ON products(part_name);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_class ON products(class);

CREATE INDEX idx_batches_batch_id ON batches(batch_id);
CREATE INDEX idx_batches_vendor_name ON batches(vendor_name);
CREATE INDEX idx_batches_date ON batches(batch_date);

CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_batch_id ON inventory(batch_id);
CREATE INDEX idx_inventory_quantities ON inventory(quantity_on_hold, quantity_active);

CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_bill_id ON sales(bill_id);
CREATE INDEX idx_sales_date ON sales(created_at);

CREATE INDEX idx_bills_customer ON bills(customer_name);
CREATE INDEX idx_bills_date ON bills(created_at);

CREATE INDEX idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX idx_suppliers_date ON suppliers(supply_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for inventory summary (aggregated quantities)
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
  p.id,
  p.part_name,
  p.variant,
  p.brand,
  p.class,
  p.price,
  p.shelf_code,
  p.barcode,
  p.min_stock,
  p.created_at,
  COALESCE(SUM(i.quantity_on_hold), 0) as total_on_hold,
  COALESCE(SUM(i.quantity_active), 0) as total_active,
  COALESCE(SUM(i.quantity_on_hold + i.quantity_active), 0) as total_quantity,
  COUNT(DISTINCT i.batch_id) as batch_count,
  CASE 
    WHEN COALESCE(SUM(i.quantity_on_hold + i.quantity_active), 0) < p.min_stock 
    THEN true 
    ELSE false 
  END as is_low_stock
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.part_name, p.variant, p.brand, p.class, p.price, p.shelf_code, p.barcode, p.min_stock, p.created_at;

-- Create view for active inventory (products with active stock)
CREATE OR REPLACE VIEW active_inventory AS
SELECT 
  p.id,
  p.part_name,
  p.variant,
  p.brand,
  p.class,
  p.price,
  p.shelf_code,
  p.barcode,
  p.min_stock,
  p.created_at,
  SUM(i.quantity_active) as total_active,
  SUM(i.quantity_active * p.price) as total_value
FROM products p
INNER JOIN inventory i ON p.id = i.product_id
WHERE i.quantity_active > 0
GROUP BY p.id, p.part_name, p.variant, p.brand, p.class, p.price, p.shelf_code, p.barcode, p.min_stock, p.created_at;

-- Create view for on-hold inventory (products with on-hold stock)
CREATE OR REPLACE VIEW onhold_inventory AS
SELECT 
  p.id,
  p.part_name,
  p.variant,
  p.brand,
  p.class,
  p.price,
  p.shelf_code,
  p.barcode,
  p.min_stock,
  p.created_at,
  SUM(i.quantity_on_hold) as total_on_hold,
  SUM(i.quantity_on_hold * p.price) as total_value
FROM products p
INNER JOIN inventory i ON p.id = i.product_id
WHERE i.quantity_on_hold > 0
GROUP BY p.id, p.part_name, p.variant, p.brand, p.class, p.price, p.shelf_code, p.barcode, p.min_stock, p.created_at;

-- Create view for batch details with product information
CREATE OR REPLACE VIEW batch_details AS
SELECT 
  b.id as batch_id,
  b.batch_id as batch_number,
  b.vendor_name,
  b.vendor_invoice,
  b.batch_date,
  b.batch_time,
  b.created_at,
  p.part_name,
  p.variant,
  p.brand,
  p.class,
  p.barcode,
  i.quantity_on_hold,
  i.quantity_active,
  i.expiry_date
FROM batches b
INNER JOIN inventory i ON b.id = i.batch_id
INNER JOIN products p ON i.product_id = p.id
ORDER BY b.batch_date DESC, b.created_at DESC;

-- Grant permissions for authenticated users
GRANT ALL ON products TO authenticated;
GRANT ALL ON batches TO authenticated;
GRANT ALL ON inventory TO authenticated;
GRANT ALL ON sales TO authenticated;
GRANT ALL ON bills TO authenticated;
GRANT ALL ON suppliers TO authenticated;

-- Grant read permissions on views
GRANT SELECT ON inventory_summary TO authenticated;
GRANT SELECT ON active_inventory TO authenticated;
GRANT SELECT ON onhold_inventory TO authenticated;
GRANT SELECT ON batch_details TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert some sample data for testing
INSERT INTO batches (batch_id, batch_date, batch_time, vendor_name, vendor_invoice, created_by) VALUES
('SAMPLE-001', CURRENT_DATE, CURRENT_TIME, 'Sample Vendor', 'INV-001', 'admin');

-- Get the batch ID for sample data
DO $$
DECLARE
    sample_batch_id UUID;
BEGIN
    SELECT id INTO sample_batch_id FROM batches WHERE batch_id = 'SAMPLE-001';
    
    -- Insert sample products
    INSERT INTO products (part_name, variant, brand, class, price, shelf_code, barcode) VALUES
    ('Brake Pad', 'Front', 'Bosch', 'Brake', 1500.00, 'A1', 'BRK001FP'),
    ('Oil Filter', 'Standard', 'Mann', 'Engine', 350.00, 'B2', 'OIL002ST'),
    ('Air Filter', 'Premium', 'K&N', 'Engine', 1200.00, 'B3', 'AIR003PR');
    
    -- Insert sample inventory
    INSERT INTO inventory (product_id, batch_id, quantity_on_hold, quantity_active)
    SELECT p.id, sample_batch_id, 10, 5
    FROM products p
    WHERE p.part_name IN ('Brake Pad', 'Oil Filter', 'Air Filter');
END $$;

-- Create function to get next barcode sequence (for future use)
CREATE SEQUENCE barcode_sequence START 1000;

CREATE OR REPLACE FUNCTION get_next_barcode_sequence()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('barcode_sequence');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_next_barcode_sequence() TO authenticated;

-- Create function to activate inventory (move from on-hold to active)
CREATE OR REPLACE FUNCTION activate_inventory(
  p_product_id UUID,
  p_quantity INTEGER,
  p_batch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  available_quantity INTEGER;
  remaining_quantity INTEGER := p_quantity;
  inventory_record RECORD;
BEGIN
  -- Check if we have enough on-hold quantity
  SELECT COALESCE(SUM(quantity_on_hold), 0) INTO available_quantity
  FROM inventory 
  WHERE product_id = p_product_id 
  AND (p_batch_id IS NULL OR batch_id = p_batch_id);
  
  IF available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Not enough quantity on hold. Available: %, Requested: %', available_quantity, p_quantity;
  END IF;
  
  -- Activate inventory (FIFO - First In, First Out)
  FOR inventory_record IN 
    SELECT * FROM inventory 
    WHERE product_id = p_product_id 
    AND quantity_on_hold > 0
    AND (p_batch_id IS NULL OR batch_id = p_batch_id)
    ORDER BY created_at ASC
  LOOP
    IF remaining_quantity <= 0 THEN
      EXIT;
    END IF;
    
    IF inventory_record.quantity_on_hold >= remaining_quantity THEN
      -- This batch has enough quantity
      UPDATE inventory 
      SET 
        quantity_on_hold = quantity_on_hold - remaining_quantity,
        quantity_active = quantity_active + remaining_quantity,
        updated_at = NOW()
      WHERE id = inventory_record.id;
      remaining_quantity := 0;
    ELSE
      -- Take all from this batch
      UPDATE inventory 
      SET 
        quantity_on_hold = 0,
        quantity_active = quantity_active + inventory_record.quantity_on_hold,
        updated_at = NOW()
      WHERE id = inventory_record.id;
      remaining_quantity := remaining_quantity - inventory_record.quantity_on_hold;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the activation function
GRANT EXECUTE ON FUNCTION activate_inventory(UUID, INTEGER, UUID) TO authenticated;

-- Create function to sell inventory (reduce active quantity)
CREATE OR REPLACE FUNCTION sell_inventory(
  p_product_id UUID,
  p_quantity INTEGER,
  p_price DECIMAL(10,2),
  p_bill_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  available_quantity INTEGER;
  remaining_quantity INTEGER := p_quantity;
  inventory_record RECORD;
BEGIN
  -- Check if we have enough active quantity
  SELECT COALESCE(SUM(quantity_active), 0) INTO available_quantity
  FROM inventory 
  WHERE product_id = p_product_id;
  
  IF available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Not enough active quantity. Available: %, Requested: %', available_quantity, p_quantity;
  END IF;
  
  -- Sell inventory (FIFO)
  FOR inventory_record IN 
    SELECT * FROM inventory 
    WHERE product_id = p_product_id 
    AND quantity_active > 0
    ORDER BY created_at ASC
  LOOP
    IF remaining_quantity <= 0 THEN
      EXIT;
    END IF;
    
    IF inventory_record.quantity_active >= remaining_quantity THEN
      -- This batch has enough quantity
      UPDATE inventory 
      SET 
        quantity_active = quantity_active - remaining_quantity,
        updated_at = NOW()
      WHERE id = inventory_record.id;
      
      -- Record the sale
      INSERT INTO sales (product_id, quantity_sold, price_at_sale, bill_id)
      VALUES (p_product_id, remaining_quantity, p_price, p_bill_id);
      
      remaining_quantity := 0;
    ELSE
      -- Take all from this batch
      UPDATE inventory 
      SET 
        quantity_active = 0,
        updated_at = NOW()
      WHERE id = inventory_record.id;
      
      -- Record the sale
      INSERT INTO sales (product_id, quantity_sold, price_at_sale, bill_id)
      VALUES (p_product_id, inventory_record.quantity_active, p_price, p_bill_id);
      
      remaining_quantity := remaining_quantity - inventory_record.quantity_active;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the sell function
GRANT EXECUTE ON FUNCTION sell_inventory(UUID, INTEGER, DECIMAL(10,2), UUID) TO authenticated;

-- Create RLS (Row Level Security) policies if needed
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (uncomment if you want RLS)
-- CREATE POLICY "Allow all operations for authenticated users" ON products FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON batches FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON inventory FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON sales FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON bills FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON suppliers FOR ALL TO authenticated USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Ruby Auto Parts database setup completed successfully!';
    RAISE NOTICE 'Tables created: products, batches, inventory, sales, bills, suppliers';
    RAISE NOTICE 'Views created: inventory_summary, active_inventory, onhold_inventory, batch_details';
    RAISE NOTICE 'Functions created: activate_inventory, sell_inventory, get_next_barcode_sequence';
    RAISE NOTICE 'Sample data inserted for testing';
END $$;
