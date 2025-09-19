import { supabase } from './database.js';
const SECRET_PASSWORD="Pl@ySt@tion123"; 

const loginDiv=document.getElementById("login");
const loginBtn=document.getElementById("loginBtn");
const passwordInput=document.getElementById("passwordInput");
const errorMsg=document.getElementById("error");

const form=document.getElementById("supplierForm");
const table=document.getElementById("suppliersTable");
const tableBody=document.getElementById("suppliers-body");

loginBtn.addEventListener("click",()=>{
  if(passwordInput.value===SECRET_PASSWORD){
    loginDiv.style.display="none";
    form.style.display="block";
    table.style.display="table";
    loadSuppliers();
  }else{
    errorMsg.style.display="block";
  }
});

async function loadSuppliers(){
  const {data,error}=await supabase
    .from("suppliers")
    .select("*")
    .order("supply_date",{ascending:false});
  if(error){
    console.error("Error loading suppliers:",error);
    return;
  }
  tableBody.innerHTML="";
  if(!data||data.length===0){
    tableBody.innerHTML="<tr><td colspan='7'>No suppliers found</td></tr>";
    return;
  }
  data.forEach(s=>{
    const row=document.createElement("tr");
    row.innerHTML=`
      <td>${s.supplier_name}</td>
      <td>${s.phone}</td>
      <td>${s.product_name}</td>
      <td>${s.quantity}</td>
      <td>${s.invoice_number||""}</td>
      <td>${s.cost_per_unit}</td>
      <td>${s.supply_date}</td>
    `;
    tableBody.appendChild(row);
  });
}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const newSupplier={
    supplier_name:document.getElementById("supplierName").value,
    phone:document.getElementById("supplierPhone").value,
    product_name:document.getElementById("productName").value,
    quantity:parseInt(document.getElementById("quantity").value,10),
    invoice_number:document.getElementById("invoice_number").value,
    supply_date:document.getElementById("supplyDate").value,
    cost_per_unit:parseFloat(document.getElementById("cost").value)
  };
  const {error}=await supabase.from("suppliers").insert([newSupplier]);
  if(error){
    console.error("Insert error:",error);
    return;
  }
  form.reset();
  loadSuppliers();
});