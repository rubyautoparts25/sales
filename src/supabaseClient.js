import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60'
);
