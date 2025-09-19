import { supabase, activateInventory } from './database.js';

let currentProduct = null;

async function fetchProductByBarcode(barcode) {
  try {
    // First try to get from onhold_inventory view
    const { data: onholdData, error: onholdError } = await supabase
      .from('onhold_inventory')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (!onholdError && onholdData && onholdData.total_on_hold > 0) {
      return onholdData;
    }

    // If not found in onhold_inventory, try products table
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error || !data) {
      showResult('Product not found with this barcode.', 'error');
      return null;
    }

    // Check if product has any on-hold inventory
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('qty_on_hold')
      .eq('product_id', data.id)
      .gt('qty_on_hold', 0);

    if (inventoryError || !inventoryData || inventoryData.length === 0) {
      showResult('This product has no quantity on hold to activate.', 'error');
      return null;
    }

    const totalOnHold = inventoryData.reduce((sum, inv) => sum + (inv.qty_on_hold || 0), 0);
    return { ...data, total_on_hold: totalOnHold };
  } catch (error) {
    console.error('Error fetching product:', error);
    showResult('Error fetching product details.', 'error');
    return null;
  }
}

function displayProductDetails(product) {
  currentProduct = product;
  
  const productInfo = document.getElementById('productInfo');
  productInfo.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
      <div><strong>Name:</strong> ${product.part_name}</div>
      <div><strong>Variant:</strong> ${product.variant}</div>
      <div><strong>Brand:</strong> ${product.brand}</div>
      <div><strong>Class:</strong> ${product.class || '-'}</div>
      <div><strong>Price:</strong> ₹${product.price}</div>
      <div><strong>Shelf Code:</strong> ${product.shelf_code || '-'}</div>
      <div><strong>On Hold:</strong> ${product.total_on_hold}</div>
      <div><strong>Barcode:</strong> ${product.barcode}</div>
    </div>
  `;

  // Set max quantity for activation
  const activateQuantityInput = document.getElementById('activateQuantity');
  const maxQuantityInfo = document.getElementById('maxQuantityInfo');
  
  activateQuantityInput.max = product.total_on_hold;
  activateQuantityInput.value = 1;
  maxQuantityInfo.textContent = `Maximum available on hold: ${product.total_on_hold}`;

  // Show product details section
  document.getElementById('productDetails').style.display = 'block';
}

async function activateProductQuantity(quantityToActivate) {
  if (!currentProduct) {
    showResult('No product selected for activation.', 'error');
    return;
  }

  if (quantityToActivate > currentProduct.total_on_hold) {
    showResult('Cannot activate more quantity than available on hold.', 'error');
    return;
  }

  if (quantityToActivate <= 0) {
    showResult('Please enter a valid quantity to activate.', 'error');
    return;
  }

  try {
    // Use the database function to activate inventory
    const { data, error } = await supabase.rpc('activate_inventory', {
      p_product_id: currentProduct.id,
      p_quantity: quantityToActivate
    });

    if (error) {
      console.error('Activation error:', error);
      showResult('Activation failed. Please try again.', 'error');
      return;
    }

    showResult(`Successfully activated ${quantityToActivate} units of "${currentProduct.part_name}".`, 'success');
    
    // Hide product details and reset form
    document.getElementById('productDetails').style.display = 'none';
    document.getElementById('activateForm').reset();
    currentProduct = null;
    
  } catch (error) {
    console.error('Activation error:', error);
    showResult('An error occurred during activation.', 'error');
  }
}

function showResult(message, type) {
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = message;
  resultDiv.className = `result ${type}`;
  resultDiv.style.display = 'block';
  
  // Hide result after 5 seconds
  setTimeout(() => {
    resultDiv.style.display = 'none';
  }, 5000);
}

function hideProductDetails() {
  document.getElementById('productDetails').style.display = 'none';
  document.getElementById('activateForm').reset();
  currentProduct = null;
}

// Event listeners
document.getElementById('activateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const barcode = document.getElementById('barcode').value.trim();
  
  if (!barcode) {
    showResult('Please enter a barcode.', 'error');
    return;
  }

  const product = await fetchProductByBarcode(barcode);
  if (product) {
    displayProductDetails(product);
  }
});

document.getElementById('activateQuantityForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const quantityToActivate = parseInt(document.getElementById('activateQuantity').value);
  await activateProductQuantity(quantityToActivate);
});

document.getElementById('cancelActivation').addEventListener('click', hideProductDetails);
