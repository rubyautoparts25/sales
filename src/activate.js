import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bjbacpisdkcmzaqsjwmy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmFjcGlzZGtjbXphcXNqd215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzA4OTksImV4cCI6MjA3MzcwNjg5OX0.EKeiwKNCWEXtKvJMvOkhGBaHAnFbQXtE5f_ASHUN0-s'
);

async function activateProduct(barcode, quantity) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error || !data) {
    alert("Product not found.");
    return;
  }

  if (data.qty_on_hold === 0) {
    alert("Product has no on-hold stock to activate.");
    return;
  }

  if (quantity > data.qty_on_hold) {
    alert(`Cannot activate ${quantity} items. Only ${data.qty_on_hold} items are on hold.`);
    return;
  }

  if (quantity <= 0) {
    alert("Quantity must be greater than 0.");
    return;
  }

  // Move specified quantity from on-hold to active
  const newActiveQty = (data.qty_active || 0) + quantity;
  const newOnHoldQty = data.qty_on_hold - quantity;
  
  const { error: updateError } = await supabase
    .from('products')
    .update({ 
      qty_on_hold: newOnHoldQty, 
      qty_active: newActiveQty,
      activated_at: new Date().toISOString() 
    })
    .eq('id', data.id);

  if (!updateError) {
    alert(`Successfully activated ${quantity} units of "${data.name}".\nRemaining on hold: ${newOnHoldQty}`);
  } else {
    console.error(updateError);
    alert("Activation failed.");
  }
}
document.getElementById('activateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const barcode = document.getElementById('barcode').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  activateProduct(barcode, quantity);
});
