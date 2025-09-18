import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://bjbacpisdkcmzaqsjwmy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmFjcGlzZGtjbXphcXNqd215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzA4OTksImV4cCI6MjA3MzcwNjg5OX0.EKeiwKNCWEXtKvJMvOkhGBaHAnFbQXtE5f_ASHUN0-s'
);
