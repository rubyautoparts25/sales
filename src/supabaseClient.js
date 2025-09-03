import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://vhltvlfgauerqltntzvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobHR2bGZnYXVlcnFsdG50enZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODA4NTEsImV4cCI6MjA3MjQ1Njg1MX0.awJxp5p-NMlPaBNw-WHU8ri_4QAEHnMl_5hwIQrTAms'
);
