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

function renderBarcode(barcode){
  currentBarcode=barcode
  JsBarcode("#barcode", barcode, {
    format: "CODE128",
    width: 2,
    height: 100,
    displayValue: true
  })
}

document.getElementById('downloadBarcode').addEventListener('click',()=>{
  if(!currentBarcode) return
  const svg=document.getElementById('barcode')
  const svgData=new XMLSerializer().serializeToString(svg)
  const canvas=document.createElement('canvas')
  const ctx=canvas.getContext('2d')
  const img=new Image()
  img.onload=()=>{
    canvas.width=img.width
    canvas.height=img.height
    ctx.drawImage(img,0,0)
    const link=document.createElement('a')
    link.download=`barcode_${currentBarcode}.png`
    link.href=canvas.toDataURL()
    link.click()
  }
  img.src='data:image/svg+xml;base64,'+btoa(svgData)
})

document.getElementById('printBarcode').addEventListener('click',()=>{
  if(!currentBarcode) return
  const printWindow=window.open('','_blank')
  printWindow.document.write(`
    <html>
      <head><title>Barcode - ${currentBarcode}</title></head>
      <body style="text-align:center;padding:20px;">
        <h2>Product Barcode</h2>
        <div id="barcode"></div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          JsBarcode("#barcode", "${currentBarcode}", {
            format: "CODE128",
            width: 2,
            height: 100,
            displayValue: true
          });
          window.print();
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
})

async function loadInventory(){
  const {data,error}=await supabase.from('products').select('*').gt('qty_active', 0)
  if(error){
    console.error("Error loading inventory:",error)
    return
  }

  const tbody=document.querySelector('#inventoryTable tbody')
  tbody.innerHTML=''

  data.forEach(product=>{
    const totalPrice=(product.qty_active*product.price).toFixed(2)
    const formattedDate=product.date_added
      ?new Date(product.date_added).toLocaleString('en-IN',{
        timeZone:'Asia/Kolkata',
        year:'numeric',month:'short',day:'numeric'
      })
      :'-'
    const minStock=product.min_stock||20
    const quantityColor=product.qty_active<minStock?'red':'black'

    const row=document.createElement('tr')
    row.innerHTML=`
      <td>${product.name}</td>
      <td>${product.variant}</td>
      <td>${product.class_of_product||'-'}</td>
      <td>${product.brand}</td>
      <td style="color:${quantityColor}">${product.qty_active}</td>
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
  if(!confirm('Are you sure you want to delete this product?')) return
  
  const {error}=await supabase.from('products').delete().eq('id',id)
  if(error){
    console.error("Error deleting product:",error)
    alert("Failed to delete product.")
  }else{
    alert("Product deleted successfully.")
    loadInventory()
  }
}

window.editProduct=function(id){
  window.location.href=`edit.html?id=${id}`
}

// Load inventory on page load
loadInventory()
