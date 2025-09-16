import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60'
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
