import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhltvlfgauerqltntzvs.supabase.co',
  'your-public-anon-key'
);

async function activateProduct(barcode) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error || !data) {
    alert("Product not found.");
    return;
  }

  if (data.status === 'active') {
    alert("Product already activated.");
    return;
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', data.id);

  if (!updateError) {
    alert(`Product "${data.name}" activated.`);
  } else {
    console.error(updateError);
    alert("Activation failed.");
  }
}

// Example usage:
document.getElementById('scanButton').addEventListener('click', () => {
  const barcode = document.getElementById('barcodeInput').value;
  activateProduct(barcode);
});
