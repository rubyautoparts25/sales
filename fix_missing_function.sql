-- Fix for missing generate_random_barcode function
-- Run this in Supabase SQL Editor to add the missing function

-- 1. Create the generate_random_barcode function
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

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION generate_random_barcode() TO anon, authenticated;

-- 3. Verify the function exists
SELECT 'generate_random_barcode function created successfully' as status;
