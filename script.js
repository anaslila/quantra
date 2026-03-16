/** * Quantra ERP v3.2.1 - Master Controller
 * Features: Dashboard Restoration, Business Sync, Universal Backspace
 */

// --- Data Persistence ---
let inventory = JSON.parse(localStorage.getItem('q_inv')) || [];
let customers = JSON.parse(localStorage.getItem('q_cust')) || [];
let history = JSON.parse(localStorage.getItem('q_hist')) || [];
let bizProfile = JSON.parse(localStorage.getItem('q_biz')) || {
    name: "Quantra ERP",
    logo: "https://i.postimg.cc/rsj8hTcz/Quantra-ERP-removebg-preview.png",
    address: "Main Street, Business Hub",
    phone: "+91 00000 00000",
    tax: "GSTIN: PENDING"
};

// --- Currency Formatter ---
const rupee = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
});

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    startClock();
    setupNavigation();
    setupUniversalBackspace();
    syncBusinessUI();
});

function initApp() {
    renderDashboard();
    renderInventory();
    renderCRM();
    loadBusinessSettings();
}

// --- 1. Dashboard Logic (The Fix) ---
function renderDashboard() {
    const totalRevenue = history.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const invoiceCount = history.length;

    // Direct injection into v3.2.1 IDs
    const revEl = document.getElementById('stat-revenue');
    const invEl = document.getElementById('stat-invoices');
    
    if(revEl) revEl.innerText = rupee.format(totalRevenue);
    if(invEl) invEl.innerText = invoiceCount;
}

// --- 2. Navigation & View Switching ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');

            // Toggle Active Nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Toggle Active Section
            sections.forEach(s => {
                s.classList.remove('active');
                if(s.id === target) s.classList.add('active');
            });
            
            // Re-render target data
            if(target === 'dashboard') renderDashboard();
            if(target === 'inventory') renderInventory();
            if(target === 'crm') renderCRM();
        });
    });
}

// --- 3. Business Profile & Live Sync ---
function saveBusinessProfile() {
    bizProfile = {
        name: document.getElementById('biz-name').value || "Quantra ERP",
        tax: document.getElementById('biz-tax').value,
        phone: document.getElementById('biz-phone').value,
        logo: document.getElementById('biz-logo').value || "https://i.postimg.cc/rsj8hTcz/Quantra-ERP-removebg-preview.png",
        address: document.getElementById('biz-address').value
    };
    
    localStorage.setItem('q_biz', JSON.stringify(bizProfile));
    syncBusinessUI();
    alert("Business Profile Updated!");
}

function loadBusinessSettings() {
    if(document.getElementById('biz-name')) {
        document.getElementById('biz-name').value = bizProfile.name;
        document.getElementById('biz-tax').value = bizProfile.tax;
        document.getElementById('biz-phone').value = bizProfile.phone;
        document.getElementById('biz-logo').value = bizProfile.logo;
        document.getElementById('biz-address').value = bizProfile.address;
    }
}

function syncBusinessUI() {
    const sideName = document.getElementById('side-biz-name');
    const sideLogo = document.getElementById('side-logo-preview');
    
    if(sideName) sideName.innerText = bizProfile.name;
    if(sideLogo) sideLogo.src = bizProfile.logo;
}

// --- 4. Inventory & CRM Management ---
function saveProduct() {
    const name = document.getElementById('prod-name').value;
    const stock = document.getElementById('prod-stock').value;
    const price = document.getElementById('prod-price').value;

    if(name && price) {
        inventory.push({ id: Date.now(), name, stock, price: parseFloat(price) });
        localStorage.setItem('q_inv', JSON.stringify(inventory));
        renderInventory();
        closeModal('inventory-modal');
        // Clear inputs
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-stock').value = '';
        document.getElementById('prod-price').value = '';
    }
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = inventory.map(item => `
        <tr>
            <td><b>${item.name}</b></td>
            <td>${item.stock} Units</td>
            <td>${rupee.format(item.price)}</td>
            <td>
                <button class="btn-primary" style="background:var(--accent-red); padding:8px 12px;" onclick="deleteItem('inv', ${item.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderCRM() {
    const list = document.getElementById('customer-list');
    if(!list) return;
    list.innerHTML = customers.map(c => `
        <tr>
            <td><b>${c.name}</b></td>
            <td>${c.phone || 'No Contact'}</td>
            <td><span style="color:var(--accent-green); font-weight:700;">Verified</span></td>
            <td>
                <button class="btn-primary" style="background:var(--accent-red); padding:8px 12px;" onclick="deleteItem('cust', ${c.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function deleteItem(type, id) {
    if(!confirm("Are you sure?")) return;
    if(type === 'inv') inventory = inventory.filter(i => i.id !== id);
    if(type === 'cust') customers = customers.filter(c => c.id !== id);
    
    localStorage.setItem(type === 'inv' ? 'q_inv' : 'q_cust', JSON.stringify(type === 'inv' ? inventory : customers));
    type === 'inv' ? renderInventory() : renderCRM();
}

// --- 5. Utilities: Clock & Backspace ---
function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('real-time-clock').innerText = now.toLocaleTimeString('en-IN', { hour12: true });
        document.getElementById('current-date').innerText = now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
    }, 1000);
}

function setupUniversalBackspace() {
    document.addEventListener('keydown', (e) => {
        if (e.key === "Backspace") {
            const active = document.activeElement;
            if (active.tagName === "INPUT" && active.value === "") {
                const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
                const index = inputs.indexOf(active);
                if (index > 0) {
                    e.preventDefault();
                    inputs[index - 1].focus();
                }
            }
        }
    });
}

// Modal Controls
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }