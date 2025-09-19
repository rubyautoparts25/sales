// Supabase Configuration for Ruby Auto Parts
// This file contains the database configuration and connection settings

export const supabaseConfig = {
  // Hardcoded Supabase project credentials
  url: 'https://aknhtapidbkwksvjsqsu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbmh0YXBpZGJrd2tzdmpzcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTMxMzgsImV4cCI6MjA3Mzg4OTEzOH0.l3oaU9sO1HfTpLKI8xkl0gikIofmYdmW3sYKJHq3zVE',
  
  // Database table names (new structure)
  tables: {
    products: 'products',
    batches: 'batches', 
    inventory: 'inventory',
    sales: 'sales',
    bills: 'bills',
    suppliers: 'suppliers'
  },
  
  // Views for optimized queries
  views: {
    inventorySummary: 'inventory_summary',
    activeInventory: 'active_inventory',
    onholdInventory: 'onhold_inventory',
    batchDetails: 'batch_details'
  },
  
  // Functions
  functions: {
    activateInventory: 'activate_inventory',
    sellInventory: 'sell_inventory',
    getNextBarcodeSequence: 'get_next_barcode_sequence'
  }
};

// Get Supabase configuration (hardcoded for now)
export const getSupabaseConfig = () => {
  return {
    url: supabaseConfig.url,
    anonKey: supabaseConfig.anonKey
  };
};
