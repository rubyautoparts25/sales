import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60'
);

let currentProduct = null;

async function fetchProductByBarcode(barcode) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error || !data) {
    showResult('Product not found with this barcode.', 'error');
    return null;
  }

  // Check if product has on-hold quantity
  if (!data.qty_on_hold || data.qty_on_hold <= 0) {
    showResult('This product has no quantity on hold to activate.', 'error');
    return null;
  }

  return data;
}

function displayProductDetails(product) {
  currentProduct = product;
  
  const productInfo = document.getElementById('productInfo');
  productInfo.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
      <div><strong>Name:</strong> ${product.name}</div>
      <div><strong>Variant:</strong> ${product.variant}</div>
      <div><strong>Brand:</strong> ${product.brand}</div>
      <div><strong>Class:</strong> ${product.class_of_product || '-'}</div>
      <div><strong>Price:</strong> ₹${product.price}</div>
      <div><strong>Shelf Code:</strong> ${product.shelf_code || '-'}</div>
      <div><strong>Total Quantity:</strong> ${product.quantity}</div>
      <div><strong>On Hold:</strong> ${product.qty_on_hold}</div>
      <div><strong>Active:</strong> ${product.qty_active || 0}</div>
      <div><strong>Barcode:</strong> ${product.barcode}</div>
    </div>
  `;

  // Set max quantity for activation
  const activateQuantityInput = document.getElementById('activateQuantity');
  const maxQuantityInfo = document.getElementById('maxQuantityInfo');
  
  activateQuantityInput.max = product.qty_on_hold;
  activateQuantityInput.value = 1;
  maxQuantityInfo.textContent = `Maximum available on hold: ${product.qty_on_hold}`;

  // Show product details section
  document.getElementById('productDetails').style.display = 'block';
}

async function activateProductQuantity(quantityToActivate) {
  if (!currentProduct) {
    showResult('No product selected for activation.', 'error');
    return;
  }

  if (quantityToActivate > currentProduct.qty_on_hold) {
    showResult('Cannot activate more quantity than available on hold.', 'error');
    return;
  }

  if (quantityToActivate <= 0) {
    showResult('Please enter a valid quantity to activate.', 'error');
    return;
  }

  try {
    const newQtyOnHold = currentProduct.qty_on_hold - quantityToActivate;
    const newQtyActive = (currentProduct.qty_active || 0) + quantityToActivate;
    
    // Update the product quantities
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        qty_on_hold: newQtyOnHold,
        qty_active: newQtyActive,
        activated_at: new Date().toISOString()
      })
      .eq('id', currentProduct.id);

    if (updateError) {
      console.error(updateError);
      showResult('Activation failed. Please try again.', 'error');
      return;
    }

    showResult(`Successfully activated ${quantityToActivate} units of "${currentProduct.name}".`, 'success');
    
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
