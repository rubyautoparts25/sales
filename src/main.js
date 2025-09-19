import './style.css'
import JsBarcode from 'jsbarcode'
import { 
  generateUniqueBarcode, 
  createBatch, 
  findProduct, 
  createProduct, 
  addInventory, 
  loadInventory as loadInventoryFromDB,
  deleteProduct as deleteProductFromDB,
  getProductBarcodes,
  getBarcodeInfo,
  supabase 
} from './database.js'

let currentBarcode=null

// Barcode generation is now handled by database.js

function getCurrentBatchInfo(){
  const currentBatch = sessionStorage.getItem('currentBatch');
  return currentBatch ? JSON.parse(currentBatch) : null;
}

// Old localStorage batch tracking functions removed - now using database

window.filterInventory=function(){
  const query=document.getElementById('searchInput').value.toLowerCase()
  const rows=document.querySelectorAll('#inventoryTable tbody tr')
  rows.forEach(row=>{
    const text=row.textContent.toLowerCase()
    row.style.display=text.includes(query)?'':'none'
  })
}

document.getElementById('productForm').addEventListener('submit', async e=>{
  e.preventDefault()
  const form=e.target
  const name=form.name.value.trim()
  const variant=form.variant.value.trim()
  const classOfProduct=form.class_of_product.value.trim()
  const brand=form.brand.value.trim()
  const quantity=parseInt(form.quantity.value)
  const price=parseFloat(form.price.value)
  const expiryDate=form.expiry.value||null
  const shelf=form.shelf.value.trim()

  if(!name||!variant||!classOfProduct||!brand||isNaN(quantity)||isNaN(price)||!shelf){
    alert("Please fill in all required fields correctly.")
    return
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
      batchData = await createBatch(batchInfo.vendorName, batchInfo.invoiceNumber);
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
    
    // Find existing product
    const existingProduct = await findProduct(productDetails);
    
    let product, barcode;
    if (existingProduct && existingProduct.price === price) {
      // Product exists with same price, use existing barcode
      product = existingProduct;
      barcode = existingProduct.barcode;
    } else {
      // Create new product with unique barcode
      barcode = await generateUniqueBarcode();
      product = await createProduct(productDetails, barcode);
    }
    
    // Add inventory entry
    await addInventory(product.id, batchData.id, quantity, expiryDate);
    
    renderBarcode(barcode);
    alert(`"${name}" added/updated in inventory.`);
    form.reset();
    loadInventory();
  } catch (err) {
    console.error("Insert error:", err);
    alert("Something went wrong while adding the product: " + err.message);
  }
})

