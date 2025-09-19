// Supabase Configuration for Ruby Auto Parts
// This file contains the database configuration and connection settings

export const supabaseConfig = {
  // Hardcoded Supabase project credentials
  url: 'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60',
  
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
