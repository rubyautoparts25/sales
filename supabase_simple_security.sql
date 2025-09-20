-- Simple Supabase Security Setup for Ruby Auto Parts
-- This script enables basic Row Level Security (RLS) with minimal restrictions

-- 1. Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 2. Create simple policies that allow all operations for anonymous users
-- This works with your hardcoded anon key
CREATE POLICY "Allow all for anon" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON batches FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON bills FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON suppliers FOR ALL USING (true);

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 4. Create missing generate_random_barcode function
CREATE OR REPLACE FUNCTION generate_random_barcode()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || SUBSTRING(chars, floor(random() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant execute permissions on custom functions
GRANT EXECUTE ON FUNCTION activate_inventory(UUID, INTEGER, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sell_inventory(UUID, INTEGER, DECIMAL(10,2), UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_inventory_with_barcode(UUID, UUID, INTEGER, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_random_barcode() TO anon, authenticated;

-- 5. Create a function to verify security status
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_rls_status() TO anon, authenticated;

-- 6. Verify setup
SELECT 'RLS enabled on all tables. Run SELECT * FROM check_rls_status(); to verify.' as status;
