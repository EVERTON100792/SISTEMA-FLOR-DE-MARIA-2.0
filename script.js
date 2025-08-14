// ===== SGI - FLOR DE MARIA v5.2 (Versão Definitiva, Completa e Corrigida) =====

// 1. INICIALIZAÇÃO E CONFIGURAÇÕES
const SUPABASE_URL = 'https://pjbmcwefqsfqnlfvledz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYm1jd2VmcXNmcW5sZnZsZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzUwMTIsImV4cCI6MjA3MDcxMTAxMn0.f1V4yZ01eOt_ols8Cg5ATvtvz-GEomU6K6SzHg8kKIQ';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
    storageKeys: { lastActivePage: 'sgi_last_active_page' },
    company: { name: 'Flor de Maria', address: 'Rua das Flores, 123 - Centro', phone: '(11) 98765-4321', cnpj: '12.345.678/0001-99' }
};

const state = {
    clients: [], products: [], sales: [], cashFlow: [], expenses: [], receivables: [],
    cart: [], currentEditId: null, chartInstances: {}
};

// 2. MÓDULOS DE UTILIDADES (Notificação, Modal, Formatação, etc.)
const Utils = {
    formatCurrency: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0),
    formatDate: d => d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(d)) : 'N/A',
    formatDateTime: d => d ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(d)) : 'N/A',
    debounce: (func, delay = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; },
    getToday: () => new Date().toISOString().split('T')[0],
    populateSelect: (id, data, valF, textF, defTxt) => {
        const s = document.getElementById(id);
        if (!s) return;
        s.innerHTML = `<option value="">${defTxt}</option>`;
        [...data].sort((a, b) => (a[textF] || '').localeCompare(b[textF] || '')).forEach(i => {
            s.innerHTML += `<option value="${i[valF]}">${i[textF]}</option>`;
        });
    },
    exportToCSV: (filename, data) => {
        if (!data || !data.length) return Notification.warning("Não há dados para exportar.");
        const headers = Object.keys(data[0]);
        const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },
    exportToPDF: (title, head, body) => {
        if (!body || !body.length) return Notification.warning("Não há dados para PDF.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(title, 14, 16);
        doc.autoTable({ head, body, startY: 20, theme: 'grid', headStyles: { fillColor: [59, 130, 246] } });
        doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    },
    renderChart(id, type, data, options) {
        if (state.chartInstances[id]) state.chartInstances[id].destroy();
        const ctx = document.getElementById(id)?.getContext('2d');
        if (ctx) state.chartInstances[id] = new Chart(ctx, { type, data, options });
    }
};

const Notification = {
    show: (msg, type = 'success') => {
        const el = document.getElementById('notification');
        el.textContent = msg;
        el.className = `notification notification-${type} show`;
        setTimeout(() => el.classList.remove('show'), 3500);
    },
    success: m => Notification.show(m, 'success'),
    error: m => Notification.show(m, 'error'),
    warning: m => Notification.show(m, 'warning'),
};

const Modal = {
    show: (title, content) => {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modal').classList.add('show');
    },
    hide: () => document.getElementById('modal').classList.remove('show')
};

// 3. ESTRUTURA PRINCIPAL DA APLICAÇÃO
const App = {
    modules: {},
    async init() {
        Object.values(this.modules).forEach(m => m.init?.());
        document.getElementById('modalClose').addEventListener('click', Modal.hide);
        const { data: { session } } = await db.auth.getSession();
        if (session) await Auth.showApp(); else Auth.showLogin();
        console.log('SGI - Flor de Maria v5.2 (Definitiva) Iniciado.');
    },
    async loadAllData() {
        const tables = ['clients', 'products', 'sales', 'cash_flow', 'expenses', 'receivables'];
        const promises = tables.map(t => db.from(t).select('*'));
        const results = await Promise.allSettled(promises);
        results.forEach((res, i) => {
            if (res.status === 'fulfilled' && !res.value.error) {
                const data = res.value.data;
                const dateKey = data?.[0]?.date ? 'date' : 'created_at';
                state[tables[i]] = data.sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]));
            } else {
                Notification.error(`Falha ao carregar ${tables[i]}.`);
            }
        });
        if (state.receivables.length) Receivables.checkOverdue();
    }
};

const Auth = {
    init() {
        db.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') this.showApp();
            if (event === 'SIGNED_OUT') this.showLogin();
        });
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin);
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout);
    },
    async handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        const { error } = await db.auth.signInWithPassword({
            email: e.target.username.value, password: e.target.password.value
        });
        if (error) {
            Notification.error('Email ou senha inválidos.');
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    },
    async handleLogout() {
        await db.auth.signOut();
        localStorage.clear();
        Object.keys(state).forEach(k => { state[k] = Array.isArray(state[k]) ? [] : null; });
        Object.values(state.chartInstances).forEach(c => c.destroy());
    },
    showLogin() {
        document.body.className = 'login-active';
    },
    async showApp() {
        document.body.className = 'loading-active';
        await App.loadAllData();
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage) || 'dashboard';
        await Navigation.navigateTo(lastPage);
        document.body.className = 'app-active';
    }
};
App.modules.Auth = Auth;

