import { supabase } from './supabaseClient.js';

async function loadDashboard() {
  const { data: sales, error: salesError } = await supabase.from('sales').select('*');
  const { data: products, error: productsError } = await supabase.from('products').select('*');
  const { data: bills, error: billsError } = await supabase.from('bills').select('*');

  if (salesError || productsError || billsError) {
    console.error("Error loading data:", salesError || productsError || billsError);
    return;
  }

  let totalRevenue = 0;
  let totalSpend = 0;

  const salesTable = document.querySelector('#sales-table tbody');
  const billsTable = document.querySelector('#bills-table tbody');

  salesTable.innerHTML = '';
  billsTable.innerHTML = '';

  sales.forEach(sale => {
    const product = products.find(p => p.id === sale.product_id);
    const revenue = sale.quantity_sold * sale.sale_price;
    const spend = sale.quantity_sold * (product?.price || 0);
    totalRevenue += revenue;
    totalSpend += spend;

    salesTable.innerHTML += `
      <tr>
        <td>${product?.name || 'Unknown'}</td>
        <td>${sale.quantity_sold}</td>
        <td>₹${sale.sale_price}</td>
        <td>₹${revenue}</td>
      </tr>
    `;
  });

  bills.forEach(bill => {
    billsTable.innerHTML += `
      <tr>
        <td>${bill.id}</td>
        <td>${bill.customer_name || '—'}</td>
        <td>₹${bill.total_amount}</td>
        <td>${new Date(bill.created_at).toLocaleString()}</td>
      </tr>
    `;
  });

  document.getElementById('total-revenue').textContent = totalRevenue.toFixed(2);
  document.getElementById('total-spend').textContent = totalSpend.toFixed(2);
  document.getElementById('total-profit').textContent = (totalRevenue - totalSpend).toFixed(2);
}

loadDashboard();
