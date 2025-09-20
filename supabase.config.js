// Supabase Configuration for Ruby Auto Parts
// This file contains the database configuration and connection settings

export const supabaseConfig = {
  // Supabase project credentials from environment variables
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
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

// Get Supabase configuration from environment variables
export const getSupabaseConfig = () => {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  };
};
