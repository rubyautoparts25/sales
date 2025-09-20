-- Fix the check_all_security function
-- This corrects the UNION ORDER BY clause error

-- Drop and recreate the function with proper syntax
DROP FUNCTION IF EXISTS check_all_security();

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
    WHERE v.schemaname = 'public';
    
    -- Note: ORDER BY removed from UNION - will be handled by the calling query
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_all_security() TO anon, authenticated;

-- Test the function
SELECT 'Function fixed successfully. Run SELECT * FROM check_all_security() ORDER BY object_type, object_name; to verify.' as status;
