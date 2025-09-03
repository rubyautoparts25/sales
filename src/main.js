import './style.css';
import { createClient } from '@supabase/supabase-js';
import JsBarcode from 'jsbarcode';

const supabase = createClient(
  'https://vhltvlfgauerqltntzvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobHR2bGZnYXVlcnFsdG50enZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODA4NTEsImV4cCI6MjA3MjQ1Njg1MX0.awJxp5p-NMlPaBNw-WHU8ri_4QAEHnMl_5hwIQrTAms'
);

// 🧾 Add product to inventory
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  const name = form.name.value.trim();
  const variant = form.variant.value.trim();
  const classOfProduct = form.class.value.trim();
  const brand = form.brand.value.trim();
  const quantity = parseInt(form.quantity.value);
  const price = parseFloat(form.price.value);
  const expiryDate = form.expiry.value || null;
  const shelf = form.shelf.value.trim();
  const barcode = crypto.randomUUID();

  if (!name || !variant || !classOfProduct || !brand || isNaN(quantity) || isNaN(price) || !shelf) {
    alert("Please fill in all required fields correctly.");
    return;
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', barcode);

    if (fetchError) throw fetchError;
    if (existing.length > 0) {
      alert("Duplicate barcode detected. Please try again.");
      return;
    }

    const { error: insertError } = await supabase.from('products').insert([{
      name,
      variant,
      class: classOfProduct,
      brand,
      quantity,
      price,
      expiry_date: expiryDate,
      shelf_code: shelf,
      barcode,
      status: 'on_hold'
    }]);

    if (insertError) throw insertError;

    JsBarcode("#barcode", barcode, { format: "CODE128" });
    alert(`✅ "${name}" added to inventory (on hold).`);
    form.reset();
    loadInventory();
  } catch (err) {
    console.error("Insert error:", err);
    alert("Something went wrong while adding the product.");
  }
});

// 📦 Load inventory table
async function loadInventory() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'on_hold');

  if (error) {
    console.error("Error loading inventory:", error);
    return;
  }

  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';

  data.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.variant}</td>
      <td>${product.brand}</td>
      <td>${product.shelf_code || '-'}</td>
      <td>${product.status}</td>
      <td>
        <button class="edit-btn" onclick="location.href='edit.html?id=${product.id}'">✏️ Edit</button>

        <button onclick="deleteProduct('${product.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 🗑️ Delete product
window.deleteProduct = async function(id) {
  if (!confirm("Are you sure you want to delete this part?")) return;

  const { error } = await supabase
    .from('products')
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

// ✏️ Edit shelf code
window.editProduct = async function(id) {
  const newShelf = prompt("Enter new shelf code:");
  if (!newShelf) return;

  const { error } = await supabase
    .from('products')
    .update({ shelf_code: newShelf })
    .eq('id', id);

  if (error) {
    console.error("Update error:", error);
    alert("Failed to update shelf.");
  } else {
    alert("Shelf updated.");
    loadInventory();
  }
};

// 🔄 Load inventory on page load
window.addEventListener('DOMContentLoaded', loadInventory);
