import './style.css'
import { supabase } from './database.js'

// Audit state
let auditData = []
let currentAudit = {
    id: null,
    startTime: null,
    endTime: null,
    auditor: 'System User',
    status: 'in_progress'
}

// DOM elements
const barcodeInput = document.getElementById('barcodeInput')
const scanBtn = document.getElementById('scanBtn')
const markAllFoundBtn = document.getElementById('markAllFound')
const markAllMissingBtn = document.getElementById('markAllMissing')
const resetAuditBtn = document.getElementById('resetAudit')
const exportReportBtn = document.getElementById('exportReport')
const saveAuditBtn = document.getElementById('saveAudit')
const loadAuditBtn = document.getElementById('loadAudit')
const auditTableBody = document.getElementById('auditTableBody')

// Stats elements
const totalItemsEl = document.getElementById('totalItems')
const foundItemsEl = document.getElementById('foundItems')
const missingItemsEl = document.getElementById('missingItems')
const auditProgressEl = document.getElementById('auditProgress')
const progressBarEl = document.getElementById('progressBar')

// Initialize audit tool
document.addEventListener('DOMContentLoaded', function() {
    initializeAudit()
    setupEventListeners()
})

function initializeAudit() {
    currentAudit.startTime = new Date()
    loadInventoryForAudit()
}

function setupEventListeners() {
    // Barcode scanning
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            scanBarcode()
        }
    })
    
    scanBtn.addEventListener('click', scanBarcode)
    
    // Bulk actions
    markAllFoundBtn.addEventListener('click', markAllFound)
    markAllMissingBtn.addEventListener('click', markAllMissing)
    resetAuditBtn.addEventListener('click', resetAudit)
    
    // Audit actions
    exportReportBtn.addEventListener('click', exportReport)
    saveAuditBtn.addEventListener('click', saveAudit)
    loadAuditBtn.addEventListener('click', loadPreviousAudit)
}

// Load all inventory items for audit
async function loadInventoryForAudit() {
    try {
        // Load both active and on-hold inventory
        const { data: activeData, error: activeError } = await supabase
            .from('batch_details')
            .select('*')
            .gt('quantity_active', 0)
            .order('part_name', { ascending: true })

        const { data: onHoldData, error: onHoldError } = await supabase
            .from('batch_details')
            .select('*')
            .gt('quantity_on_hold', 0)
            .order('part_name', { ascending: true })

        if (activeError || onHoldError) {
            console.error('Error loading inventory:', activeError || onHoldError)
            alert('Failed to load inventory for audit')
            return
        }

        // Combine and deduplicate data
        const allItems = [...activeData, ...onHoldData]
        const uniqueItems = new Map()
        
        allItems.forEach(item => {
            const key = `${item.barcode}-${item.part_name}`
            if (!uniqueItems.has(key)) {
                uniqueItems.set(key, {
                    barcode: item.barcode,
                    part_name: item.part_name,
                    variant: item.variant || '-',
                    brand: item.brand,
                    quantity_active: item.quantity_active || 0,
                    quantity_on_hold: item.quantity_on_hold || 0,
                    total_quantity: (item.quantity_active || 0) + (item.quantity_on_hold || 0),
                    status: 'pending',
                    scanned_at: null,
                    notes: ''
                })
            }
        })

        auditData = Array.from(uniqueItems.values())
        renderAuditTable()
        updateStats()
        
    } catch (error) {
        console.error('Error loading inventory:', error)
        alert('Failed to load inventory for audit')
    }
}

// Scan barcode and mark item as found
function scanBarcode() {
    const barcode = barcodeInput.value.trim()
    if (!barcode) {
        alert('Please enter a barcode')
        return
    }

    const item = auditData.find(item => item.barcode === barcode)
    if (!item) {
        alert('Barcode not found in inventory')
        barcodeInput.value = ''
        return
    }

    if (item.status === 'found') {
        alert('Item already marked as found')
        barcodeInput.value = ''
        return
    }

    // Mark as found
    item.status = 'found'
    item.scanned_at = new Date()
    
    renderAuditTable()
    updateStats()
    barcodeInput.value = ''
    barcodeInput.focus()
}

// Mark all items as found
function markAllFound() {
    if (!confirm('Mark all items as found? This will complete the audit.')) return
    
    auditData.forEach(item => {
        if (item.status === 'pending') {
            item.status = 'found'
            item.scanned_at = new Date()
        }
    })
    
    renderAuditTable()
    updateStats()
}

// Mark all items as missing
function markAllMissing() {
    if (!confirm('Mark all items as missing? This will flag all items for investigation.')) return
    
    auditData.forEach(item => {
        if (item.status === 'pending') {
            item.status = 'missing'
            item.scanned_at = new Date()
        }
    })
    
    renderAuditTable()
    updateStats()
}

