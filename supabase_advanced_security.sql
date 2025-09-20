-- Advanced Supabase Security Setup for Ruby Auto Parts
-- This script provides comprehensive security with IP restrictions and audit logging

-- 1. Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 2. Create IP-based access policies (more secure)
-- Replace 'YOUR_IP_ADDRESS' with your actual IP address
CREATE POLICY "Allow access from specific IP" ON products
    FOR ALL USING (
        current_setting('request.headers')::json->>'x-forwarded-for' LIKE '%YOUR_IP_ADDRESS%' OR
        current_setting('request.headers')::json->>'x-real-ip' LIKE '%YOUR_IP_ADDRESS%' OR
        inet_client_addr()::text LIKE '%YOUR_IP_ADDRESS%'
    );

CREATE POLICY "Allow access from specific IP" ON batches
    FOR ALL USING (
        current_setting('request.headers')::json->>'x-forwarded-for' LIKE '%YOUR_IP_ADDRESS%' OR
        current_setting('request.headers')::json->>'x-real-ip' LIKE '%YOUR_IP_ADDRESS%' OR
        inet_client_addr()::text LIKE '%YOUR_IP_ADDRESS%'
    );

CREATE POLICY "Allow access from specific IP" ON inventory
    FOR ALL USING (
        current_setting('request.headers')::json->>'x-forwarded-for' LIKE '%YOUR_IP_ADDRESS%' OR
        current_setting('request.headers')::json->>'x-real-ip' LIKE '%YOUR_IP_ADDRESS%' OR
        inet_client_addr()::text LIKE '%YOUR_IP_ADDRESS%'
    );

CREATE POLICY "Allow access from specific IP" ON sales
    FOR ALL USING (
        current_setting('request.headers')::json->>'x-forwarded-for' LIKE '%YOUR_IP_ADDRESS%' OR
        current_setting('request.headers')::json->>'x-real-ip' LIKE '%YOUR_IP_ADDRESS%' OR
        inet_client_addr()::text LIKE '%YOUR_IP_ADDRESS%'
    );

CREATE POLICY "Allow access from specific IP" ON bills
    FOR ALL USING (
        current_setting('request.headers')::json->>'x-forwarded-for' LIKE '%YOUR_IP_ADDRESS%' OR
        current_setting('request.headers')::json->>'x-real-ip' LIKE '%YOUR_IP_ADDRESS%' OR
        inet_client_addr()::text LIKE '%YOUR_IP_ADDRESS%'
    );

CREATE POLICY "Allow access from specific IP" ON suppliers
    FOR ALL USING (
        current_setting('request.headers')::json->>'x-forwarded-for' LIKE '%YOUR_IP_ADDRESS%' OR
        current_setting('request.headers')::json->>'x-real-ip' LIKE '%YOUR_IP_ADDRESS%' OR
        inet_client_addr()::text LIKE '%YOUR_IP_ADDRESS%'
    );

-- 3. Create audit logging table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_ip TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, user_ip, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(
            current_setting('request.headers')::json->>'x-forwarded-for',
            current_setting('request.headers')::json->>'x-real-ip',
            inet_client_addr()::text,
            'unknown'
        ),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Enable audit logging on critical tables
CREATE TRIGGER products_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER inventory_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER sales_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 7. Grant execute permissions on custom functions
GRANT EXECUTE ON FUNCTION activate_inventory(UUID, INTEGER, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sell_inventory(UUID, INTEGER, DECIMAL(10,2), UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_inventory_with_barcode(UUID, UUID, INTEGER, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_random_barcode() TO anon, authenticated;

-- 8. Create security monitoring views
CREATE OR REPLACE VIEW security_audit AS
SELECT 
    table_name,
    operation,
    user_ip,
    changed_at,
    CASE 
        WHEN operation = 'INSERT' THEN 'New record created'
        WHEN operation = 'UPDATE' THEN 'Record modified'
        WHEN operation = 'DELETE' THEN 'Record deleted'
    END as action_description
FROM audit_log
ORDER BY changed_at DESC
LIMIT 100;

-- 9. Create a function to check security status
CREATE OR REPLACE FUNCTION security_status()
RETURNS TABLE(
    feature TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'RLS Enabled'::TEXT,
        CASE 
            WHEN COUNT(*) = (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') 
            THEN 'All tables secured'
            ELSE 'Some tables not secured'
        END::TEXT
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
    
    UNION ALL
    
    SELECT 
        'Audit Logging'::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 'Active'
            ELSE 'Not active'
        END::TEXT
    FROM pg_trigger 
    WHERE tgname LIKE '%audit_trigger%'
    
    UNION ALL
    
    SELECT 
        'Policies Created'::TEXT,
        COUNT(*)::TEXT || ' policies'
    FROM pg_policies 
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Grant access to security views
GRANT SELECT ON security_audit TO anon, authenticated;
GRANT EXECUTE ON FUNCTION security_status() TO anon, authenticated;

-- 10. Final verification
SELECT 'Advanced security setup completed. Run SELECT * FROM security_status(); to verify.' as status;
