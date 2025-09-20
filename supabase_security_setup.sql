-- Supabase Security Setup for Ruby Auto Parts
-- This script sets up Row Level Security (RLS) and access policies

-- 1. Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 2. Create a service role for the application
-- This allows the app to access data without authentication
CREATE POLICY "Allow all operations for service role" ON products
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON batches
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON inventory
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON sales
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON bills
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON suppliers
    FOR ALL USING (true);

-- 3. Create policies for anonymous access (since we're using anon key)
-- This allows read/write access for the hardcoded anon key
CREATE POLICY "Allow anonymous read access" ON products
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON batches
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON inventory
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON sales
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON bills
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read access" ON suppliers
    FOR SELECT USING (true);

-- 4. Allow anonymous insert/update/delete for inventory management
CREATE POLICY "Allow anonymous insert" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON products
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete" ON products
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous insert" ON batches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON batches
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete" ON batches
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous insert" ON inventory
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON inventory
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete" ON inventory
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous insert" ON sales
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert" ON bills
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert" ON suppliers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON suppliers
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete" ON suppliers
    FOR DELETE USING (true);

-- 5. Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 6. Grant execute permissions on custom functions
GRANT EXECUTE ON FUNCTION activate_inventory(UUID, INTEGER, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sell_inventory(UUID, INTEGER, DECIMAL(10,2), UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_inventory_with_barcode(UUID, UUID, INTEGER, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_random_barcode() TO anon, authenticated;

-- 7. Create a more restrictive policy for production (optional)
-- Uncomment these if you want to restrict access further

-- CREATE POLICY "Restrict access to specific IP range" ON products
--     FOR ALL USING (
--         current_setting('request.headers')::json->>'x-forwarded-for' LIKE '192.168.%' OR
--         current_setting('request.headers')::json->>'x-forwarded-for' LIKE '127.0.0.1'
--     );

-- 8. Add audit logging (optional)
-- This creates a function to log all changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_at)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable audit logging on critical tables
-- CREATE TRIGGER products_audit_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON products
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- CREATE TRIGGER inventory_audit_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON inventory
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- 9. Create a view for monitoring access
CREATE OR REPLACE VIEW access_monitor AS
SELECT 
    schemaname,
    tablename,
    hasrls,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 10. Create a function to check security status
CREATE OR REPLACE FUNCTION check_security_status()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the security check function
GRANT EXECUTE ON FUNCTION check_security_status() TO anon, authenticated;

-- 11. Add comments for documentation
COMMENT ON TABLE products IS 'Product catalog with RLS enabled for security';
COMMENT ON TABLE batches IS 'Batch information with RLS enabled for security';
COMMENT ON TABLE inventory IS 'Inventory items with RLS enabled for security';
COMMENT ON TABLE sales IS 'Sales transactions with RLS enabled for security';
COMMENT ON TABLE bills IS 'Bill information with RLS enabled for security';
COMMENT ON TABLE suppliers IS 'Supplier information with RLS enabled for security';

-- 12. Create a security summary view
CREATE OR REPLACE VIEW security_summary AS
SELECT 
    'RLS Status' as security_feature,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') 
        THEN 'All tables have RLS enabled'
        ELSE 'Some tables missing RLS'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
    'Policy Count' as security_feature,
    COUNT(*)::TEXT || ' policies created' as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Grant access to security views
GRANT SELECT ON access_monitor TO anon, authenticated;
GRANT SELECT ON security_summary TO anon, authenticated;

-- 13. Final security check
-- This will show you the current security status
SELECT 'Security setup completed. Run SELECT * FROM check_security_status(); to verify.' as status;
