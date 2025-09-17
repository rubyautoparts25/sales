import './style.css'
import { createClient } from '@supabase/supabase-js'
import JsBarcode from 'jsbarcode'

const supabase=createClient(
  'https://yrilfazkyhqwdqkgzcbb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaWxmYXpreWhxd2Rxa2d6Y2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzczMTYsImV4cCI6MjA3MzUxMzMxNn0._ayJaSCilAzfOmqcczBYv6_ghYbHevW89u09_2c9b60'
)

let currentBarcode=null

function generateBarcode(){
  return Math.random().toString(36).substring(2,10).toUpperCase()
}

window.filterInventory=function(){
  const query=document.getElementById('searchInput').value.toLowerCase()
  const rows=document.querySelectorAll('#inventoryTable tbody tr')
  rows.forEach(row=>{
    const text=row.textContent.toLowerCase()
    row.style.display=text.includes(query)?'':'none'
  })
}

document.getElementById('productForm').addEventListener('submit', async e=>{
  e.preventDefault()
  const form=e.target
  const name=form.name.value.trim()
  const variant=form.variant.value.trim()
  const classOfProduct=form.class_of_product.value.trim()
  const brand=form.brand.value.trim()
  const quantity=parseInt(form.quantity.value)
  const price=parseFloat(form.price.value)
  const expiryDate=form.expiry.value||null
  const shelf=form.shelf.value.trim()

  if(!name||!variant||!classOfProduct||!brand||isNaN(quantity)||isNaN(price)||!shelf){
    alert("Please fill in all required fields correctly.")
    return
  }

  try{
    const {data:existing,error}=await supabase
      .from('products')
      .select('*')
      .eq('name',name)
      .eq('variant',variant)
      .eq('brand',brand)
      .eq('class_of_product',classOfProduct)

    if(error) throw error

    let barcode
    if(existing.length>0){
      const existingProduct=existing[0]

      if(existingProduct.price===price){
        barcode=existingProduct.barcode
        const {error:updateError}=await supabase
          .from('products')
          .update({
            quantity: existingProduct.quantity + quantity,
            qty_on_hold: (existingProduct.qty_on_hold||0) + quantity,
            shelf_code: shelf,
            expiry_date: expiryDate
          })
          .eq('id', existingProduct.id)
        if(updateError) throw updateError
      }else{
        barcode=generateBarcode()
        const {error:insertError}=await supabase.from('products').insert([{
          name,variant,class_of_product:classOfProduct,brand,
          quantity,
          qty_on_hold:quantity,
          qty_active:0,
          price,expiry_date:expiryDate,shelf_code:shelf,
          barcode,status:'on_hold',
          date_added:new Date().toISOString().split('T')[0]
        }])
        if(insertError) throw insertError
      }
    }else{
      barcode=generateBarcode()
      const {error:insertError}=await supabase.from('products').insert([{
        name,variant,class_of_product:classOfProduct,brand,
        quantity,
        qty_on_hold:quantity,
        qty_active:0,
        price,expiry_date:expiryDate,shelf_code:shelf,
        barcode,status:'on_hold',
        date_added:new Date().toISOString().split('T')[0]
      }])
      if(insertError) throw insertError
    }

    renderBarcode(barcode)
    alert(`"${name}" added/updated in inventory.`)
    form.reset()
    loadInventory()
  }catch(err){
    console.error("Insert error:",err)
    alert("Something went wrong while adding the product.")
  }
})

