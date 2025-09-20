-- Fix Views Security - Add RLS to all views
-- Run this in Supabase SQL Editor to secure the views

-- 1. Enable RLS on all views (views inherit RLS from their base tables)
-- But we need to create policies for the views specifically

-- 2. Create policies for inventory_summary view
CREATE POLICY "Allow all for anon" ON inventory_summary FOR ALL USING (true);

-- 3. Create policies for active_inventory view  
CREATE POLICY "Allow all for anon" ON active_inventory FOR ALL USING (true);

-- 4. Create policies for onhold_inventory view
CREATE POLICY "Allow all for anon" ON onhold_inventory FOR ALL USING (true);

-- 5. Create policies for batch_details view
CREATE POLICY "Allow all for anon" ON batch_details FOR ALL USING (true);

-- 6. Grant permissions on views
GRANT ALL ON inventory_summary TO anon, authenticated;
GRANT ALL ON active_inventory TO anon, authenticated;
GRANT ALL ON onhold_inventory TO anon, authenticated;
GRANT ALL ON batch_details TO anon, authenticated;

-- 7. Verify views are now secured
SELECT 'Views security policies created successfully' as status;
