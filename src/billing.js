import { supabase, sellInventory } from './database.js'

let cart=[]
let customer={}
let scanLock=false
let billPrinted=false

document.getElementById('customerForm').addEventListener('submit',e=>{
  e.preventDefault()
  customer={
    name:document.getElementById('customerName').value.trim(),
    phone:document.getElementById('customerPhone').value.trim()
  }
  const customerDisplay = document.getElementById('customerDisplay')
  customerDisplay.innerHTML = `✅ <strong>${customer.name}</strong> ${customer.phone ? `(${customer.phone})` : ''}`
  customerDisplay.style.display = 'block'
  billPrinted=false // Reset print flag when customer changes
})

document.getElementById('barcodeInput').addEventListener('input',e=>{
  const code=e.target.value.trim()
  if(code.length<6||scanLock)return
  scanLock=true
  setTimeout(()=>{scanLock=false},300)
  addScannedItem(code)
  e.target.value=''
})

document.getElementById('productSearch').addEventListener('input',e=>{
  const query=e.target.value.trim()
  if(query.length<2)return
  searchProducts(query)
})

async function searchProducts(query){
  try{
    const{data,error}=await supabase.from('active_inventory').select('*').ilike('part_name',`%${query}%`).gt('total_active',0).limit(5)
    if(error){
      console.error("Search error:",error)
      return
    }
    if(!data||data.length===0){
      return
    }
    // Show search results in a simple dropdown
    showSearchResults(data)
  }catch(err){
    console.error("Search error:",err)
  }
}

function showSearchResults(products){
  // Remove existing dropdown
  const existing=document.getElementById('searchDropdown')
  if(existing)existing.remove()
  
  if(products.length===0)return
  
  const dropdown=document.createElement('div')
  dropdown.id='searchDropdown'
  dropdown.style.position='absolute'
  dropdown.style.background='white'
  dropdown.style.border='1px solid #ccc'
  dropdown.style.borderRadius='4px'
  dropdown.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'
  dropdown.style.maxHeight='200px'
  dropdown.style.overflowY='auto'
  dropdown.style.zIndex='1000'
  dropdown.style.width='300px'
  dropdown.style.top='100%'
  dropdown.style.left='0'
  
  products.forEach(product=>{
    const item=document.createElement('div')
    item.style.padding='10px'
    item.style.cursor='pointer'
    item.style.borderBottom='1px solid #eee'
    item.style.fontSize='14px'
    item.textContent=`${product.part_name} - ₹${product.price} (${product.total_active} available)`
    item.addEventListener('mouseenter',()=>{
      item.style.backgroundColor='#f5f5f5'
    })
    item.addEventListener('mouseleave',()=>{
      item.style.backgroundColor='white'
    })
    item.addEventListener('click',()=>{
      addProductToCart(product)
      document.getElementById('productSearch').value=''
      dropdown.remove()
    })
    dropdown.appendChild(item)
  })
  
  const searchInput=document.getElementById('productSearch')
  const container=searchInput.parentNode
  container.style.position='relative'
  container.appendChild(dropdown)
  
  // Remove dropdown when clicking outside
  setTimeout(()=>{
    document.addEventListener('click',function removeDropdown(e){
      if(!searchInput.contains(e.target)&&!dropdown.contains(e.target)){
        dropdown.remove()
        document.removeEventListener('click',removeDropdown)
      }
    })
  },100)
}

function addProductToCart(product){
  if(product.total_active<=0){alert("No active stock available");return}
  const existingIndex=cart.findIndex(item=>item.id===product.id)
  if(existingIndex!==-1){
    if(cart[existingIndex].qty+1>product.total_active){alert("Not enough active stock");return}
    cart[existingIndex].qty+=1
  }else{
    cart.push({id:product.id,name:product.part_name,price:product.price,qty:1,active:product.total_active})
  }
  renderCart()
  billPrinted=false // Reset print flag when cart changes
}

async function addScannedItem(code){
  try{
    const{data,error}=await supabase.from('active_inventory').select('*').eq('barcode',code).single()
    if(error||!data){alert("Product not found or no active stock");return}
    if(data.total_active<=0){alert("No active stock available");return}
    const existingIndex=cart.findIndex(item=>item.id===data.id)
    if(existingIndex!==-1){
      if(cart[existingIndex].qty+1>data.total_active){alert("Not enough active stock");return}
      cart[existingIndex].qty+=1
    }else{
      cart.push({id:data.id,name:data.part_name,price:data.price,qty:1,active:data.total_active})
    }
    renderCart()
    billPrinted=false // Reset print flag when cart changes
  }catch(err){
    console.error("Barcode fetch error:",err)
    alert("Error fetching product.")
  }
}