async function loadInventory(){
  const {data,error}=await supabase.from('products').select('*')
  if(error){
    console.error("Error loading inventory:",error)
    return
  }

  const tbody=document.querySelector('#inventoryTable tbody')
  tbody.innerHTML=''

  data.forEach(product=>{
    const totalPrice=(product.quantity*product.price).toFixed(2)
    const formattedDate=product.date_added
      ?new Date(product.date_added).toLocaleString('en-IN',{
        timeZone:'Asia/Kolkata',
        year:'numeric',month:'short',day:'numeric'
      })
      :'-'
    const minStock=product.min_stock||20
    const quantityColor=product.quantity<minStock?'red':'black'

    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${product.name}</td>
      <td>${product.variant}</td>
      <td>${product.class_of_product||'-'}</td>
      <td>${product.brand}</td>
      <td style="color:${quantityColor}">${product.quantity}</td>
      <td>${product.qty_on_hold||0}</td>
      <td>${product.qty_active||0}</td>
      <td>${product.price}</td>
      <td>${totalPrice}</td>
      <td>${product.shelf_code||'-'}</td>
      <td>${formattedDate}</td>
      <td>
        <button onclick="editProduct('${product.id}')">Edit</button>
        <button onclick="deleteProduct('${product.id}')">Delete</button>
        <button onclick="renderBarcode('${product.barcode}')">View Barcode</button>
      </td>
    `
    tbody.appendChild(row)
  })
}

window.deleteProduct=async function(id){
  if(!confirm("Are you sure you want to delete this part?")) return
  const {error}=await supabase.from('products').delete().eq('id',id)
  if(error){
    console.error("Delete error:",error)
    alert("Failed to delete part.")
  }else{
    alert("Part removed.")
    loadInventory()
  }
}

window.editProduct=function(id){
  window.location.href=`edit.html?id=${id}`
}

async function renderBarcode(barcode){
  if(!barcode) return
  JsBarcode("#barcode",barcode,{
    format:"CODE128",
    lineColor:"#000",
    width:2,
    height:40,
    displayValue:true
  })
  currentBarcode=barcode
  document.getElementById("downloadBarcode").style.display="inline-block"
  document.getElementById("printBarcode").style.display="inline-block"

  const {data,error}=await supabase.from('products').select('*').eq('barcode',barcode).single()
  if(error){
    console.error("Error fetching product details:",error)
    document.getElementById("productDetails").innerHTML="<p>Unable to load product details.</p>"
    return
  }
  const formattedDate=data.date_added
    ?new Date(data.date_added).toLocaleString('en-IN',{
      timeZone:'Asia/Kolkata',
      year:'numeric',month:'short',day:'numeric'
    })
    :'-'

  document.getElementById("productDetails").innerHTML=`
    <h3>Product Details</h3>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Variant:</strong> ${data.variant||'-'}</p>
    <p><strong>Class:</strong> ${data.class_of_product||'-'}</p>
    <p><strong>Brand:</strong> ${data.brand}</p>
    <p><strong>Total Qty:</strong> ${data.quantity}</p>
    <p><strong>On-Hold Qty:</strong> ${data.qty_on_hold||0}</p>
    <p><strong>Active Qty:</strong> ${data.qty_active||0}</p>
    <p><strong>Price:</strong> ₹${data.price}</p>
    <p><strong>Total Value:</strong> ₹${(data.quantity*data.price).toFixed(2)}</p>
    <p><strong>Shelf:</strong> ${data.shelf_code||'-'}</p>
    <p><strong>Expiry:</strong> ${data.expiry_date||'-'}</p>
    <p><strong>Date Added:</strong> ${formattedDate}</p>
  `
}
window.renderBarcode=renderBarcode

document.getElementById('downloadBarcode').addEventListener('click',()=>{
  if(!currentBarcode) return alert("No barcode to download.")
  const svg=document.getElementById('barcode')
  const serializer=new XMLSerializer()
  const svgBlob=new Blob([serializer.serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"})
  const url=URL.createObjectURL(svgBlob)
  const a=document.createElement('a')
  a.href=url
  a.download=`barcode-${currentBarcode}.svg`
  a.click()
  URL.revokeObjectURL(url)
})

document.getElementById('printBarcode').addEventListener('click', async () => {
  if (!currentBarcode) return alert("No barcode to print.");

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', currentBarcode)
    .single();

  if (error) {
    console.error("Error fetching product for print:", error);
    return alert("Failed to fetch product details.");
  }
  const d = new Date(data.date_added);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateCode = `${yy}${mm}${dd}`;
  const printContent = `
    <div style="text-align:center;font-family:Arial,sans-serif;font-size:12px;">
      ${document.getElementById('barcode').outerHTML}
      <div style="margin-top:2px;font-size:15px;">Rs. ${data.price}</div>
      <div style="margin-top:2px;font-size:15px;">${data.name}</div>
      <div style="margin-top:2px;font-size:12px;">${dateCode}</div>
    </div>
  `;

  const printWindow = window.open('', '', 'width=200,height=150');
  printWindow.document.write('<html><head><title>Print Barcode</title></head><body>');
  printWindow.document.write(printContent);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

const nameInput=document.getElementById('name')
const suggestions=document.createElement('ul')
suggestions.id='suggestions'
suggestions.style.position='absolute'
suggestions.style.background='white'
suggestions.style.border='1px solid #ccc'
suggestions.style.listStyle='none'
suggestions.style.padding='0'
suggestions.style.margin='0'
suggestions.style.width=nameInput.offsetWidth+'px'
nameInput.parentNode.appendChild(suggestions)

nameInput.addEventListener('input',async()=>{
  const query=nameInput.value.trim()
  suggestions.innerHTML=''
  if(query.length<1) return

  const {data,error}=await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,variant.ilike.%${query}%`)
    .limit(5)

  if(error){
    console.error("Suggestion error:",error)
    return
  }

  data.forEach(product=>{
    const li=document.createElement('li')
    li.textContent=`${product.name} (${product.variant||''})`
    li.style.padding='5px'
    li.style.cursor='pointer'
    li.addEventListener('click',()=>{
      nameInput.value=product.name
      document.getElementById('variant').value=product.variant||''
      document.getElementById('class_of_product').value=product.class_of_product?.trim()||''
      document.getElementById('brand').value=product.brand||''
      document.getElementById('quantity').value=product.quantity||0
      document.getElementById('price').value=product.price||0
      document.getElementById('shelf').value=product.shelf_code||''
      document.getElementById('expiry').value=product.expiry_date||''
      suggestions.innerHTML=''
    })
    suggestions.appendChild(li)
  })
})

loadInventory()
