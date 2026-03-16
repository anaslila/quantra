/**
 * Quantra ERP Solutions v3.1.6
 * Features: Backspace Chaining, Real-Time Clock, CRM Auto-Sync, F8 Print
 */

let inventory = JSON.parse(localStorage.getItem('q_inv')) || [];
let customers = JSON.parse(localStorage.getItem('q_cust')) || [];
let history = JSON.parse(localStorage.getItem('q_hist')) || [];
let currentInvoiceItems = [];
let activeSearchIndex = -1;

const rupee = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
});

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    startClock();
});

// --- 1. Core Initialization ---
function initApp() {
    setupNavigation();
    setupKeyboardEngine();
    setupSearchLogic();
    renderAll();
    
    // Set Initial Date
    const dateEl = document.getElementById('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric' 
    });
}

// --- 2. Real-Time 12-Hour Clock ---
function startClock() {
    const clockEl = document.getElementById('real-time-clock');
    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }, 1000);
}

// --- 3. Navigation Logic ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = this.getAttribute('data-target');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            // Force re-render on tab switch to ensure data visibility
            renderAll(); 
        });
    });
}

// --- 4. Advanced Keyboard Engine (Backspace Chaining & Shortcuts) ---
function setupKeyboardEngine() {
    document.addEventListener('keydown', (e) => {
        // F2: Global Search
        if (e.key === "F2") {
            e.preventDefault();
            document.getElementById('global-search').focus();
        }

        // F8: Generate/Save Invoice
        if (e.key === "F8") {
            e.preventDefault();
            if (document.getElementById('invoicing').classList.contains('active')) generateInvoice();
        }

        // ESC: Close All
        if (e.key === "Escape") closeAllModals();
    });

    // Backspace Chaining Logic
    const chain = ['cust-search', 'item-search', 'inv-qty'];
    chain.forEach((id, index) => {
        const el = document.getElementById(id);
        el.addEventListener('keydown', (e) => {
            if (e.key === "Backspace" && el.value === "" && index > 0) {
                document.getElementById(chain[index - 1]).focus();
            }
        });
    });

    // Dropdown Navigation (Arrows & Tab)
    const searchInputs = ['cust-search', 'item-search'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        const results = document.getElementById(id === 'cust-search' ? 'cust-results' : 'item-results');

        input.addEventListener('keydown', (e) => {
            const items = results.querySelectorAll('.search-item');
            
            if (e.key === "ArrowDown") {
                e.preventDefault();
                activeSearchIndex = Math.min(activeSearchIndex + 1, items.length - 1);
                updateSearchHighlight(items);
            } 
            else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeSearchIndex = Math.max(activeSearchIndex - 1, 0);
                updateSearchHighlight(items);
            } 
            else if (e.key === "Tab" || e.key === "Enter") {
                if (activeSearchIndex > -1 && items[activeSearchIndex]) {
                    e.preventDefault();
                    items[activeSearchIndex].click();
                }
            }
        });
    });
}

function updateSearchHighlight(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === activeSearchIndex);
        if(idx === activeSearchIndex) item.scrollIntoView({ block: 'nearest' });
    });
}

// --- 5. Search & CRM Visibility Logic ---
function setupSearchLogic() {
    const bindSearch = (inputID, resultID, data, type) => {
        const input = document.getElementById(inputID);
        const results = document.getElementById(resultID);

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            activeSearchIndex = -1;
            
            if (!query) { results.style.display = 'none'; return; }
            
            const matches = data.filter(item => (item.name || item.customer || "").toLowerCase().includes(query));
            results.style.display = 'block';
            
            let html = matches.map((item, idx) => `
                <div class="search-item ${idx === 0 ? 'selected' : ''}" 
                     onclick="selectResult('${inputID}', '${resultID}', '${item.name || item.customer}', ${item.id})">
                    <span>${item.name || item.customer}</span>
                    ${item.price ? `<small>${rupee.format(item.price)}</small>` : ''}
                </div>
            `).join('');

            if (matches.length === 0) {
                html = `<div class="search-item add-new" onclick="triggerQuickAdd('${type}', '${input.value}')">
                            <i class="ri-add-line"></i> Create New "${input.value}"
                         </div>`;
            } else {
                activeSearchIndex = 0; 
            }
            
            results.innerHTML = html;
        });
    };

    bindSearch('cust-search', 'cust-results', customers, 'customer');
    bindSearch('item-search', 'item-results', inventory, 'inventory');
}

