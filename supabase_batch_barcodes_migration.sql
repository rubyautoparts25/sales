-- Migration to add batch-specific barcodes
-- This script adds barcode support to the inventory table for batch-specific tracking

-- 1. Add barcode column to inventory table
ALTER TABLE inventory ADD COLUMN barcode VARCHAR(8) UNIQUE;

-- 2. Create index for faster barcode lookups
CREATE INDEX idx_inventory_barcode ON inventory(barcode);

-- 3. Update the inventory_summary view to include barcode information
DROP VIEW IF EXISTS inventory_summary;
CREATE VIEW inventory_summary AS
SELECT 
  p.id,
  p.part_name,
  p.variant,
  p.class,
  p.brand,
  p.price,
  p.shelf_code,
  p.min_stock,
  p.created_at,
  COALESCE(SUM(i.quantity_on_hold), 0) as total_on_hold,
  COALESCE(SUM(i.quantity_active), 0) as total_active,
  COALESCE(SUM(i.quantity_on_hold + i.quantity_active), 0) as total_quantity,
  COUNT(DISTINCT i.batch_id) as batch_count,
  -- Get the most recent barcode for this product
  (SELECT i2.barcode 
   FROM inventory i2 
   WHERE i2.product_id = p.id 
   ORDER BY i2.created_at DESC 
   LIMIT 1) as latest_barcode
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.part_name, p.variant, p.class, p.brand, p.price, p.shelf_code, p.min_stock, p.created_at;

-- 4. Update active_inventory view
DROP VIEW IF EXISTS active_inventory;
CREATE VIEW active_inventory AS
SELECT 
  p.id,
  p.part_name,
  p.variant,
  p.class,
  p.brand,
  p.price,
  p.shelf_code,
  p.min_stock,
  p.created_at,
  COALESCE(SUM(i.quantity_active), 0) as total_active,
  COUNT(DISTINCT i.batch_id) as batch_count,
  (SELECT i2.barcode 
   FROM inventory i2 
   WHERE i2.product_id = p.id 
   AND i2.quantity_active > 0
   ORDER BY i2.created_at ASC 
   LIMIT 1) as barcode
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.part_name, p.variant, p.class, p.brand, p.price, p.shelf_code, p.min_stock, p.created_at
HAVING COALESCE(SUM(i.quantity_active), 0) > 0;

-- 5. Update onhold_inventory view
DROP VIEW IF EXISTS onhold_inventory;
CREATE VIEW onhold_inventory AS
SELECT 
  p.id,
  p.part_name,
  p.variant,
  p.class,
  p.brand,
  p.price,
  p.shelf_code,
  p.min_stock,
  p.created_at,
  COALESCE(SUM(i.quantity_on_hold), 0) as total_on_hold,
  COUNT(DISTINCT i.batch_id) as batch_count,
  (SELECT i2.barcode 
   FROM inventory i2 
   WHERE i2.product_id = p.id 
   AND i2.quantity_on_hold > 0
   ORDER BY i2.created_at ASC 
   LIMIT 1) as barcode
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.part_name, p.variant, p.class, p.brand, p.price, p.shelf_code, p.min_stock, p.created_at
HAVING COALESCE(SUM(i.quantity_on_hold), 0) > 0;

-- 6. Create a new view for batch details with barcodes
DROP VIEW IF EXISTS batch_details;
CREATE VIEW batch_details AS
SELECT 
  b.id as batch_id,
  b.batch_id as batch_number,
  b.batch_date,
  b.batch_time,
  b.vendor_name,
  b.vendor_invoice,
  b.created_at,
  p.part_name,
  p.variant,
  p.class,
  p.brand,
  p.price,
  i.barcode,
  i.quantity_on_hold,
  i.quantity_active,
  i.expiry_date
FROM batches b
JOIN inventory i ON b.id = i.batch_id
JOIN products p ON i.product_id = p.id
ORDER BY b.created_at DESC, p.part_name;

-- 7. Update the addInventory function to generate batch-specific barcodes
DROP FUNCTION IF EXISTS add_inventory_with_barcode(UUID, UUID, INTEGER, DATE);
CREATE OR REPLACE FUNCTION add_inventory_with_barcode(
  p_product_id UUID,
  p_batch_id UUID,
  p_quantity INTEGER,
  p_expiry_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_barcode VARCHAR(8);
  inventory_id UUID;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 20;
BEGIN
  -- Generate unique barcode with collision detection
  LOOP
    -- Generate random 8-character barcode
    new_barcode := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if barcode already exists
    IF NOT EXISTS (SELECT 1 FROM inventory WHERE barcode = new_barcode) THEN
      EXIT; -- Barcode is unique, exit loop
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      -- Fallback to timestamp-based barcode
      new_barcode := upper(substring(replace(extract(epoch from now())::text, '.', '') from -8 for 8));
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert inventory record with barcode
  INSERT INTO inventory (product_id, batch_id, quantity_on_hold, expiry_date, barcode)
  VALUES (p_product_id, p_batch_id, p_quantity, p_expiry_date, new_barcode)
  RETURNING id INTO inventory_id;
  
  RETURN inventory_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION add_inventory_with_barcode(UUID, UUID, INTEGER, DATE) TO authenticated;

-- 9. Add sample data with batch-specific barcodes (for testing)
-- This will be populated when you add inventory through the application

COMMENT ON COLUMN inventory.barcode IS 'Unique 8-character barcode for this specific inventory batch';
COMMENT ON FUNCTION add_inventory_with_barcode IS 'Adds inventory with a unique batch-specific barcode';
