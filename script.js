/**
 * Quantra ERP Solutions v3.1.5
 * Features: Arrow Key Dropdowns, Tab-to-Select, F2 Quick Search
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
});

function initApp() {
    setupNavigation();
    setupKeyboardEngine();
    setupSearchLogic();
    renderAll();
    
    const dateEl = document.getElementById('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric' 
    });
}

// --- 1. Navigation & UI Toggling ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = this.getAttribute('data-target');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            renderAll();
        });
    });
}

// --- 2. Advanced Keyboard Engine (F2, Arrow Keys, Tab) ---
function setupKeyboardEngine() {
    document.addEventListener('keydown', (e) => {
        // F2: Global Search Focus
        if (e.key === "F2") {
            e.preventDefault();
            document.getElementById('global-search').focus();
        }

        // ESC: Close Modals
        if (e.key === "Escape") closeAllModals();

        // Ctrl+Enter: Finalize Invoice
        if (e.ctrlKey && e.key === "Enter") {
            if (document.getElementById('invoicing').classList.contains('active')) generateInvoice();
        }
    });

    // Handle Search Dropdown Navigation
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

// --- 3. Smart Search Logic ---
function setupSearchLogic() {
    const bindSearch = (inputID, resultID, data, type) => {
        const input = document.getElementById(inputID);
        const results = document.getElementById(resultID);

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            activeSearchIndex = -1; // Reset selection on type
            
            if (!query) { results.style.display = 'none'; return; }
            
            const matches = data.filter(item => (item.name || item.customer).toLowerCase().includes(query));
            results.style.display = 'block';
            
            let html = matches.map((item, idx) => `
                <div class="search-item ${idx === 0 ? 'selected' : ''}" 
                     onclick="selectResult('${inputID}', '${resultID}', '${item.name || item.customer}', ${item.id})">
                    ${item.name || item.customer}
                </div>
            `).join('');

            if (matches.length === 0) {
                html += `<div class="search-item add-new selected" onclick="triggerQuickAdd('${type}', '${input.value}')">
                            + No matches. Add "${input.value}"?
                         </div>`;
            } else if (activeSearchIndex === -1 && matches.length > 0) {
                activeSearchIndex = 0; // Default select first
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
    
    // Auto-Focus Next Logical Step
    if (inputID === 'cust-search') {
        document.getElementById('item-search').focus();
    } else if (inputID === 'item-search') {
        document.getElementById('inv-qty').focus();
    }
}

function triggerQuickAdd(type, name) {
    closeAllModals();
    if (type === 'customer') {
        openModal('customer-modal');
        document.getElementById('cust-name').value = name;
        setTimeout(() => document.getElementById('cust-email').focus(), 50);
    } else {
        openModal('inventory-modal');
        document.getElementById('prod-name').value = name;
        setTimeout(() => document.getElementById('prod-price').focus(), 50);
    }
}

// --- 4. Data Operations ---
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
    if (name) {
        customers.push({ 
            id: Date.now(), name, 
            email: document.getElementById('cust-email').value, 
            phone: document.getElementById('cust-phone').value 
        });
        saveAndRefresh();
        closeModal('customer-modal');
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
        input.focus();
    }
}

function generateInvoice() {
    const custName = document.getElementById('cust-search').value;
    const customer = customers.find(c => c.name === custName);

    if (!customer || currentInvoiceItems.length === 0) {
        alert("Valid customer and items required."); return;
    }

    const bill = {
        id: 'QN-' + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleString('en-IN'),
        customer: customer.name,
        items: [...currentInvoiceItems],
        total: currentInvoiceItems.reduce((s, i) => s + i.total, 0)
    };

    history.push(bill);
    currentInvoiceItems = [];
    saveAndRefresh();
    viewInvoice(bill.id);
}

// --- 5. Viewers & Renderers ---
function viewInvoice(id) {
    const bill = history.find(h => h.id === id);
    const content = document.getElementById('printable-content');
    content.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #004aad; padding-bottom:15px; margin-bottom:20px;">
            <h1 style="color:#004aad; margin:0;">TAX INVOICE</h1>
            <p>Quantra ERP Solutions</p>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div><strong>Bill To:</strong><br>${bill.customer}</div>
            <div style="text-align:right"><strong>Invoice:</strong> #${bill.id}<br><strong>Date:</strong> ${bill.date}</div>
        </div>
        <table class="q-table">
            <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Subtotal</th></tr></thead>
            <tbody>
                ${bill.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${rupee.format(i.price)}</td><td>${rupee.format(i.total)}</td></tr>`).join('')}
            </tbody>
        </table>
        <div style="text-align:right; margin-top:20px; border-top:1px solid #ddd; padding-top:10px;">
            <h2>Grand Total: ${rupee.format(bill.total)}</h2>
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
    const invList = document.getElementById('inventory-list');
    if(invList) invList.innerHTML = inventory.map(i => `
        <tr><td>${i.name}</td><td>${i.stock}</td><td>${rupee.format(i.price)}</td>
        <td><button class="icon-btn-del" onclick="deleteEntry('inv', ${i.id})"><i class="ri-delete-bin-line"></i></button></td></tr>`).join('');

    const ledger = document.getElementById('history-list-v3');
    if(ledger) ledger.innerHTML = [...history].reverse().map(h => `
        <tr><td>${h.id}</td><td>${h.date.split(',')[0]}</td><td>${h.customer}</td><td>${rupee.format(h.total)}</td>
        <td>
            <button class="icon-btn-view" onclick="viewInvoice('${h.id}')"><i class="ri-eye-line"></i></button>
            <button class="icon-btn-del" onclick="deleteInvoice('${h.id}')"><i class="ri-delete-bin-line"></i></button>
        </td></tr>`).join('');

    document.getElementById('stat-revenue').innerText = rupee.format(history.reduce((s, h) => s + h.total, 0));
    document.getElementById('stat-invoices').innerText = history.length;
}

function renderInvoicePreview() {
    document.getElementById('invoice-items-list').innerHTML = currentInvoiceItems.map(i => `
        <tr><td>${i.name}</td><td>${i.qty}</td><td>${rupee.format(i.total)}</td></tr>`).join('');
    document.getElementById('invoice-total').innerText = rupee.format(currentInvoiceItems.reduce((s, i) => s + i.total, 0));
}

function openModal(id) { 
    document.getElementById(id).style.display = 'flex'; 
    // Auto-focus first input in modal
    const firstInput = document.getElementById(id).querySelector('input');
    if(firstInput) setTimeout(() => firstInput.focus(), 100);
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function closeAllModals() { document.querySelectorAll('.modal-blur').forEach(m => m.style.display = 'none'); }

function deleteEntry(type, id) {
    if(type === 'inv') inventory = inventory.filter(i => i.id !== id);
    saveAndRefresh();
}
function deleteInvoice(id) {
    history = history.filter(h => h.id !== id);
    saveAndRefresh();
}