function selectResult(inputID, resultID, name, id) {
    const input = document.getElementById(inputID);
    input.value = name;
    input.setAttribute('data-selected-id', id);
    document.getElementById(resultID).style.display = 'none';
    
    // Auto-Focus Chaining
    if (inputID === 'cust-search') {
        document.getElementById('item-search').focus();
    } else if (inputID === 'item-search') {
        document.getElementById('inv-qty').focus();
    }
    
    // CRM Visibility Fix: Refresh tables whenever a selection happens
    renderAll();
}

function triggerQuickAdd(type, name) {
    closeAllModals();
    if (type === 'customer') {
        openModal('customer-modal');
        document.getElementById('cust-name').value = name;
    } else {
        openModal('inventory-modal');
        document.getElementById('prod-name').value = name;
    }
}

// --- 6. Data Operations ---
function saveProduct() {
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value) || 0;

    if (name && !isNaN(price)) {
        inventory.push({ id: Date.now(), name, price, stock });
        saveAndRefresh();
        closeModal('inventory-modal');
        document.getElementById('item-search').focus();
    }
}

function saveCustomer() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    if (name) {
        customers.push({ id: Date.now(), name, phone, email: 'client@example.com' });
        saveAndRefresh();
        closeModal('customer-modal');
        document.getElementById('cust-search').value = name;
        document.getElementById('item-search').focus();
    }
}

function addItemToInvoice() {
    const input = document.getElementById('item-search');
    const id = input.getAttribute('data-selected-id');
    const qty = parseInt(document.getElementById('inv-qty').value);
    const item = inventory.find(i => i.id == id);

    if (item && qty > 0) {
        currentInvoiceItems.push({ 
            id: item.id, name: item.name, price: item.price, qty, total: item.price * qty 
        });
        renderInvoicePreview();
        input.value = ""; 
        input.removeAttribute('data-selected-id');
        document.getElementById('inv-qty').value = 1;
        input.focus();
    }
}

function generateInvoice() {
    const custName = document.getElementById('cust-search').value;
    if (currentInvoiceItems.length === 0) { alert("Add at least one item."); return; }

    const bill = {
        id: 'QN-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleString('en-IN'),
        customer: custName,
        items: [...currentInvoiceItems],
        total: currentInvoiceItems.reduce((s, i) => s + i.total, 0)
    };

    history.push(bill);
    currentInvoiceItems = [];
    saveAndRefresh();
    viewInvoice(bill.id);
}

