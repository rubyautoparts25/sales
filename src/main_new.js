import './style.css'
import { createClient } from '@supabase/supabase-js'
import JsBarcode from 'jsbarcode'

const supabase = createClient(
  'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60'
)

let currentBarcode = null

// Generate random 8-character barcode
function generateRandomBarcode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if barcode exists
async function barcodeExists(barcode) {
  const { data, error } = await supabase
    .from('products_new')
    .select('id')
    .eq('barcode', barcode)
    .single();
  
  return data !== null;
}

// Generate unique barcode with collision detection
async function generateUniqueBarcode(maxAttempts = 10) {
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

// Get current batch info
function getCurrentBatchInfo() {
  const currentBatch = sessionStorage.getItem('currentBatch');
  return currentBatch ? JSON.parse(currentBatch) : null;
}

// Create batch in database
async function createBatchInDB(vendorName, vendorInvoice) {
  const batchId = `${vendorInvoice}-${vendorName}-${Date.now()}`;
  const now = new Date();
  
  const { data, error } = await supabase
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

// Add product to inventory
async function addProductToInventory(productDetails, batchId, quantity) {
  // Generate unique barcode
  const barcode = await generateUniqueBarcode();
  
  // Find or create product
  let { data: product, error: productError } = await supabase
    .from('products_new')
    .select('*')
    .eq('part_name', productDetails.part_name)
    .eq('variant', productDetails.variant)
    .eq('class', productDetails.class)
    .eq('brand', productDetails.brand)
    .single();
  
  if (productError && productError.code === 'PGRST116') {
    // Product doesn't exist, create it
    const { data: newProduct, error: createError } = await supabase
      .from('products_new')
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
    
    if (createError) throw createError;
    product = newProduct;
  } else if (productError) {
    throw productError;
  }
  
  // Add inventory entry
  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .insert([{
      product_id: product.id,
      batch_id: batchId,
      quantity_on_hold: quantity,
      quantity_active: 0,
      expiry_date: productDetails.expiry_date
    }])
    .select()
    .single();
  
  if (inventoryError) throw inventoryError;
  
  return { product, inventory, barcode };
}

// Load inventory with aggregated quantities
async function loadInventory() {
  const { data, error } = await supabase
    .from('products_new')
    .select(`
      *,
      inventory!inner(
        quantity_on_hold,
        quantity_active,
        batch_id,
        batches!inner(
          batch_id,
          vendor_name,
          batch_date
        )
      )
    `);
  
  if (error) {
    console.error("Error loading inventory:", error);
    return;
  }
  
  // Aggregate quantities by product
  const aggregatedProducts = {};
  
  data.forEach(item => {
    const productKey = `${item.part_name}-${item.variant}-${item.class}-${item.brand}`;
    
    if (!aggregatedProducts[productKey]) {
      aggregatedProducts[productKey] = {
        ...item,
        total_on_hold: 0,
        total_active: 0,
        batches: []
      };
    }
    
    item.inventory.forEach(inv => {
      aggregatedProducts[productKey].total_on_hold += inv.quantity_on_hold;
      aggregatedProducts[productKey].total_active += inv.quantity_active;
      aggregatedProducts[productKey].batches.push({
        batch_id: inv.batches.batch_id,
        vendor_name: inv.batches.vendor_name,
        batch_date: inv.batches.batch_date,
        quantity_on_hold: inv.quantity_on_hold,
        quantity_active: inv.quantity_active
      });
    });
  });
  
  // Render the aggregated data
  renderInventoryTable(Object.values(aggregatedProducts));
}

// Render inventory table (same as before)
function renderInventoryTable(products) {
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';
  
  products.forEach(product => {
    const totalQuantity = product.total_on_hold + product.total_active;
    const totalPrice = (totalQuantity * product.price).toFixed(2);
    const formattedDate = product.created_at
      ? new Date(product.created_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : '-';
    const minStock = product.min_stock || 20;
    const quantityColor = totalQuantity < minStock ? 'red' : 'black';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.part_name}</td>
      <td>${product.variant}</td>
      <td>${product.class || '-'}</td>
      <td>${product.brand}</td>
      <td style="color:${quantityColor}">${totalQuantity}</td>
      <td>${product.total_on_hold}</td>
      <td>${product.total_active}</td>
      <td>${product.price}</td>
      <td>${totalPrice}</td>
      <td>${product.shelf_code || '-'}</td>
      <td>${product.batches.length} batches</td>
      <td>${formattedDate}</td>
      <td>
        <button onclick="editProduct('${product.id}')">Edit</button>
        <button onclick="deleteProduct('${product.id}')">Delete</button>
        <button onclick="renderBarcode('${product.barcode}')">View Barcode</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Updated form submission
document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const variant = form.variant.value.trim();
  const classOfProduct = form.class_of_product.value.trim();
  const brand = form.brand.value.trim();
  const quantity = parseInt(form.quantity.value);
  const price = parseFloat(form.price.value);
  const expiryDate = form.expiry.value || null;
  const shelf = form.shelf.value.trim();
  
  if (!name || !variant || !classOfProduct || !brand || isNaN(quantity) || isNaN(price) || !shelf) {
    alert("Please fill in all required fields correctly.");
    return;
  }
  
  // Check if batch exists
  const batchInfo = getCurrentBatchInfo();
  if (!batchInfo) {
    const createBatch = confirm("No active batch found. Would you like to create a new batch first?");
    if (createBatch) {
      window.location.href = 'batch.html';
      return;
    } else {
      alert("Please create a batch first to add inventory items.");
      return;
    }
  }
  
  try {
    // Create batch in database if not exists
    let batchData;
    if (batchInfo.id) {
      batchData = batchInfo;
    } else {
      batchData = await createBatchInDB(batchInfo.vendorName, batchInfo.invoiceNumber);
      // Update session storage with database ID
      batchInfo.id = batchData.id;
      sessionStorage.setItem('currentBatch', JSON.stringify(batchInfo));
    }
    
    const productDetails = {
      part_name: name,
      variant: variant,
      class: classOfProduct,
      brand: brand,
      price: price,
      shelf_code: shelf,
      min_stock: 20,
      expiry_date: expiryDate
    };
    
    const result = await addProductToInventory(productDetails, batchData.id, quantity);
    
    renderBarcode(result.barcode);
    alert(`"${name}" added/updated in inventory.`);
    form.reset();
    loadInventory();
  } catch (err) {
    console.error("Insert error:", err);
    alert("Something went wrong while adding the product.");
  }
});

// Delete product
window.deleteProduct = async function(id) {
  if (!confirm("Are you sure you want to delete this part?")) return;
  
  const { error } = await supabase
    .from('products_new')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error("Delete error:", error);
    alert("Failed to delete part.");
  } else {
    alert("Part removed.");
    loadInventory();
  }
};

// Edit product
window.editProduct = function(id) {
  window.location.href = `edit.html?id=${id}`;
};

// Render barcode
async function renderBarcode(barcode) {
  if (!barcode) return;
  
  JsBarcode("#barcode", barcode, {
    format: "CODE128",
    lineColor: "#000",
    width: 2,
    height: 40,
    displayValue: true
  });
  
  currentBarcode = barcode;
  document.getElementById("downloadBarcode").style.display = "inline-block";
  document.getElementById("printBarcode").style.display = "inline-block";
  
  const { data, error } = await supabase
    .from('products_new')
    .select('*')
    .eq('barcode', barcode)
    .single();
  
  if (error) {
    console.error("Error fetching product details:", error);
    document.getElementById("productDetails").innerHTML = "<p>Unable to load product details.</p>";
    return;
  }
  
  const formattedDate = data.created_at
    ? new Date(data.created_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '-';
  
  document.getElementById("productDetails").innerHTML = `
    <h3>Product Details</h3>
    <p><strong>Name:</strong> ${data.part_name}</p>
    <p><strong>Variant:</strong> ${data.variant || '-'}</p>
    <p><strong>Class:</strong> ${data.class || '-'}</p>
    <p><strong>Brand:</strong> ${data.brand}</p>
    <p><strong>Price:</strong> ₹${data.price}</p>
    <p><strong>Shelf:</strong> ${data.shelf_code || '-'}</p>
    <p><strong>Date Added:</strong> ${formattedDate}</p>
  `;
}

window.renderBarcode = renderBarcode;

// Download barcode
document.getElementById('downloadBarcode').addEventListener('click', () => {
  if (!currentBarcode) return alert("No barcode to download.");
  
  const svg = document.getElementById('barcode');
  const serializer = new XMLSerializer();
  const svgBlob = new Blob([serializer.serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode-${currentBarcode}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});

// Print barcode
document.getElementById('printBarcode').addEventListener('click', async () => {
  if (!currentBarcode) return alert("No barcode to print.");
  
  const { data, error } = await supabase
    .from('products_new')
    .select('*')
    .eq('barcode', currentBarcode)
    .single();
  
  if (error) {
    console.error("Error fetching product for print:", error);
    return alert("Failed to fetch product details.");
  }
  
  const d = new Date(data.created_at);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;
  
  const printContent = `
    <div style="text-align:center;font-family:Arial,sans-serif;font-size:12px;">
      ${document.getElementById('barcode').outerHTML}
      <div style="margin-top:2px;font-size:15px;">${data.price}</div>
      <div style="margin-top:2px;font-size:15px;">${data.part_name}</div>
      <div style="margin-top:2px;font-size:12px;">${dateCode}</div>
    </div>
  `;
  
  const printWindow = window.open('', '', 'width=200,height=150');
  printWindow.document.write('<html><head><title>Print Barcode</title></head><body>');
  printWindow.document.write(printContent);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

// Search functionality
window.filterInventory = function() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rows = document.querySelectorAll('#inventoryTable tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
};

// Auto-suggestions
const nameInput = document.getElementById('name');
const suggestions = document.createElement('ul');
suggestions.id = 'suggestions';
suggestions.style.position = 'absolute';
suggestions.style.background = 'white';
suggestions.style.border = '1px solid #ccc';
suggestions.style.listStyle = 'none';
suggestions.style.padding = '0';
suggestions.style.margin = '0';
suggestions.style.width = nameInput.offsetWidth + 'px';
nameInput.parentNode.appendChild(suggestions);

nameInput.addEventListener('input', async () => {
  const query = nameInput.value.trim();
  suggestions.innerHTML = '';
  if (query.length < 1) return;
  
  const { data, error } = await supabase
    .from('products_new')
    .select('*')
    .or(`part_name.ilike.%${query}%,variant.ilike.%${query}%`)
    .limit(5);
  
  if (error) {
    console.error("Suggestion error:", error);
    return;
  }
  
  data.forEach(product => {
    const li = document.createElement('li');
    li.textContent = `${product.part_name} (${product.variant || ''})`;
    li.style.padding = '5px';
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      nameInput.value = product.part_name;
      document.getElementById('variant').value = product.variant || '';
      document.getElementById('class_of_product').value = product.class?.trim() || '';
      document.getElementById('brand').value = product.brand || '';
      document.getElementById('quantity').value = product.quantity || 0;
      document.getElementById('price').value = product.price || 0;
      document.getElementById('shelf').value = product.shelf_code || '';
      document.getElementById('expiry').value = product.expiry_date || '';
      suggestions.innerHTML = '';
    });
    suggestions.appendChild(li);
  });
});

// Initialize
loadInventory();
