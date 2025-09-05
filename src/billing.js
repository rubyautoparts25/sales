import { createClient } from '@supabase/supabase-js'

const supabase=createClient(
  'https://vhltvlfgauerqltntzvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobHR2bGZnYXVlcnFsdG50enZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODA4NTEsImV4cCI6MjA3MjQ1Njg1MX0.awJxp5p-NMlPaBNw-WHU8ri_4QAEHnMl_5hwIQrTAms'
)

let cart=[]
let customer={}

document.getElementById('customerForm').addEventListener('submit',e=>{
  e.preventDefault()
  customer={
    name:document.getElementById('customerName').value,
    phone:document.getElementById('customerPhone').value
  }
  document.getElementById('customerDisplay').textContent=
    `Customer: ${customer.name} (${customer.phone||''})`
})

document.getElementById('barcodeInput').addEventListener('keydown',async e=>{
  if(e.key==="Enter"){
    e.preventDefault()
    const code=e.target.value.trim()
    if(!code)return

    console.log("Scanning barcode:", code)

    const {data,error}=await supabase.from('products').select('*').eq('barcode',code).single()
    if(error||!data){alert("Product not found");return}

    const discount=parseFloat(document.getElementById('discountInput').value)||0
    const finalPrice=data.price-(data.price*discount/100)

    cart.push({
      id:data.id,
      name:data.name,
      price:data.price,
      discount,
      finalPrice,
      qty:1
    })

    renderCart()
    e.target.value=""
  }
})

function renderCart(){
  const tbody=document.querySelector('#cart-table tbody')
  tbody.innerHTML=''
  let total=0

  cart.forEach((item,idx)=>{
    const row=document.createElement('tr')
    const lineTotal=item.finalPrice*item.qty
    total+=lineTotal
    row.innerHTML=`
      <td>${item.name}</td>
      <td>${item.price}</td>
      <td>${item.discount}%</td>
      <td>${item.finalPrice.toFixed(2)}</td>
      <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${idx},this.value)"></td>
      <td>${lineTotal.toFixed(2)}</td>
      <td><button onclick="removeItem(${idx})">X</button></td>
    `
    tbody.appendChild(row)
  })

  document.getElementById('grandTotal').textContent=total.toFixed(2)
}

window.updateQty=(idx,val)=>{
  cart[idx].qty=parseInt(val)
  renderCart()
}

window.removeItem=idx=>{
  cart.splice(idx,1)
  renderCart()
}

document.getElementById('finalizeBill').addEventListener('click',async()=>{
  if(!customer.name){alert("Set customer first");return}
  if(cart.length===0){alert("Cart is empty");return}

  const total=cart.reduce((sum,i)=>sum+(i.finalPrice*i.qty),0)

  const {data:bill,error:billErr}=await supabase.from('bills').insert([{
    customer_name: customer.name,
    customer_phone: customer.phone,   
    total_amount: total
  }]).select().single()

  if(billErr){console.error("Bill error:",billErr);alert("Failed to create bill.");return}

  for (const item of cart) {
    const { error: saleError } = await supabase.from("sales").insert({
      product_id: item.id,
      quantity_sold: item.qty,
      bill_id: bill.id,             // ✅ link sale to bill
      price_at_sale: item.price    // ✅ store product price at time of sale
    })
    if (saleError) console.error("Sale insert error:", saleError)
  }

  window.latestBill={...bill,items:[...cart],customer:{...customer}}

  alert("Bill finalized. ID: "+bill.id)

  cart=[]
  renderCart()
  document.getElementById('grandTotal').textContent="0"
})

document.getElementById('printBill').addEventListener('click',()=>{
  if(!window.latestBill){alert("No bill to print");return}

  const bill=window.latestBill
  let html=`
    <h2>Shop Name</h2>
    <p>Customer: ${bill.customer.name} (${bill.customer.phone||""})</p>
    <p>Bill ID: ${bill.id}</p>
    <table border="1" cellspacing="0" cellpadding="5">
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
  `
  bill.items.forEach(it=>{
    html+=`<tr>
      <td>${it.name}</td>
      <td>${it.qty}</td>
      <td>${it.finalPrice.toFixed(2)}</td>
      <td>${(it.finalPrice*it.qty).toFixed(2)}</td>
    </tr>`
  })
  html+=`</table><h3>Grand Total: ₹${bill.total_amount}</h3>`

  const w=window.open("","PrintBill","width=600,height=600")
  w.document.write(html)
  w.print()
  w.close()
})