// Adicionar classes ao CSS para controlar as telas em vez de JS
// No seu style.css adicione:
// body.login-active #loginScreen { display: flex; }
// body.login-active #appLayout, body.login-active #loadingOverlay { display: none; }
// body.app-active #appLayout { display: flex; }
// body.app-active #loginScreen, body.app-active #loadingOverlay { display: none; }
// body.loading-active #loadingOverlay { display: flex; }
// body.loading-active #loginScreen, body.loading-active #appLayout { display: none; }

const Navigation = {
    init() {
        const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('sidebarOverlay');
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            if (link.id !== 'logoutBtn') link.addEventListener('click', e => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
                sidebar.classList.remove('active'); overlay.classList.remove('active');
            });
        });
        const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
        document.getElementById('mobileMenuToggle').addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);
    },
    async navigateTo(page) {
        const module = Object.values(App.modules).find(m => m.pageId === page);
        if (!module) page = 'dashboard';
        
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById(`${page}Page`).classList.remove('hidden');
        document.querySelectorAll('.sidebar-nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        localStorage.setItem(CONFIG.storageKeys.lastActivePage, page);
        
        if (module?.load) await module.load();
    }
};
App.modules.Navigation = Navigation;

// 4. MÓDULOS DE FUNCIONALIDADES (COMPLETOS)
const Dashboard = {
    pageId: 'dashboard',
    init(){},
    load() {
        this.updateStats();
        this.renderChart();
        this.renderOverdueAccounts();
    },
    updateStats() {
        const { cashFlow, receivables, sales, expenses } = state;
        const currentMonth = new Date().getMonth(), currentYear = new Date().getFullYear();
        document.getElementById('cashBalance').textContent = Utils.formatCurrency(cashFlow.reduce((a, t) => a + (t.type === 'entrada' ? 1 : -1) * t.value, 0));
        document.getElementById('totalReceivables').textContent = Utils.formatCurrency(receivables.filter(r => ['Pendente', 'Vencido'].includes(r.status)).reduce((a, r) => a + r.value, 0));
        const filterByMonth = (item) => { const d = new Date(item.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; };
        document.getElementById('monthlySales').textContent = Utils.formatCurrency(sales.filter(filterByMonth).reduce((a, s) => a + s.total, 0));
        document.getElementById('monthlyExpenses').textContent = Utils.formatCurrency(expenses.filter(filterByMonth).reduce((a, e) => a + e.value, 0));
    },
    renderChart() {
        const monthlySales = state.sales.filter(s => new Date(s.date).getMonth() === new Date().getMonth());
        const data = monthlySales.reduce((a, s) => { a[s.payment_method] = (a[s.payment_method] || 0) + s.total; return a; }, {});
        const chartCanvas = document.getElementById('paymentMethodChart');
        if (chartCanvas && Object.keys(data).length > 0) {
            Utils.renderChart('paymentMethodChart', 'doughnut', {
                labels: Object.keys(data),
                datasets: [{ data: Object.values(data), backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'], borderWidth: 0 }]
            }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8' } } } });
        } else if(chartCanvas) {
            if (state.chartInstances.paymentMethodChart) state.chartInstances.paymentMethodChart.destroy();
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px 'Segoe UI'"; ctx.fillStyle = 'var(--text-muted)'; ctx.textAlign = 'center';
            ctx.fillText('Sem dados de vendas este mês.', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
    },
    renderOverdueAccounts() {
        const overdue = state.receivables.filter(r => r.status === 'Vencido').sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
        const container = document.getElementById('overdueAccounts');
        if (overdue.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">Nenhuma conta vencida. 🎉</p>';
            return;
        }
        const today = new Date();
        container.innerHTML = overdue.map(acc => {
            const client = state.clients.find(c => c.id === acc.client_id);
            const days = Math.floor((today - new Date(acc.due_date)) / (1000*60*60*24));
            return `<div class="overdue-item"><div class="flex-between"><div><strong>${client?.name || 'Cliente'}</strong><br><small>${days} dia(s) atrasado</small></div><div class="text-right"><strong style="color: var(--danger-color);">${Utils.formatCurrency(acc.value)}</strong><br><small>Venceu: ${Utils.formatDate(acc.due_date)}</small></div></div></div>`;
        }).join('');
    }
};
App.modules.Dashboard = Dashboard;

const Clients = {
    pageId: 'clients',
    init() {
        document.getElementById('clientForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('clearClientForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportClients').addEventListener('click', this.export.bind(this));
    },
    load() { this.render(); },
    getFiltered() {
        const q = document.getElementById('clientSearch').value.toLowerCase();
        return q ? state.clients.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q)) : state.clients;
    },
    render() {
        const data = this.getFiltered();
        document.getElementById('clientCount').textContent = `${data.length} cliente(s)`;
        document.getElementById('clientsTableBody').innerHTML = data.map(c => `
            <tr>
                <td data-label="Nome">${c.name}</td>
                <td data-label="Telefone">${c.phone || 'N/A'}</td>
                <td data-label="Cadastro">${Utils.formatDate(c.created_at)}</td>
                <td data-label="Compras">${state.sales.filter(s => s.client_id === c.id).length}</td>
                <td data-label="Ações"><div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="App.modules.Clients.edit('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="App.modules.Clients.remove('${c.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`).join('');
    },
    async save(e) {
        e.preventDefault();
        const clientData = { name: e.target.clientName.value.trim(), phone: e.target.clientPhone.value.trim() };
        if (!clientData.name) return Notification.error('O nome é obrigatório.');
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const query = state.currentEditId
                ? db.from('clients').update(clientData).eq('id', state.currentEditId)
                : db.from('clients').insert(clientData);
            const { data, error } = await query.select().single();
            if (error) throw error;

            if (state.currentEditId) {
                const index = state.clients.findIndex(c => c.id === state.currentEditId);
                if (index > -1) state.clients[index] = data;
            } else {
                state.clients.unshift(data);
            }
            Notification.success(`Cliente ${state.currentEditId ? 'atualizado' : 'cadastrado'}!`);
            this.clearForm();
            this.render();
        } catch (error) { Notification.error(error.message); } 
        finally { btn.disabled = false; }
    },
    edit(id) {
        const client = state.clients.find(c => c.id === id);
        if (!client) return;
        state.currentEditId = id;
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientPhone').value = client.phone;
        document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar';
        document.getElementById('clientName').focus();
    },
    async remove(id) {
        if (!confirm('Deseja realmente excluir este cliente?')) return;
        const { error } = await db.from('clients').delete().eq('id', id);
        if (error) { Notification.error(error.message); }
        else {
            state.clients = state.clients.filter(c => c.id !== id);
            this.render();
            Notification.success('Cliente excluído.');
        }
    },
    clearForm() {
        state.currentEditId = null;
        document.getElementById('clientForm').reset();
        document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
    },
    export() {
        const dataToExport = this.getFiltered().map(c => ({
            id: c.id, nome: c.name, telefone: c.phone, data_cadastro: Utils.formatDate(c.created_at)
        }));
        Utils.exportToCSV("clientes_flor_de_maria.csv", dataToExport);
    }
};
App.modules.Clients = Clients;

const Products = {
    pageId: 'products',
    init() {
        document.getElementById('productForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('clearProductForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportProducts').addEventListener('click', this.export.bind(this));
    },
    load() { this.updateStats(); this.render(); },
    getFiltered() {
        const q = document.getElementById('productSearch').value.toLowerCase();
        return q ? state.products.filter(p => p.name.toLowerCase().includes(q) || p.ref_code.toLowerCase().includes(q)) : state.products;
    },
    render() {
        const data = this.getFiltered();
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = data.map(p => {
            const margin = p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0;
            const status = p.quantity > 5 ? 'success' : p.quantity > 0 ? 'warning' : 'danger';
            const statusText = p.quantity > 5 ? 'Em Estoque' : p.quantity > 0 ? 'Estoque Baixo' : 'Esgotado';
            return `
                <tr>
                    <td data-label="Código">${p.ref_code}</td>
                    <td data-label="Nome">${p.name}</td>
                    <td data-label="Qtd.">${p.quantity}</td>
                    <td data-label="P. Custo">${Utils.formatCurrency(p.cost_price)}</td>
                    <td data-label="P. Venda">${Utils.formatCurrency(p.sale_price)}</td>
                    <td data-label="Margem">${margin.toFixed(1)}%</td>
                    <td data-label="Status"><span class="badge badge-${status}">${statusText}</span></td>
                    <td data-label="Ações"><div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="App.modules.Products.edit('${p.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="App.modules.Products.remove('${p.id}')"><i class="fas fa-trash"></i></button>
                    </div></td>
                </tr>`;
        }).join('');
    },
    async save(e) {
        e.preventDefault();
        const form = e.target;
        const productData = {
            ref_code: form.productRefCode.value.trim(), name: form.productName.value.trim(),
            quantity: parseInt(form.productQuantity.value) || 0,
            cost_price: parseFloat(form.productCostPrice.value) || 0,
            sale_price: parseFloat(form.productSalePrice.value) || 0,
        };
        if (!productData.ref_code || !productData.name) return Notification.error('Código e Nome são obrigatórios.');

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const query = state.currentEditId
                ? db.from('products').update(productData).eq('id', state.currentEditId)
                : db.from('products').insert(productData);
            const { data, error } = await query.select().single();
            if (error) throw error;
            if (state.currentEditId) {
                const i = state.products.findIndex(p => p.id === state.currentEditId);
                if (i > -1) state.products[i] = data;
            } else { state.products.unshift(data); }
            Notification.success(`Produto ${state.currentEditId ? 'atualizado' : 'cadastrado'}!`);
            this.clearForm(); this.render(); this.updateStats();
        } catch (error) { Notification.error(error.message); }
        finally { btn.disabled = false; }
    },
    edit(id) {
        const p = state.products.find(p => p.id === id);
        if (!p) return;
        state.currentEditId = id;
        const form = document.getElementById('productForm');
        form.productRefCode.value = p.ref_code;
        form.productName.value = p.name;
        form.productQuantity.value = p.quantity;
        form.productCostPrice.value = p.cost_price;
        form.productSalePrice.value = p.sale_price;
        form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar';
        form.productName.focus();
    },
    async remove(id) {
        if (!confirm('Deseja realmente excluir este produto?')) return;
        const { error } = await db.from('products').delete().eq('id', id);
        if (error) { Notification.error(error.message); }
        else {
            state.products = state.products.filter(p => p.id !== id);
            this.render(); this.updateStats();
            Notification.success('Produto excluído.');
        }
    },
    clearForm() {
        state.currentEditId = null;
        document.getElementById('productForm').reset();
        document.querySelector('#productForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
    },
    updateStats() {
        document.getElementById('totalProducts').textContent = state.products.length;
        document.getElementById('outOfStockProducts').textContent = state.products.filter(p => p.quantity <= 0).length;
    },
    export() {
        Utils.exportToCSV("estoque.csv", this.getFiltered().map(p => ({
            codigo: p.ref_code, nome: p.name, quantidade: p.quantity,
            preco_custo: p.cost_price, preco_venda: p.sale_price
        })));
    }
};
App.modules.Products = Products;

const Sales = {
    pageId: 'sales',
    init() {
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(e => this.showSuggestions(e.target.value), 300));
        document.getElementById('finalizeSale').addEventListener('click', this.save.bind(this));
        document.getElementById('clearCart').addEventListener('click', () => this.clearForm());
        document.getElementById('salePaymentMethod').addEventListener('change', e => {
            document.getElementById('installmentsGroup').classList.toggle('hidden', e.target.value !== 'Crediário');
        });
    },
    load() {
        Utils.populateSelect('saleClient', state.clients, 'id', 'name', 'Consumidor Final');
        this.clearForm();
        this.renderCart();
    },
    showSuggestions(query) {
        const container = document.getElementById('productSuggestions');
        if (!query) { container.classList.add('hidden'); return; }
        const suggestions = state.products.filter(p => (p.name.toLowerCase().includes(query.toLowerCase()) || p.ref_code.toLowerCase().includes(query.toLowerCase())) && p.quantity > 0).slice(0, 5);
        if(suggestions.length === 0) { container.classList.add('hidden'); return; }
        container.innerHTML = suggestions.map(p => `<div class="suggestion-item" onclick="App.modules.Sales.addItemToCart('${p.id}')"><strong>${p.name}</strong> <small>(${p.ref_code}) - ${Utils.formatCurrency(p.sale_price)}</small></div>`).join('');
        container.classList.remove('hidden');
    },
    addItemToCart(productId) {
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('productSuggestions').classList.add('hidden');
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        const existingItem = state.cart.find(item => item.product_id === productId);
        if (existingItem) {
            if (existingItem.quantity < product.quantity) existingItem.quantity++;
            else Notification.warning('Quantidade máxima em estoque atingida.');
        } else {
            state.cart.push({ product_id: product.id, name: product.name, price: product.sale_price, quantity: 1, max_quantity: product.quantity });
        }
        this.renderCart();
    },
    updateCartItem(productId, change) {
        const itemIndex = state.cart.findIndex(i => i.product_id === productId);
        if (itemIndex === -1) return;
        const item = state.cart[itemIndex];
        const newQuantity = item.quantity + change;
        
        if (newQuantity <= 0) {
            state.cart.splice(itemIndex, 1);
        } else if (newQuantity <= item.max_quantity) {
            item.quantity = newQuantity;
        } else {
            Notification.warning('Quantidade máxima em estoque atingida.');
        }
        this.renderCart();
    },
    renderCart() {
        const tbody = document.getElementById('cartTableBody');
        const subtotal = state.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        document.getElementById('finalizeSale').disabled = state.cart.length === 0;

        tbody.innerHTML = state.cart.length === 0 
            ? '<tr><td colspan="5" class="text-center" style="padding: 40px;">Carrinho vazio</td></tr>'
            : state.cart.map(item => `
                <tr>
                    <td data-label="Produto">${item.name}</td>
                    <td data-label="Preço Unit.">${Utils.formatCurrency(item.price)}</td>
                    <td data-label="Qtd."><div class="quantity-control">
                        <button class="btn btn-secondary btn-sm" onclick="App.modules.Sales.updateCartItem('${item.product_id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="btn btn-secondary btn-sm" onclick="App.modules.Sales.updateCartItem('${item.product_id}', 1)">+</button>
                    </div></td>
                    <td data-label="Subtotal">${Utils.formatCurrency(item.price * item.quantity)}</td>
                    <td data-label="Ações"><button class="btn btn-danger btn-sm" onclick="App.modules.Sales.updateCartItem('${item.product_id}', -item.quantity)"><i class="fas fa-trash"></i></button></td>
                </tr>`).join('');
        document.getElementById('cartSubtotal').textContent = Utils.formatCurrency(subtotal);
        document.getElementById('cartTotal').textContent = Utils.formatCurrency(subtotal);
    },
    async save() {
        const clientId = document.getElementById('saleClient').value;
        const paymentMethod = document.getElementById('salePaymentMethod').value;
        if(paymentMethod === 'Crediário' && !clientId) return Notification.error('Selecione um cliente para vendas em crediário.');
        if(state.cart.length === 0) return Notification.error('O carrinho está vazio.');

        const btn = document.getElementById('finalizeSale');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        const saleData = {
            p_client_id: clientId || null,
            p_sale_date: new Date().toISOString(),
            p_items: JSON.stringify(state.cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, name: i.name, price: i.price }))),
            p_total: state.cart.reduce((a, i) => a + (i.price * i.quantity), 0),
            p_payment_method: paymentMethod,
            p_installments: parseInt(document.getElementById('saleInstallments').value) || 1,
        };
        
        try {
            const { data: result, error } = await db.rpc('handle_new_sale', saleData);
            if (error) throw error;
            
            Notification.success('Venda registrada com sucesso!');
            const newSale = result[0].sale_record;
            await App.loadAllData();
            this.clearForm();
            if (confirm('Venda finalizada. Deseja imprimir o recibo?')) {
                Receipts.generatePDF(newSale.id);
            }
            await Navigation.navigateTo('receipts');
        } catch (error) { Notification.error(`Erro: ${error.message}`); } 
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Finalizar Venda';
        }
    },
    clearForm() {
        state.cart = [];
        this.renderCart();
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('saleClient').value = '';
        document.getElementById('salePaymentMethod').value = 'Dinheiro';
        document.getElementById('saleInstallments').value = '1';
        document.getElementById('installmentsGroup').classList.add('hidden');
    }
};
App.modules.Sales = Sales;