function renderCart(){
  const tbody=document.querySelector('#cart-table tbody')
  tbody.innerHTML=''
  let total=0
  cart.forEach((item,idx)=>{
    const lineTotal=item.price*item.qty
    total+=lineTotal
    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${item.name}</td>
      <td>₹${item.price.toFixed(2)}</td>
      <td><input type="number" value="${item.qty}" min="1" max="${item.active}" onchange="updateQty(${idx},this.value)"></td>
      <td>₹${lineTotal.toFixed(2)}</td>
      <td><button onclick="removeItem(${idx})">X</button></td>
    `
    tbody.appendChild(row)
  })
  document.getElementById('grandTotal').textContent=total.toFixed(2)
}

window.updateQty=(idx,val)=>{
  const q=parseInt(val)
  if(q>cart[idx].active){alert("Exceeds active stock");return}
  cart[idx].qty=q
  renderCart()
  billPrinted=false // Reset print flag when cart changes
}


window.removeItem=idx=>{
  cart.splice(idx,1)
  renderCart()
  billPrinted=false // Reset print flag when cart changes
}

document.getElementById('finalizeBill').addEventListener('click',async()=>{
  if(!customer.name){alert("Set customer first");return}
  if(cart.length===0){alert("Cart is empty");return}
  if(!billPrinted){alert("Please print the bill first before finalizing");return}
  
  const total=cart.reduce((sum,i)=>sum+(i.price*i.qty),0)
  try{
    const{data:bill,error:billErr}=await supabase.from('bills').insert([{
      customer_name:customer.name,
      customer_phone:customer.phone,
      total_amount:total
    }]).select().single()
    if(billErr)throw billErr
    
    for(const item of cart){
      // Create sale record
      const{error:saleError}=await supabase.from("sales").insert({
        product_id:item.id,
        quantity_sold:item.qty,
        bill_id:bill.id,
        price_at_sale:item.price
      })
      if(saleError)console.error("Sale insert error:",saleError)
      
      // Use the database function to sell inventory (FIFO)
      const{error:sellError}=await supabase.rpc('sell_inventory', {
        p_product_id: item.id,
        p_quantity: item.qty,
        p_price: item.price,
        p_bill_id: bill.id
      })
      if(sellError)console.error("Sell inventory error:",sellError)
    }
    
    window.latestBill={...bill,items:[...cart],customer:{...customer}}
    alert("Bill finalized. ID: "+bill.id)
    cart=[]
    renderCart()
    document.getElementById('grandTotal').textContent="0"
    billPrinted=false // Reset for next bill
  }catch(err){
    console.error("Finalize bill error:",err)
    alert("Failed to create bill.")
  }
})

document.getElementById('printBill').addEventListener('click',async()=>{
  if(!customer.name){alert("Set customer first");return}
  if(cart.length===0){alert("Cart is empty");return}
  
  // Create a temporary bill for printing (not saved to database yet)
  const total=cart.reduce((sum,i)=>sum+(i.price*i.qty),0)
  const tempBill={
    id: 'TEMP-' + Date.now(),
    customer_name: customer.name,
    customer_phone: customer.phone,
    total_amount: total,
    items: [...cart],
    customer: {...customer}
  }
  
  window.latestBill = tempBill
  const now=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})
  let html=`
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#000;padding:1rem;">
      <h2 style="text-align:center;margin-bottom:0.5rem;">Ruby Automotives</h2>
      <p style="text-align:center;margin-top:0;">Purchase Bill</p>
      <hr>
      <p><strong>Date & Time:</strong> ${now}</p>
      <p><strong>Customer:</strong> ${tempBill.customer.name} (${tempBill.customer.phone||"-"})</p>
      <p><strong>Bill ID:</strong> ${tempBill.id}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:1rem;">
        <thead>
          <tr>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:left;">Item</th>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:right;">Qty</th>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:right;">Price</th>
            <th style="border:1px solid #ccc;padding:0.5rem;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
  `
  tempBill.items.forEach(it=>{
    html+=`
      <tr>
        <td style="border:1px solid #ccc;padding:0.5rem;">${it.name}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">${it.qty}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">₹${it.price.toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">₹${(it.price*it.qty).toFixed(2)}</td>
      </tr>
    `
  })
  html+=`
        </tbody>
      </table>
      <h3 style="text-align:right;margin-top:1rem;">Grand Total: ₹${tempBill.total_amount}</h3>
      <hr>
      <p style="text-align:center;">Thank you for your purchase</p>
    </div>
  `
  const w=window.open("","PrintBill","width=600,height=600")
  w.document.write(html)
  w.print()
  w.close()
  
  // Set flag that bill has been printed
  billPrinted=true
  alert("Bill printed. You can now finalize the bill.")
})