// Reset audit
function resetAudit() {
    if (!confirm('Reset the entire audit? All progress will be lost.')) return
    
    auditData.forEach(item => {
        item.status = 'pending'
        item.scanned_at = null
        item.notes = ''
    })
    
    currentAudit.startTime = new Date()
    renderAuditTable()
    updateStats()
}

// Render audit table
function renderAuditTable() {
    auditTableBody.innerHTML = ''
    
    auditData.forEach(item => {
        const row = document.createElement('tr')
        row.innerHTML = `
            <td>${item.barcode}</td>
            <td>${item.part_name}</td>
            <td>${item.variant}</td>
            <td>${item.brand}</td>
            <td>${item.total_quantity}</td>
            <td class="status-${item.status}">${item.status.toUpperCase()}</td>
            <td>
                <button onclick="markItemFound('${item.barcode}')" ${item.status === 'found' ? 'disabled' : ''}>Found</button>
                <button onclick="markItemMissing('${item.barcode}')" ${item.status === 'missing' ? 'disabled' : ''}>Missing</button>
                <button onclick="markItemPending('${item.barcode}')" ${item.status === 'pending' ? 'disabled' : ''}>Reset</button>
            </td>
        `
        auditTableBody.appendChild(row)
    })
}

// Update statistics
function updateStats() {
    const total = auditData.length
    const found = auditData.filter(item => item.status === 'found').length
    const missing = auditData.filter(item => item.status === 'missing').length
    const progress = total > 0 ? Math.round((found + missing) / total * 100) : 0
    
    totalItemsEl.textContent = total
    foundItemsEl.textContent = found
    missingItemsEl.textContent = missing
    auditProgressEl.textContent = `${progress}%`
    progressBarEl.style.width = `${progress}%`
}

// Mark individual item as found
window.markItemFound = function(barcode) {
    const item = auditData.find(item => item.barcode === barcode)
    if (item) {
        item.status = 'found'
        item.scanned_at = new Date()
        renderAuditTable()
        updateStats()
    }
}

// Mark individual item as missing
window.markItemMissing = function(barcode) {
    const item = auditData.find(item => item.barcode === barcode)
    if (item) {
        item.status = 'missing'
        item.scanned_at = new Date()
        renderAuditTable()
        updateStats()
    }
}

// Mark individual item as pending
window.markItemPending = function(barcode) {
    const item = auditData.find(item => item.barcode === barcode)
    if (item) {
        item.status = 'pending'
        item.scanned_at = null
        renderAuditTable()
        updateStats()
    }
}

// Export audit report
function exportReport() {
    const report = generateAuditReport()
    const blob = new Blob([report], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
}

// Generate audit report
function generateAuditReport() {
    const headers = ['Barcode', 'Product Name', 'Variant', 'Brand', 'Quantity', 'Status', 'Scanned At', 'Notes']
    const rows = auditData.map(item => [
        item.barcode,
        item.part_name,
        item.variant,
        item.brand,
        item.total_quantity,
        item.status,
        item.scanned_at ? item.scanned_at.toLocaleString() : '',
        item.notes || ''
    ])
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')
    
    return csvContent
}

// Save audit to localStorage
function saveAudit() {
    const auditToSave = {
        ...currentAudit,
        endTime: new Date(),
        data: auditData,
        summary: {
            total: auditData.length,
            found: auditData.filter(item => item.status === 'found').length,
            missing: auditData.filter(item => item.status === 'missing').length
        }
    }
    
    const savedAudits = JSON.parse(localStorage.getItem('auditHistory') || '[]')
    savedAudits.push(auditToSave)
    localStorage.setItem('auditHistory', JSON.stringify(savedAudits))
    
    alert('Audit saved successfully!')
}

// Load previous audit
function loadPreviousAudit() {
    const savedAudits = JSON.parse(localStorage.getItem('auditHistory') || '[]')
    if (savedAudits.length === 0) {
        alert('No previous audits found')
        return
    }
    
    const auditList = savedAudits.map((audit, index) => 
        `${index + 1}. ${audit.startTime ? new Date(audit.startTime).toLocaleString() : 'Unknown'} - ${audit.summary.found}/${audit.summary.total} found`
    ).join('\n')
    
    const selection = prompt(`Select audit to load:\n\n${auditList}\n\nEnter number (1-${savedAudits.length}):`)
    const index = parseInt(selection) - 1
    
    if (index >= 0 && index < savedAudits.length) {
        const selectedAudit = savedAudits[index]
        auditData = selectedAudit.data || []
        currentAudit = selectedAudit
        renderAuditTable()
        updateStats()
        alert('Audit loaded successfully!')
    } else {
        alert('Invalid selection')
    }
}

// Auto-save every 5 minutes
setInterval(() => {
    if (auditData.length > 0) {
        saveAudit()
    }
}, 5 * 60 * 1000) // 5 minutes