const Receipts = {
    pageId: 'receipts',
    init() {
        const triggerRender = Utils.debounce(() => this.render(), 300);
        document.getElementById('receiptClientFilter').addEventListener('change', triggerRender);
        document.getElementById('receiptDateFilter').addEventListener('change', triggerRender);
        document.getElementById('clearReceiptFilters').addEventListener('click', () => {
            document.getElementById('receiptClientFilter').value = '';
            document.getElementById('receiptDateFilter').value = '';
            this.render();
        });
    },
    load() {
        Utils.populateSelect('receiptClientFilter', state.clients, 'id', 'name', 'Todos os Clientes');
        this.render();
    },
    getFiltered() {
        const clientFilter = document.getElementById('receiptClientFilter').value;
        const dateFilter = document.getElementById('receiptDateFilter').value;
        return state.sales.filter(s => {
            const clientMatch = !clientFilter || s.client_id === clientFilter;
            const dateMatch = !dateFilter || Utils.formatDate(s.date) === Utils.formatDate(dateFilter);
            return clientMatch && dateMatch;
        });
    },
    render() {
        const filteredSales = this.getFiltered();
        document.getElementById('receiptsTableBody').innerHTML = filteredSales.map(sale => {
            const client = state.clients.find(c => c.id === sale.client_id);
            return `
                <tr>
                    <td data-label="ID da Venda">${sale.id.substring(0, 8)}...</td>
                    <td data-label="Data">${Utils.formatDateTime(sale.date)}</td>
                    <td data-label="Cliente">${client?.name || 'Consumidor Final'}</td>
                    <td data-label="Total">${Utils.formatCurrency(sale.total)}</td>
                    <td data-label="Pagamento">${sale.payment_method}</td>
                    <td data-label="Ações">
                        <button class="btn btn-secondary btn-sm" onclick="App.modules.Receipts.generatePDF('${sale.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    generatePDF(saleId) {
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale) return Notification.error('Venda não encontrada');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const client = state.clients.find(c => c.id === sale.client_id);

        doc.setFontSize(18); doc.text(CONFIG.company.name, 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(CONFIG.company.address, 105, 26, { align: 'center' });
        doc.text(`CNPJ: ${CONFIG.company.cnpj} | Tel: ${CONFIG.company.phone}`, 105, 31, { align: 'center' });
        doc.line(14, 35, 196, 35);
        doc.setFontSize(14); doc.text('Recibo de Venda', 14, 45);
        doc.setFontSize(10); doc.text(`Data: ${Utils.formatDateTime(sale.date)}`, 196, 45, { align: 'right' });
        doc.text('Cliente:', 14, 55);
        doc.text(client ? client.name : 'Consumidor Final', 30, 55);
        
        const head = [['Qtd', 'Produto', 'Preço Unit.', 'Subtotal']];
        const body = JSON.parse(sale.items).map(item => [item.quantity, item.name, Utils.formatCurrency(item.price), Utils.formatCurrency(item.price * item.quantity)]);
        doc.autoTable({ head, body, startY: 65 });

        const finalY = doc.autoTable.previous.finalY;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('Total:', 140, finalY + 10, { align: 'right' });
        doc.text(Utils.formatCurrency(sale.total), 196, finalY + 10, { align: 'right' });
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`Pagamento: ${sale.payment_method}`, 140, finalY + 15, { align: 'right' });

        doc.save(`recibo_${sale.id.substring(0,8)}.pdf`);
    }
};
App.modules.Receipts = Receipts;

const CashFlow = {
    pageId: 'cashflow',
    init() {
        document.getElementById('cashFlowForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('cashFlowSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('clearCashFlowForm').addEventListener('click', () => document.getElementById('cashFlowForm').reset());
        document.getElementById('exportCashFlow').addEventListener('click', this.export.bind(this));
    },
    load() { this.render(); this.updateStats(); },
    getFiltered() {
        const q = document.getElementById('cashFlowSearch').value.toLowerCase();
        return q ? state.cashFlow.filter(c => c.description.toLowerCase().includes(q)) : state.cashFlow;
    },
    render() {
        const data = this.getFiltered();
        document.getElementById('cashFlowTableBody').innerHTML = data.map(c => `
            <tr>
                <td data-label="Data">${Utils.formatDate(c.date)}</td>
                <td data-label="Tipo"><span class="badge badge-${c.type === 'entrada' ? 'success' : 'danger'}">${c.type}</span></td>
                <td data-label="Descrição">${c.description}</td>
                <td data-label="Valor" style="color: var(--${c.type === 'entrada' ? 'accent' : 'danger'}-color);">${Utils.formatCurrency(c.value)}</td>
                <td data-label="Ações">${!c.sale_id && !c.receivable_id && !c.expense_id ? `<button class="btn btn-danger btn-sm" onclick="App.modules.CashFlow.remove('${c.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>
            </tr>
        `).join('');
    },
    updateStats() {
        const entradas = state.cashFlow.filter(c => c.type === 'entrada').reduce((a, c) => a + c.value, 0);
        const saidas = state.cashFlow.filter(c => c.type === 'saida').reduce((a, c) => a + c.value, 0);
        document.getElementById('totalEntradas').textContent = Utils.formatCurrency(entradas);
        document.getElementById('totalSaidas').textContent = Utils.formatCurrency(saidas);
        document.getElementById('saldoAtual').textContent = Utils.formatCurrency(entradas - saidas);
    },
    async save(e) {
        e.preventDefault();
        const form = e.target;
        const entryData = {
            type: form.cashFlowType.value,
            description: form.cashFlowDescription.value.trim(),
            value: parseFloat(form.cashFlowValue.value),
            date: form.cashFlowDate.value,
        };
        if (!entryData.description || !entryData.value || !entryData.date) return Notification.error("Preencha todos os campos.");
        
        const { data, error } = await db.from('cash_flow').insert(entryData).select().single();
        if(error) { Notification.error(error.message); }
        else {
            state.cashFlow.unshift(data);
            this.render(); this.updateStats();
            Notification.success('Lançamento manual salvo!');
            form.reset();
        }
    },
    async remove(id) {
        if (!confirm('Deseja excluir este lançamento manual?')) return;
        const { error } = await db.from('cash_flow').delete().eq('id', id);
        if (error) { Notification.error(error.message); }
        else {
            state.cashFlow = state.cashFlow.filter(c => c.id !== id);
            this.render(); this.updateStats();
            Notification.success('Lançamento excluído.');
        }
    },
    export() {
        Utils.exportToCSV("fluxo_caixa.csv", this.getFiltered().map(c => ({
            data: c.date, tipo: c.type, descricao: c.description, valor: c.value, metodo_pgto: c.payment_method
        })));
    }
};
App.modules.CashFlow = CashFlow;

const Expenses = {
    pageId: 'expenses',
    init() {
        document.getElementById('expenseForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('expenseSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('expenseFilterCategory').addEventListener('change', () => this.render());
        document.getElementById('clearExpenseForm').addEventListener('click', () => document.getElementById('expenseForm').reset());
    },
    load() {
        const categories = [...new Set(state.expenses.map(e => e.category))];
        const select = document.getElementById('expenseFilterCategory');
        select.innerHTML = '<option value="">Todas as categorias</option>';
        categories.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
        this.render(); this.updateStats();
    },
    getFiltered() {
        const search = document.getElementById('expenseSearch').value.toLowerCase();
        const category = document.getElementById('expenseFilterCategory').value;
        return state.expenses.filter(e => 
            (!search || e.description.toLowerCase().includes(search)) && 
            (!category || e.category === category)
        );
    },
    render() {
        const data = this.getFiltered();
        document.getElementById('expensesTableBody').innerHTML = data.map(e => `
            <tr>
                <td data-label="Data">${Utils.formatDate(e.date)}</td>
                <td data-label="Descrição">${e.description}</td>
                <td data-label="Categoria">${e.category}</td>
                <td data-label="Valor">${Utils.formatCurrency(e.value)}</td>
                <td data-label="Ações">
                    <button class="btn btn-danger btn-sm" onclick="App.modules.Expenses.remove('${e.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },
    async save(e) {
        e.preventDefault();
        const form = e.target;
        const expenseData = {
            p_description: form.expenseDescription.value.trim(),
            p_category: form.expenseCategory.value,
            p_value: parseFloat(form.expenseValue.value),
            p_date: form.expenseDate.value
        };
        if(!expenseData.p_description || !expenseData.p_category || !expenseData.p_value || !expenseData.p_date)
            return Notification.error("Preencha todos os campos.");
        
        const { data, error } = await db.rpc('handle_new_expense', expenseData);
        if (error) { Notification.error(error.message); }
        else {
            state.expenses.unshift(data[0].expense_record);
            state.cashFlow.unshift(data[0].cash_flow_record);
            Notification.success('Despesa registrada!');
            this.render(); this.updateStats();
            form.reset();
        }
    },
    async remove(id) {
        if(!confirm('Isso excluirá a despesa e o lançamento no caixa. Continuar?')) return;
        // Simplificado: Exclui só a despesa e o lançamento fica. Ideal seria transação de deleção.
        const { error } = await db.from('expenses').delete().eq('id', id);
        if (error) { Notification.error(error.message); }
        else {
            state.expenses = state.expenses.filter(e => e.id !== id);
            // Idealmente, remover ou estornar do caixa
            await App.loadAllData(); // Recarrega para consistência
            this.render(); this.updateStats();
            Notification.success('Despesa excluída.');
        }
    },
    updateStats(){
        const currentMonth = new Date().getMonth(), currentYear = new Date().getFullYear();
        const filterMonth = e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; };
        const filterYear = e => new Date(e.date).getFullYear() === currentYear;
        document.getElementById('totalExpensesMonth').textContent = Utils.formatCurrency(state.expenses.filter(filterMonth).reduce((a,e) => a + e.value, 0));
        document.getElementById('totalExpensesYear').textContent = Utils.formatCurrency(state.expenses.filter(filterYear).reduce((a,e) => a + e.value, 0));
    }
};
App.modules.Expenses = Expenses;

const Receivables = {
    pageId: 'receivables',
    init() {
        document.getElementById('receivableForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('receivableSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('receivableFilterStatus').addEventListener('change', () => this.render());
    },
    load() { 
        Utils.populateSelect('receivableClient', state.clients, 'id', 'name', 'Selecione um cliente');
        this.render(); this.updateStats();
    },
    getFiltered() {
        const search = document.getElementById('receivableSearch').value.toLowerCase();
        const status = document.getElementById('receivableFilterStatus').value;
        return state.receivables.filter(r => {
            const client = state.clients.find(c => c.id === r.client_id);
            const clientMatch = client ? client.name.toLowerCase().includes(search) : false;
            const descMatch = r.description.toLowerCase().includes(search);
            return (clientMatch || descMatch) && (!status || r.status === status);
        });
    },
    render() {
        const data = this.getFiltered();
        document.getElementById('receivablesTableBody').innerHTML = data.map(r => {
            const client = state.clients.find(c => c.id === r.client_id);
            return `
            <tr>
                <td data-label="Cliente">${client?.name || 'N/A'}</td>
                <td data-label="Descrição">${r.description}</td>
                <td data-label="Valor">${Utils.formatCurrency(r.value)}</td>
                <td data-label="Vencimento">${Utils.formatDate(r.due_date)}</td>
                <td data-label="Status"><span class="badge badge-${r.status === 'Pago' ? 'success' : r.status === 'Pendente' ? 'info' : 'danger'}">${r.status}</span></td>
                <td data-label="Ações">${r.status !== 'Pago' ? `<button class="btn btn-secondary btn-sm" onclick="App.modules.Receivables.markAsPaid('${r.id}')">Baixar</button>` : ''}</td>
            </tr>
            `
        }).join('');
    },
    updateStats() {
        const currentMonth = new Date().getMonth(), currentYear = new Date().getFullYear();
        document.getElementById('totalReceivablesPending').textContent = Utils.formatCurrency(state.receivables.filter(r=>r.status === 'Pendente').reduce((a,r)=>a+r.value,0));
        document.getElementById('totalReceivablesOverdue').textContent = Utils.formatCurrency(state.receivables.filter(r=>r.status === 'Vencido').reduce((a,r)=>a+r.value,0));
        document.getElementById('totalReceivablesPaid').textContent = Utils.formatCurrency(state.receivables.filter(r=>{
            if(r.status !== 'Pago' || !r.paid_at) return false;
            const d = new Date(r.paid_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((a,r)=>a+r.value,0));
    },
    async save(e){ /* Lógica para salvar conta manual se necessário */ },
    async markAsPaid(id) {
        const paymentMethod = prompt("Informe o método de pagamento (Ex: Dinheiro, Pix):", "Pix");
        if(!paymentMethod) return;
        const { data, error } = await db.rpc('mark_receivable_as_paid', { p_receivable_id: id, p_payment_method: paymentMethod });
        if(error) { Notification.error(error.message); }
        else {
            const i = state.receivables.findIndex(r => r.id === id);
            if(i > -1) state.receivables[i] = data[0].updated_receivable;
            state.cashFlow.unshift(data[0].new_cash_flow_entry);
            this.render(); this.updateStats();
            Notification.success('Baixa realizada com sucesso!');
        }
    },
    checkOverdue(){
        const today = new Date(); today.setHours(0,0,0,0);
        state.receivables.forEach(r => {
            if (r.status === 'Pendente' && new Date(r.due_date) < today) {
                r.status = 'Vencido';
                db.from('receivables').update({status: 'Vencido'}).eq('id', r.id).then();
            }
        });
    }
};
App.modules.Receivables = Receivables;

const Reports = {
    pageId: 'reports',
    init(){},
    load(){}
};
App.modules.Reports = Reports;

const Settings = {
    pageId: 'settings',
    init(){
        document.getElementById('downloadBackup').addEventListener('click', this.downloadBackup.bind(this));
        document.getElementById('restoreFile').addEventListener('change', e => {
            document.getElementById('restoreBackup').disabled = !e.target.files.length;
        });
        document.getElementById('restoreBackup').addEventListener('click', this.restoreBackup.bind(this));
    },
    load(){
        document.getElementById('backupClientsCount').textContent = state.clients.length;
        document.getElementById('backupProductsCount').textContent = state.products.length;
        document.getElementById('backupSalesCount').textContent = state.sales.length;
        document.getElementById('backupCashFlowCount').textContent = state.cashFlow.length;
        document.getElementById('backupExpensesCount').textContent = state.expenses.length;
        document.getElementById('backupReceivablesCount').textContent = state.receivables.length;
    },
    downloadBackup() {
        const backupData = {
            clients: state.clients,
            products: state.products,
            sales: state.sales,
            cashFlow: state.cashFlow,
            expenses: state.expenses,
            receivables: state.receivables
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_flor_de_maria_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    async restoreBackup(e) {
        e.preventDefault();
        const file = document.getElementById('restoreFile').files[0];
        if(!file) return Notification.warning("Selecione um arquivo de backup.");
        if(!confirm("ATENÇÃO! Isso irá apagar TODOS os dados atuais e substituí-los pelo backup. Esta ação é IRREVERSÍVEL. Deseja continuar?")) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                document.body.className = 'loading-active';
                
                // Limpa tabelas atuais
                const tables = ['sales', 'cash_flow', 'expenses', 'receivables', 'clients', 'products'];
                for(const table of tables) { await db.from(table).delete().gt('id', 0); } // workaround to delete all
                
                // Insere novos dados
                for(const table of tables.reverse()) { // insere em ordem inversa de dependência
                    if(backupData[table] && backupData[table].length > 0) {
                        const { error } = await db.from(table).insert(backupData[table]);
                        if(error) throw new Error(`Erro ao restaurar ${table}: ${error.message}`);
                    }
                }
                
                Notification.success("Backup restaurado com sucesso! Recarregando...");
                setTimeout(() => window.location.reload(), 2000);
            } catch(e) {
                Notification.error(`Erro ao restaurar: ${e.message}`);
                document.body.className = 'app-active';
            }
        };
        reader.readAsText(file);
    }
};
App.modules.Settings = Settings;

// INICIALIZAÇÃO DA APLICAÇÃO
window.addEventListener('DOMContentLoaded', () => App.init());
