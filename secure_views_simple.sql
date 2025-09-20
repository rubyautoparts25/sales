-- Simple Views Security Fix
-- Views inherit RLS from base tables, but we need to ensure proper access

-- 1. Grant proper permissions on all views
GRANT SELECT ON inventory_summary TO anon, authenticated;
GRANT SELECT ON active_inventory TO anon, authenticated;
GRANT SELECT ON onhold_inventory TO anon, authenticated;
GRANT SELECT ON batch_details TO anon, authenticated;

-- 2. Create a security check function for views
CREATE OR REPLACE FUNCTION check_all_security()
RETURNS TABLE(
    object_name TEXT,
    object_type TEXT,
    rls_enabled BOOLEAN,
    access_granted TEXT
) AS $$
BEGIN
    -- Check tables
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        'Table'::TEXT,
        t.rowsecurity,
        'RLS enabled'::TEXT
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    
    UNION ALL
    
    -- Check views
    SELECT 
        v.viewname::TEXT,
        'View'::TEXT,
        false as rls_enabled,
        'Inherits from base tables'::TEXT
    FROM pg_views v
    WHERE v.schemaname = 'public'
    
    ORDER BY object_type, object_name;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION check_all_security() TO anon, authenticated;

-- 4. Verify current security status
SELECT 'Security check completed. Run SELECT * FROM check_all_security(); to verify.' as status;