async function loadInventory(){
  try {
    const data = await loadInventoryFromDB();
    
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    data.forEach(product => {
      const totalPrice = (product.total_quantity * product.price).toFixed(2);
      const formattedDate = product.created_at
        ? new Date(product.created_at).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-';
      const minStock = product.min_stock || 20;
      const quantityColor = product.total_quantity < minStock ? 'red' : 'black';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.part_name}</td>
        <td>${product.variant}</td>
        <td>${product.class || '-'}</td>
        <td>${product.brand}</td>
        <td style="color:${quantityColor}">${product.total_quantity}</td>
        <td>${product.total_on_hold}</td>
        <td>${product.total_active}</td>
        <td>${product.price}</td>
        <td>${totalPrice}</td>
        <td>${product.shelf_code || '-'}</td>
        <td>${product.batch_count} batches</td>
        <td>${formattedDate}</td>
        <td>
          <button onclick="editProduct('${product.id}')">Edit</button>
          <button onclick="deleteProduct('${product.id}')">Delete</button>
          <button onclick="showProductBarcodes('${product.id}')">View Barcodes</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading inventory:", error);
    alert("Failed to load inventory: " + error.message);
  }
}

window.deleteProduct = async function(id) {
  if (!confirm("Are you sure you want to delete this part?")) return;
  
  try {
    await deleteProductFromDB(id);
    alert("Part removed.");
    loadInventory();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Failed to delete part: " + error.message);
  }
}

window.editProduct=function(id){
  window.location.href=`edit.html?id=${id}`
}

// Show all barcodes for a product
window.showProductBarcodes = async function(productId) {
  try {
    const barcodes = await getProductBarcodes(productId);
    
    if (barcodes.length === 0) {
      alert('No barcodes found for this product.');
      return;
    }
    
    let barcodeList = 'Product Barcodes:\n\n';
    barcodes.forEach((item, index) => {
      barcodeList += `${index + 1}. Barcode: ${item.barcode}\n`;
      barcodeList += `   Batch: ${item.batches.batch_id}\n`;
      barcodeList += `   Vendor: ${item.batches.vendor_name}\n`;
      barcodeList += `   Invoice: ${item.batches.vendor_invoice}\n`;
      barcodeList += `   On Hold: ${item.quantity_on_hold}\n`;
      barcodeList += `   Active: ${item.quantity_active}\n`;
      if (item.expiry_date) {
        barcodeList += `   Expiry: ${item.expiry_date}\n`;
      }
      barcodeList += '\n';
    });
    
    // Show in a modal or alert
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'white';
    modal.style.border = '2px solid #333';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.maxWidth = '600px';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';
    modal.style.zIndex = '10000';
    modal.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    modal.innerHTML = `
      <h3>Product Barcodes</h3>
      <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${barcodeList}</pre>
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error fetching barcodes:', error);
    alert('Failed to load barcodes: ' + error.message);
  }
}

async function renderBarcode(barcode){
  if(!barcode) return
  JsBarcode("#barcode",barcode,{
    format:"CODE128",
    lineColor:"#000",
    width:2,
    height:40,
    displayValue:true
  })
  currentBarcode=barcode
  document.getElementById("downloadBarcode").style.display="inline-block"
  document.getElementById("printBarcode").style.display="inline-block"

  try {
    const { data, error } = await supabase.from('products').select('*').eq('barcode', barcode).single();
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
  } catch (error) {
    console.error("Error fetching product details:", error);
    document.getElementById("productDetails").innerHTML = "<p>Unable to load product details.</p>";
  }
}
window.renderBarcode=renderBarcode

document.getElementById('downloadBarcode').addEventListener('click',()=>{
  if(!currentBarcode) return alert("No barcode to download.")
  const svg=document.getElementById('barcode')
  const serializer=new XMLSerializer()
  const svgBlob=new Blob([serializer.serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"})
  const url=URL.createObjectURL(svgBlob)
  const a=document.createElement('a')
  a.href=url
  a.download=`barcode-${currentBarcode}.svg`
  a.click()
  URL.revokeObjectURL(url)
})

document.getElementById('printBarcode').addEventListener('click', async () => {
  if (!currentBarcode) return alert("No barcode to print.");

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', currentBarcode)
    .single();

  if (error) {
    console.error("Error fetching product for print:", error);
    return alert("Failed to fetch product details.");
  }
  const d = new Date(data.date_added);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;
  const printContent = `
    <div style="text-align:center;font-family:Arial,sans-serif;font-size:12px;">
      ${document.getElementById('barcode').outerHTML}
      <div style="margin-top:2px;font-size:15px;">${data.price}</div>
      <div style="margin-top:2px;font-size:15px;">${data.name}</div>
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

const nameInput=document.getElementById('name')
const suggestions=document.createElement('ul')
suggestions.id='suggestions'
suggestions.style.position='absolute'
suggestions.style.background='white'
suggestions.style.border='1px solid #ccc'
suggestions.style.borderRadius='4px'
suggestions.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'
suggestions.style.listStyle='none'
suggestions.style.padding='0'
suggestions.style.margin='0'
suggestions.style.width=nameInput.offsetWidth+'px'
suggestions.style.top='100%'
suggestions.style.left='0'
suggestions.style.zIndex='1000'
suggestions.style.maxHeight='200px'
suggestions.style.overflowY='auto'
suggestions.style.display='none'

// Make the parent container relative positioned
nameInput.parentNode.style.position='relative'
nameInput.parentNode.appendChild(suggestions)

nameInput.addEventListener('input',async()=>{
  const query=nameInput.value.trim()
  suggestions.innerHTML=''
  if(query.length<1) {
    suggestions.style.display='none'
    return
  }
  
  suggestions.style.display='block'

  try {
    // Use a more specific query to get unique products
    const { data, error } = await supabase
      .from('products')
      .select('part_name, variant, class, brand, price, shelf_code')
      .or(`part_name.ilike.%${query}%,variant.ilike.%${query}%`)
      .order('part_name')
      .limit(20); // Get more results to filter from

    if (error) {
      console.error("Suggestion error:", error);
      return;
    }

    // More robust deduplication - group by part_name, variant, and brand
    const uniqueProducts = [];
    const seen = new Set();
    
    data.forEach(product => {
      // Create a more specific key that includes brand to avoid false duplicates
      const key = `${product.part_name.toLowerCase()}|${(product.variant || '').toLowerCase()}|${(product.brand || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueProducts.push(product);
      }
    });

    // Sort by relevance (exact matches first, then partial matches)
    uniqueProducts.sort((a, b) => {
      const aExact = a.part_name.toLowerCase().startsWith(query.toLowerCase());
      const bExact = b.part_name.toLowerCase().startsWith(query.toLowerCase());
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.part_name.localeCompare(b.part_name);
    });

    // Limit to 5 unique suggestions
    uniqueProducts.slice(0, 5).forEach(product => {
      const li = document.createElement('li');
      li.textContent = `${product.part_name} (${product.variant || ''})`;
      li.style.padding = '8px 12px';
      li.style.cursor = 'pointer';
      li.style.borderBottom = '1px solid #eee';
      li.style.fontSize = '14px';
      
      // Add hover effect
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = '#f5f5f5';
      });
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = 'white';
      });
      
      li.addEventListener('click', () => {
        nameInput.value = product.part_name;
        document.getElementById('variant').value = product.variant || '';
        document.getElementById('class_of_product').value = product.class?.trim() || '';
        document.getElementById('brand').value = product.brand || '';
        document.getElementById('quantity').value = 1;
        document.getElementById('price').value = product.price || 0;
        document.getElementById('shelf').value = product.shelf_code || '';
        document.getElementById('expiry').value = '';
        suggestions.style.display = 'none';
        suggestions.innerHTML = '';
      });
      suggestions.appendChild(li);
    });
  } catch (error) {
    console.error("Suggestion error:", error);
  }
})

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!nameInput.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.style.display = 'none';
  }
});

loadInventory()
