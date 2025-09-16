import { createClient } from '@supabase/supabase-js'

const supabase=createClient(
  'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60'
)

let cart=[]
let customer={}
let scanLock=false

document.getElementById('customerForm').addEventListener('submit',e=>{
  e.preventDefault()
  customer={
    name:document.getElementById('customerName').value.trim(),
    phone:document.getElementById('customerPhone').value.trim()
  }
  document.getElementById('customerDisplay').textContent=`Customer: ${customer.name} (${customer.phone||''})`
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
    const{data,error}=await supabase.from('products').select('*').ilike('name',`%${query}%`).gt('qty_active',0).limit(5)
    if(error){
      console.error("Search error:",error)
      return
    }
    if(!data||data.length===0){
      console.log("No products found for:",query)
      return
    }
    
    console.log("Found products:",data)
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
    item.textContent=`${product.name} - ₹${product.price} (${product.qty_active} available)`
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
  if(product.qty_active<=0){alert("No active stock available");return}
  const discountInput=parseFloat(document.getElementById('discountInput').value)||0
  const finalPrice=product.price-(product.price*discountInput/100)
  const existingIndex=cart.findIndex(item=>item.id===product.id)
  if(existingIndex!==-1){
    if(cart[existingIndex].qty+1>product.qty_active){alert("Not enough active stock");return}
    cart[existingIndex].qty+=1
  }else{
    cart.push({id:product.id,name:product.name,price:product.price,discount:discountInput,finalPrice,qty:1,active:product.qty_active})
  }
  renderCart()
}

async function addScannedItem(code){
  try{
    const{data,error}=await supabase.from('products').select('*').eq('barcode',code).single()
    if(error||!data){alert("Product not found");return}
    if(data.qty_active<=0){alert("No active stock available");return}
    const discountInput=parseFloat(document.getElementById('discountInput').value)||0
    const finalPrice=data.price-(data.price*discountInput/100)
    const existingIndex=cart.findIndex(item=>item.id===data.id)
    if(existingIndex!==-1){
      if(cart[existingIndex].qty+1>data.qty_active){alert("Not enough active stock");return}
      cart[existingIndex].qty+=1
    }else{
      cart.push({id:data.id,name:data.name,price:data.price,discount:discountInput,finalPrice,qty:1,active:data.qty_active})
    }
    renderCart()
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
    const lineTotal=item.finalPrice*item.qty
    total+=lineTotal
    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${item.name}</td>
      <td>${item.price.toFixed(2)}</td>
      <td><input type="number" value="${item.discount}" min="0" max="100" onchange="updateDiscount(${idx},this.value)"></td>
      <td>${item.finalPrice.toFixed(2)}</td>
      <td><input type="number" value="${item.qty}" min="1" max="${item.active}" onchange="updateQty(${idx},this.value)"></td>
      <td>${lineTotal.toFixed(2)}</td>
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
}

window.updateDiscount=(idx,val)=>{
  const discount=parseFloat(val)||0
  const item=cart[idx]
  item.discount=discount
  item.finalPrice=item.price-(item.price*discount/100)
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
  try{
    const{data:bill,error:billErr}=await supabase.from('bills').insert([{
      customer_name:customer.name,
      customer_phone:customer.phone,
      total_amount:total
    }]).select().single()
    if(billErr)throw billErr
    for(const item of cart){
      const{error:saleError}=await supabase.from("sales").insert({
        product_id:item.id,
        quantity_sold:item.qty,
        bill_id:bill.id,
        price_at_sale:item.price
      })
      if(saleError)console.error("Sale insert error:",saleError)
      const{data:product,error:fetchError}=await supabase.from('products').select('*').eq('id',item.id).single()
      if(!fetchError){
        if(item.qty>product.qty_active){alert("Not enough active stock for "+product.name);continue}
        const newActive=product.qty_active-item.qty
        const newQty=product.quantity-item.qty
        const{error:updateError}=await supabase.from('products').update({quantity:newQty,qty_active:newActive}).eq('id',item.id)
        if(updateError)console.error("Stock update error:",updateError)
      }
    }
    window.latestBill={...bill,items:[...cart],customer:{...customer}}
    alert("Bill finalized. ID: "+bill.id)
    cart=[]
    renderCart()
    document.getElementById('grandTotal').textContent="0"
  }catch(err){
    console.error("Finalize bill error:",err)
    alert("Failed to create bill.")
  }
})

document.getElementById('printBill').addEventListener('click',()=>{
  if(!window.latestBill){alert("No bill to print");return}
  const bill=window.latestBill
  const now=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})
  let html=`
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#000;padding:1rem;">
      <h2 style="text-align:center;margin-bottom:0.5rem;">Ruby Automotives</h2>
      <p style="text-align:center;margin-top:0;">Purchase Bill</p>
      <hr>
      <p><strong>Date & Time:</strong> ${now}</p>
      <p><strong>Customer:</strong> ${bill.customer.name} (${bill.customer.phone||"-"})</p>
      <p><strong>Bill ID:</strong> ${bill.id}</p>
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
  bill.items.forEach(it=>{
    html+=`
      <tr>
        <td style="border:1px solid #ccc;padding:0.5rem;">${it.name}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">${it.qty}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">₹${it.finalPrice.toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:0.5rem;text-align:right;">₹${(it.finalPrice*it.qty).toFixed(2)}</td>
      </tr>
    `
  })
  html+=`
        </tbody>
      </table>
      <h3 style="text-align:right;margin-top:1rem;">Grand Total: ₹${bill.total_amount}</h3>
      <hr>
      <p style="text-align:center;">Thank you for your purchase</p>
    </div>
  `
  const w=window.open("","PrintBill","width=600,height=600")
  w.document.write(html)
  w.print()
  w.close()
})