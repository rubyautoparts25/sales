import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhltvlfgauerqltntzvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobHR2bGZnYXVlcnFsdG50enZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODA4NTEsImV4cCI6MjA3MjQ1Njg1MX0.awJxp5p-NMlPaBNw-WHU8ri_4QAEHnMl_5hwIQrTAms'
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
document.getElementById('scanButton').addEventListener('click', () => {
  const barcode = document.getElementById('barcodeInput').value;
  activateProduct(barcode);
});
