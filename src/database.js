// Database service for Ruby Auto Parts
// Handles all database operations with the new normalized structure

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '../supabase.config.js'

// Initialize Supabase client with environment variable configuration
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    // Use hardcoded values for now to test
    const url = 'https://aknhtapidbkwksvjsqsu.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbmh0YXBpZGJrd2tzdmpzcXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTMxMzgsImV4cCI6MjA3Mzg4OTEzOH0.l3oaU9sO1HfTpLKI8xkl0gikIofmYdmW3sYKJHq3zVE';
    
    console.log('Initializing Supabase with hardcoded values');
    console.log('URL:', url);
    console.log('Key (first 20 chars):', anonKey.substring(0, 20) + '...');
    
    supabase = createClient(url, anonKey);
  }
  return supabase;
}

// Barcode generation
export function generateRandomBarcode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function barcodeExists(barcode) {
  const { data, error } = await getSupabaseClient()
    .from('inventory')
    .select('id')
    .eq('barcode', barcode)
    .single();
  
  return data !== null;
}

export async function generateUniqueBarcode(maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const barcode = generateRandomBarcode();
    const exists = await barcodeExists(barcode);
    
    if (!exists) {
      return barcode;
    }
  }
  
  // Fallback: use timestamp-based
  const timestamp = Date.now().toString(36).substring(-8).toUpperCase();
  return timestamp;
}

// Batch operations
export async function createBatch(vendorName, vendorInvoice) {
  const batchId = `${vendorInvoice}-${vendorName}-${Date.now()}`;
  const now = new Date();
  
  const { data, error } = await getSupabaseClient()
    .from('batches')
    .insert([{
      batch_id: batchId,
      batch_date: now.toISOString().split('T')[0],
      batch_time: now.toTimeString().split(' ')[0],
      vendor_name: vendorName,
      vendor_invoice: vendorInvoice,
      created_by: sessionStorage.getItem('rubyAutoPartsUser')
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getBatch(batchId) {
  const { data, error } = await getSupabaseClient()
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single();
  
  if (error) throw error;
  return data;
}

// Product operations
export async function createProduct(productDetails, barcode) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .insert([{
      part_name: productDetails.part_name,
      variant: productDetails.variant,
      class: productDetails.class,
      brand: productDetails.brand,
      price: productDetails.price,
      shelf_code: productDetails.shelf_code,
      min_stock: productDetails.min_stock || 20,
      barcode: barcode
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function findProduct(productDetails) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select('*')
    .eq('part_name', productDetails.part_name)
    .eq('variant', productDetails.variant)
    .eq('class', productDetails.class)
    .eq('brand', productDetails.brand)
    .single();
  
  if (error && error.code === 'PGRST116') {
    return null; // Product not found
  }
  if (error) throw error;
  return data;
}

export async function getProductByBarcode(barcode) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();
  
  if (error) throw error;
  return data;
}

// Inventory operations
export async function addInventory(productId, batchId, quantity, expiryDate = null) {
  // Use the database function to generate unique barcode
  const { data, error } = await getSupabaseClient().rpc('add_inventory_with_barcode', {
    p_product_id: productId,
    p_batch_id: batchId,
    p_quantity: quantity,
    p_expiry_date: expiryDate
  });

  if (error) throw error;
  return data;
}

export async function activateInventory(productId, quantity, batchId = null) {
  const { data, error } = await getSupabaseClient()
    .rpc('activate_inventory', {
      p_product_id: productId,
      p_quantity: quantity,
      p_batch_id: batchId
    });
  
  if (error) throw error;
  return data;
}

export async function sellInventory(productId, quantity, price, billId = null) {
  const { data, error } = await getSupabaseClient()
    .rpc('sell_inventory', {
      p_product_id: productId,
      p_quantity: quantity,
      p_price: price,
      p_bill_id: billId
    });
  
  if (error) throw error;
  return data;
}

// Query operations
export async function loadInventory() {
  const { data, error } = await getSupabaseClient()
    .from('inventory_summary')
    .select('*')
    .order('part_name');
  
  if (error) throw error;
  return data;
}

export async function loadActiveInventory() {
  const { data, error } = await getSupabaseClient()
    .from('active_inventory')
    .select('*')
    .order('part_name');
  
  if (error) throw error;
  return data;
}

export async function loadOnholdInventory() {
  const { data, error } = await getSupabaseClient()
    .from('onhold_inventory')
    .select('*')
    .order('part_name');
  
  if (error) throw error;
  return data;
}

export async function searchProducts(query) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .select('*')
    .or(`part_name.ilike.%${query}%,variant.ilike.%${query}%`)
    .limit(10);
  
  if (error) throw error;
  return data;
}

// Sales operations
export async function createBill(customerName, customerPhone, totalAmount) {
  const { data, error } = await getSupabaseClient()
    .from('bills')
    .insert([{
      customer_name: customerName,
      customer_phone: customerPhone,
      total_amount: totalAmount
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Supplier operations
export async function addSupplier(supplierData) {
  const { data, error } = await getSupabaseClient()
    .from('suppliers')
    .insert([supplierData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function loadSuppliers() {
  const { data, error } = await getSupabaseClient()
    .from('suppliers')
    .select('*')
    .order('supply_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Utility functions
export async function deleteProduct(productId) {
  const { error } = await getSupabaseClient()
    .from('products')
    .delete()
    .eq('id', productId);
  
  if (error) throw error;
  return true;
}

export async function updateProduct(productId, updates) {
  const { data, error } = await getSupabaseClient()
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Get barcode information for a specific inventory item
export async function getBarcodeInfo(barcode) {
  const { data, error } = await getSupabaseClient()
    .from('inventory')
    .select(`
      barcode,
      quantity_on_hold,
      quantity_active,
      expiry_date,
      products!inner(
        part_name,
        variant,
        brand,
        class,
        price
      ),
      batches!inner(
        batch_id,
        batch_date,
        vendor_name,
        vendor_invoice
      )
    `)
    .eq('barcode', barcode);

  if (error) throw error;
  return data;
}

// Get all barcodes for a specific product
export async function getProductBarcodes(productId) {
  const { data, error } = await getSupabaseClient()
    .from('inventory')
    .select(`
      barcode,
      quantity_on_hold,
      quantity_active,
      expiry_date,
      batches!inner(
        batch_id,
        batch_date,
        vendor_name,
        vendor_invoice
      )
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Get only active barcodes for a specific product
export async function getActiveProductBarcodes(productId) {
  const { data, error } = await getSupabaseClient()
    .from('inventory')
    .select(`
      barcode,
      quantity_on_hold,
      quantity_active,
      expiry_date,
      batches!inner(
        batch_id,
        batch_date,
        vendor_name,
        vendor_invoice
      )
    `)
    .eq('product_id', productId)
    .gt('quantity_active', 0)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Export the supabase client for direct use if needed
export { getSupabaseClient as supabase };