// --- 7. Viewers & Renderers ---
function viewInvoice(id) {
    const bill = history.find(h => h.id === id);
    const content = document.getElementById('printable-content');
    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid #004aad; padding-bottom:20px; margin-bottom:30px;">
            <div>
                <h1 style="color:#004aad; font-size:2rem; margin:0;">TAX INVOICE</h1>
                <p style="margin:5px 0 0 0;">Quantra ERP Solutions</p>
            </div>
            <div style="text-align:right">
                <p><b>Invoice #:</b> ${bill.id}</p>
                <p><b>Date:</b> ${bill.date}</p>
            </div>
        </div>
        <div style="margin-bottom:30px;">
            <p style="color:#64748b; text-transform:uppercase; font-size:0.7rem; font-weight:800; margin-bottom:5px;">Bill To</p>
            <h2 style="margin:0;">${bill.customer}</h2>
        </div>
        <table class="q-table">
            <thead>
                <tr><th style="width:50%">Item Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>
                ${bill.items.map(i => `
                    <tr>
                        <td>${i.name}</td>
                        <td>${i.qty}</td>
                        <td>${rupee.format(i.price)}</td>
                        <td style="font-weight:700;">${rupee.format(i.total)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
        <div style="margin-top:40px; border-top:2px solid #f1f5f9; padding-top:20px; text-align:right;">
            <p style="color:#64748b; margin-bottom:5px;">Amount Payable</p>
            <h1 style="color:#004aad; font-size:2.5rem; margin:0;">${rupee.format(bill.total)}</h1>
        </div>
    `;
    openModal('invoice-view-modal');
}

function saveAndRefresh() {
    localStorage.setItem('q_inv', JSON.stringify(inventory));
    localStorage.setItem('q_cust', JSON.stringify(customers));
    localStorage.setItem('q_hist', JSON.stringify(history));
    renderAll();
}

function renderAll() {
    // Inventory List
    const invList = document.getElementById('inventory-list');
    if(invList) invList.innerHTML = inventory.map(i => `
        <tr>
            <td><b>${i.name}</b></td>
            <td><span class="badge ${i.stock < 5 ? 'low-stock' : ''}">${i.stock} units</span></td>
            <td>${rupee.format(i.price)}</td>
            <td><button class="icon-btn-del" onclick="deleteEntry('inv', ${i.id})"><i class="ri-delete-bin-line"></i></button></td>
        </tr>`).join('');

    // CRM List (Customer Directory)
    const custList = document.getElementById('customer-list');
    if(custList) custList.innerHTML = customers.map(c => `
        <tr>
            <td><b>${c.name}</b></td>
            <td>${c.email}</td>
            <td>${c.phone || 'N/A'}</td>
            <td><button class="icon-btn-del" onclick="deleteEntry('cust', ${c.id})"><i class="ri-delete-bin-line"></i></button></td>
        </tr>`).join('');

    // Sales Ledger
    const ledger = document.getElementById('history-list-v3');
    if(ledger) ledger.innerHTML = [...history].reverse().map(h => `
        <tr>
            <td><span style="font-family:monospace; font-weight:700;">${h.id}</span></td>
            <td>${h.date.split(',')[0]}</td>
            <td>${h.customer}</td>
            <td style="font-weight:700; color:var(--primary);">${rupee.format(h.total)}</td>
            <td>
                <button class="icon-btn-view" onclick="viewInvoice('${h.id}')" style="margin-right:10px;"><i class="ri-eye-line"></i></button>
                <button class="icon-btn-del" onclick="deleteInvoice('${h.id}')"><i class="ri-delete-bin-line"></i></button>
            </td>
        </tr>`).join('');

    // Update Stats
    const rev = history.reduce((s, h) => s + h.total, 0);
    document.getElementById('stat-revenue').innerText = rupee.format(rev);
    document.getElementById('stat-invoices').innerText = history.length;
}

function renderInvoicePreview() {
    const list = document.getElementById('invoice-items-list');
    list.innerHTML = currentInvoiceItems.map((i, idx) => `
        <tr>
            <td>${i.name}</td>
            <td>${i.qty}</td>
            <td>${rupee.format(i.total)}</td>
        </tr>`).join('');
    document.getElementById('invoice-total').innerText = rupee.format(currentInvoiceItems.reduce((s, i) => s + i.total, 0));
}

// --- 8. Modal Utilities ---
function openModal(id) { 
    document.getElementById(id).style.display = 'flex'; 
    const firstInput = document.getElementById(id).querySelector('input');
    if(firstInput) setTimeout(() => firstInput.focus(), 150);
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeAllModals() { document.querySelectorAll('.modal-blur').forEach(m => m.style.display = 'none'); }

function deleteEntry(type, id) {
    if(type === 'inv') inventory = inventory.filter(i => i.id !== id);
    if(type === 'cust') customers = customers.filter(c => c.id !== id);
    saveAndRefresh();
}
function deleteInvoice(id) {
    if(confirm("Permanently delete this invoice?")) {
        history = history.filter(h => h.id !== id);
        saveAndRefresh();
    }
}