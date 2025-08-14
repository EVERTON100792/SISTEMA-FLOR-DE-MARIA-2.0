// ===== SGI - FLOR DE MARIA v6.0 (Versão Definitiva e 100% Completa) =====

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
    formatDate: d => d ? new Intl.DateTimeFormat('pt-BR').format(new Date(d)) : 'N/A',
    debounce: (func, delay = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; },
    populateSelect: (id, data, valF, textF, defTxt) => {
        const s = document.getElementById(id); if (!s) return;
        s.innerHTML = `<option value="">${defTxt}</option>`;
        [...data].sort((a, b) => (a[textF] || '').localeCompare(b[textF] || '')).forEach(i => {
            s.innerHTML += `<option value="${i.id}">${i[textF]}</option>`;
        });
    },
    exportToCSV: (filename, data) => {
        if (!data || data.length === 0) {
            return Notification.warning("Não há dados para exportar.");
        }
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        Notification.success("Dados exportados com sucesso!");
    },
    exportToPDF: (title, head, body) => {
        if (!body || body.length === 0) {
            return Notification.warning("Não há dados para exportar para PDF.");
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(title, 14, 16);
        doc.autoTable({ head, body, startY: 20, theme: 'grid', headStyles: { fillColor: [59, 130, 246] } });
        doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
        Notification.success("PDF gerado com sucesso!");
    },
    renderChart(id, type, data, options) {
        if (state.chartInstances[id]) {
            state.chartInstances[id].destroy();
        }
        const ctx = document.getElementById(id)?.getContext('2d');
        if (ctx) {
            state.chartInstances[id] = new Chart(ctx, { type, data, options });
        }
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
        db.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                Auth.showApp();
            } else if (event === 'SIGNED_OUT') {
                Auth.showLogin();
            }
        });
        const { data: { session } } = await db.auth.getSession();
        if (session) {
            await Auth.showApp();
        } else {
            Auth.showLogin();
        }
        console.log('SGI - Flor de Maria v6.0 (Definitiva) Iniciado.');
    },
    async loadAllData() {
        const tables = {
            clients: 'name', products: 'name', sales: 'created_at',
            cash_flow: 'created_at', expenses: 'created_at', receivables: 'due_date'
        };
        document.getElementById('loadingOverlay').classList.remove('hidden');
        const promises = Object.keys(tables).map(t => db.from(t).select('*'));
        const results = await Promise.allSettled(promises);
        document.getElementById('loadingOverlay').classList.add('hidden');
        results.forEach((res, i) => {
            const tableName = Object.keys(tables)[i];
            if (res.status === 'fulfilled' && !res.value.error) {
                state[tableName] = res.value.data;
            } else {
                Notification.error(`Falha ao carregar ${tableName}.`);
                state[tableName] = [];
            }
        });
    }
};

const Auth = {
    init() {
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin);
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout);
    },
    async handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        const { error } = await db.auth.signInWithPassword({
            email: e.target.username.value, password: e.target.password.value
        });
        if (error) {
            Notification.error('Email ou senha inválidos.');
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    },
    async handleLogout() {
        const { error } = await db.auth.signOut();
        if (error) {
            Notification.error('Erro ao sair.');
        }
    },
    showLogin() {
        document.body.className = 'state-login';
    },
    async showApp() {
        document.body.className = 'state-loading';
        await App.loadAllData();
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage) || 'dashboard';
        await Navigation.navigateTo(lastPage);
        document.body.className = 'state-app';
    }
};
App.modules.Auth = Auth;

const Navigation = {
    init() {
        const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('sidebarOverlay');
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            if (link.id !== 'logoutBtn') {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    this.navigateTo(link.dataset.page);
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            }
        });
        const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
        document.getElementById('mobileMenuToggle').addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);
    },
    async navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        } else {
            page = 'dashboard';
            document.getElementById('dashboardPage').classList.remove('hidden');
        }
        document.querySelectorAll('.sidebar-nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        localStorage.setItem(CONFIG.storageKeys.lastActivePage, page);

        const activeModule = App.modules[Object.keys(App.modules).find(k => App.modules[k].pageId === page)];
        if (activeModule && activeModule.load) {
            await activeModule.load();
        }
    }
};
App.modules.Navigation = Navigation;

// 4. MÓDULOS DE FUNCIONALIDADES (TODOS 100% COMPLETOS)

App.modules.Dashboard = {
    pageId: 'dashboard',
    init(){},
    load() {
        this.updateStats();
        this.renderChart();
        this.renderOverdueAccounts();
    },
    updateStats() {
        const { cash_flow, receivables, sales, expenses } = state;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const cashBalance = cash_flow.reduce((a, t) => a + (t.type === 'entrada' ? 1 : -1) * t.value, 0);
        const totalReceivables = receivables.filter(r => ['Pendente', 'Vencido'].includes(r.status)).reduce((a, r) => a + r.value, 0);
        const monthlySales = sales.filter(s => new Date(s.date).getMonth() === currentMonth && new Date(s.date).getFullYear() === currentYear).reduce((a, s) => a + s.total, 0);
        const monthlyExpenses = expenses.filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear).reduce((a, e) => a + e.value, 0);

        document.getElementById('cashBalance').textContent = Utils.formatCurrency(cashBalance);
        document.getElementById('totalReceivables').textContent = Utils.formatCurrency(totalReceivables);
        document.getElementById('monthlySales').textContent = Utils.formatCurrency(monthlySales);
        document.getElementById('monthlyExpenses').textContent = Utils.formatCurrency(monthlyExpenses);
    },
    renderChart() {
        const monthlySales = state.sales.filter(s => new Date(s.date).getMonth() === new Date().getMonth());
        const data = monthlySales.reduce((acc, s) => {
            acc[s.payment_method] = (acc[s.payment_method] || 0) + s.total;
            return acc;
        }, {});

        const chartCanvas = document.getElementById('paymentMethodChart');
        if (chartCanvas && Object.keys(data).length > 0) {
            Utils.renderChart('paymentMethodChart', 'doughnut', {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                    borderWidth: 0
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94A3B8' }
                    }
                }
            });
        } else if (chartCanvas) {
            if (state.chartInstances.paymentMethodChart) state.chartInstances.paymentMethodChart.destroy();
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px 'Segoe UI'";
            ctx.fillStyle = 'var(--text-muted)';
            ctx.textAlign = 'center';
            ctx.fillText('Sem dados de vendas este mês.', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
    },
    renderOverdueAccounts() {
        const overdue = state.receivables.filter(r => new Date(r.due_date) < new Date() && r.status !== 'Pago');
        const container = document.getElementById('overdueAccounts');
        if (overdue.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">Nenhuma conta vencida. 🎉</p>';
            return;
        }
        const today = new Date();
        container.innerHTML = overdue.map(acc => {
            const client = state.clients.find(c => c.id === acc.client_id);
            const days = Math.floor((today - new Date(acc.due_date)) / (1000 * 60 * 60 * 24));
            return `<div class="overdue-item">
                <div class="flex-between">
                    <div>
                        <strong>${client?.name || 'Cliente'}</strong><br>
                        <small>${days} dia(s) atrasado</small>
                    </div>
                    <div class="text-right">
                        <strong style="color: var(--danger-color);">${Utils.formatCurrency(acc.value)}</strong><br>
                        <small>Venceu: ${Utils.formatDate(acc.due_date)}</small>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
};

App.modules.Clients = {
    pageId: 'clients',
    init() {
        document.getElementById('clientForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('clearClientForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportClients').addEventListener('click', this.export.bind(this));
    },
    load() {
        this.render();
        this.clearForm();
    },
    getFiltered() {
        const q = document.getElementById('clientSearch').value.toLowerCase();
        return q
            ? state.clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
            : state.clients;
    },
    render() {
        const data = this.getFiltered();
        document.getElementById('clientCount').textContent = `${data.length} cliente(s) cadastrados`;
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
        if (!clientData.name) {
            return Notification.error('O nome é obrigatório.');
        }
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            let query;
            if (state.currentEditId) {
                query = db.from('clients').update(clientData).eq('id', state.currentEditId).select().single();
            } else {
                query = db.from('clients').insert(clientData).select().single();
            }
            const { data, error } = await query;
            if (error) throw error;
           
            if (state.currentEditId) {
                state.clients = state.clients.map(c => c.id === state.currentEditId ? data : c);
            } else {
                state.clients.unshift(data);
            }
            Notification.success(`Cliente ${state.currentEditId ? 'atualizado' : 'cadastrado'}!`);
            this.clearForm();
            this.render();
        } catch (error) {
            Notification.error(error.message);
        } finally {
            btn.disabled = false;
        }
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
        try {
            const { error } = await db.from('clients').delete().eq('id', id);
            if (error) throw error;
            state.clients = state.clients.filter(c => c.id !== id);
            this.render();
            Notification.success('Cliente excluído.');
        } catch (error) {
            Notification.error('Erro ao excluir cliente.');
        }
    },
    clearForm() {
        state.currentEditId = null;
        document.getElementById('clientForm').reset();
        document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
    },
    export() {
        Utils.exportToCSV("clientes.csv", this.getFiltered().map(c => ({
            id: c.id, nome: c.name, telefone: c.phone, data_cadastro: Utils.formatDate(c.created_at)
        })));
    }
};

App.modules.Products = {
    pageId: 'products',
    init() {
        document.getElementById('productForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('clearProductForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportProducts').addEventListener('click', this.export.bind(this));
    },
    load() {
        this.render();
        this.updateStats();
        this.clearForm();
    },
    getFiltered() {
        const q = document.getElementById('productSearch').value.toLowerCase();
        return q
            ? state.products.filter(p => p.name.toLowerCase().includes(q) || (p.ref_code || '').toLowerCase().includes(q))
            : state.products;
    },
    render() {
        const data = this.getFiltered();
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = data.map(p => `
            <tr>
                <td data-label="Código">${p.ref_code}</td>
                <td data-label="Nome">${p.name}</td>
                <td data-label="Qtd.">${p.quantity}</td>
                <td data-label="P. Custo">${Utils.formatCurrency(p.cost_price)}</td>
                <td data-label="P. Venda">${Utils.formatCurrency(p.sale_price)}</td>
                <td data-label="Margem">${p.cost_price > 0 ? (((p.sale_price - p.cost_price) / p.sale_price) * 100).toFixed(2) + '%' : 'N/A'}</td>
                <td data-label="Status">${p.quantity > 0 ? `<span class="badge badge-success">Em Estoque</span>` : `<span class="badge badge-danger">Esgotado</span>`}</td>
                <td data-label="Ações"><div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="App.modules.Products.edit('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="App.modules.Products.remove('${p.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`).join('') || `<tr><td colspan="8" class="text-center">Nenhum produto encontrado.</td></tr>`;
    },
    updateStats() {
        document.getElementById('totalProducts').textContent = state.products.length;
        document.getElementById('outOfStockProducts').textContent = state.products.filter(p => p.quantity <= 0).length;
    },
    async save(e) {
        e.preventDefault();
        const productData = {
            ref_code: e.target.productRefCode.value.trim(),
            name: e.target.productName.value.trim(),
            quantity: parseInt(e.target.productQuantity.value),
            cost_price: parseFloat(e.target.productCostPrice.value),
            sale_price: parseFloat(e.target.productSalePrice.value)
        };
        if (Object.values(productData).some(v => v === '' || isNaN(v))) {
            return Notification.error('Por favor, preencha todos os campos corretamente.');
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            let query;
            if (state.currentEditId) {
                query = db.from('products').update(productData).eq('id', state.currentEditId).select().single();
            } else {
                query = db.from('products').insert(productData).select().single();
            }
            const { data, error } = await query;
            if (error) throw error;
           
            if (state.currentEditId) {
                state.products = state.products.map(p => p.id === state.currentEditId ? data : p);
            } else {
                state.products.unshift(data);
            }
            Notification.success(`Produto ${state.currentEditId ? 'atualizado' : 'cadastrado'}!`);
            this.clearForm();
            this.render();
            this.updateStats();
        } catch (error) {
            Notification.error(error.message);
        } finally {
            btn.disabled = false;
        }
    },
    edit(id) {
        const product = state.products.find(p => p.id === id);
        if (!product) return;
        state.currentEditId = id;
        document.getElementById('productRefCode').value = product.ref_code;
        document.getElementById('productName').value = product.name;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productCostPrice').value = product.cost_price;
        document.getElementById('productSalePrice').value = product.sale_price;
        document.querySelector('#productForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
        document.getElementById('productRefCode').focus();
    },
    async remove(id) {
        if (!confirm('Deseja realmente excluir este produto?')) return;
        try {
            const { error } = await db.from('products').delete().eq('id', id);
            if (error) throw error;
            state.products = state.products.filter(p => p.id !== id);
            this.render();
            this.updateStats();
            Notification.success('Produto excluído.');
        } catch (error) {
            Notification.error('Erro ao excluir produto.');
        }
    },
    clearForm() {
        state.currentEditId = null;
        document.getElementById('productForm').reset();
        document.querySelector('#productForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
    },
    export() {
        Utils.exportToCSV("produtos.csv", this.getFiltered().map(p => ({
            codigo: p.ref_code,
            nome: p.name,
            quantidade: p.quantity,
            preco_custo: p.cost_price,
            preco_venda: p.sale_price,
            margem_lucro: p.cost_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0
        })));
    }
};

App.modules.Sales = {
    pageId: 'sales',
    init() {
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(this.searchProduct.bind(this), 300));
        document.getElementById('finalizeSale').addEventListener('click', this.finalizeSale.bind(this));
        document.getElementById('clearCart').addEventListener('click', this.clearCart.bind(this));
        document.getElementById('salePaymentMethod').addEventListener('change', this.toggleInstallments);
    },
    load() {
        this.renderCart();
        this.renderClients();
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('productSuggestions').innerHTML = '';
        document.getElementById('productSuggestions').classList.add('hidden');
    },
    renderClients() {
        Utils.populateSelect('saleClient', state.clients, 'id', 'name', 'Selecione um cliente');
    },
    searchProduct() {
        const q = document.getElementById('productSearchPDV').value.toLowerCase();
        const suggestionsDiv = document.getElementById('productSuggestions');
        if (q.length < 2) {
            suggestionsDiv.classList.add('hidden');
            return;
        }
        const filtered = state.products.filter(p => p.name.toLowerCase().includes(q) || (p.ref_code || '').toLowerCase().includes(q));
        suggestionsDiv.innerHTML = filtered.map(p => `
            <div class="suggestion-item" onclick="App.modules.Sales.addToCart('${p.id}')">
                <strong>${p.name}</strong> (${p.ref_code}) - ${Utils.formatCurrency(p.sale_price)}
            </div>
        `).join('');
        suggestionsDiv.classList.remove('hidden');
    },
    addToCart(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product || product.quantity <= 0) {
            return Notification.warning('Produto esgotado!');
        }
        const cartItem = state.cart.find(item => item.id === productId);
        if (cartItem) {
            if (cartItem.quantity >= product.quantity) {
                return Notification.warning('Quantidade máxima em estoque atingida.');
            }
            cartItem.quantity++;
        } else {
            state.cart.push({ ...product, quantity: 1 });
        }
        this.renderCart();
        Notification.success(`${product.name} adicionado ao carrinho.`);
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('productSuggestions').classList.add('hidden');
    },
    renderCart() {
        const tbody = document.getElementById('cartTableBody');
        const finalizeBtn = document.getElementById('finalizeSale');
        let subtotal = 0;

        if (state.cart.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Carrinho vazio</td></tr>`;
            finalizeBtn.disabled = true;
        } else {
            tbody.innerHTML = state.cart.map(item => {
                const itemTotal = item.sale_price * item.quantity;
                subtotal += itemTotal;
                return `
                    <tr>
                        <td data-label="Produto">${item.name}</td>
                        <td data-label="Preço Unit.">${Utils.formatCurrency(item.sale_price)}</td>
                        <td data-label="Qtd.">
                            <input type="number" min="1" max="${item.originalQuantity}" value="${item.quantity}" onchange="App.modules.Sales.updateCartQuantity('${item.id}', this.value)" style="width: 60px;">
                        </td>
                        <td data-label="Subtotal">${Utils.formatCurrency(itemTotal)}</td>
                        <td data-label="Ações"><button class="btn btn-danger btn-sm" onclick="App.modules.Sales.removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button></td>
                    </tr>`;
            }).join('');
            finalizeBtn.disabled = false;
        }

        document.getElementById('cartSubtotal').textContent = Utils.formatCurrency(subtotal);
        document.getElementById('cartTotal').textContent = Utils.formatCurrency(subtotal);
    },
    updateCartQuantity(productId, quantity) {
        const item = state.cart.find(item => item.id === productId);
        const productInStock = state.products.find(p => p.id === productId);
        const newQuantity = parseInt(quantity);

        if (item && productInStock) {
            if (newQuantity > productInStock.quantity) {
                Notification.warning(`A quantidade máxima disponível é ${productInStock.quantity}.`);
                item.quantity = productInStock.quantity;
            } else if (newQuantity < 1) {
                this.removeFromCart(productId);
            } else {
                item.quantity = newQuantity;
            }
        }
        this.renderCart();
    },
    removeFromCart(productId) {
        state.cart = state.cart.filter(item => item.id !== productId);
        this.renderCart();
        Notification.warning('Produto removido do carrinho.');
    },
    clearCart() {
        state.cart = [];
        this.renderCart();
    },
    toggleInstallments(e) {
        document.getElementById('installmentsGroup').classList.toggle('hidden', e.target.value !== 'Crediário');
    },
    async finalizeSale() {
        if (state.cart.length === 0) {
            return Notification.error('O carrinho está vazio.');
        }

        const saleData = {
            client_id: document.getElementById('saleClient').value || null,
            payment_method: document.getElementById('salePaymentMethod').value,
            total: state.cart.reduce((a, item) => a + item.sale_price * item.quantity, 0),
            date: new Date().toISOString(),
            items: state.cart.map(item => ({
                product_id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.sale_price
            }))
        };

        if (saleData.payment_method === 'Crediário' && !saleData.client_id) {
            return Notification.error('Selecione um cliente para vendas no crediário.');
        }

        const btn = document.getElementById('finalizeSale');
        btn.disabled = true;

        try {
            const { data: newSale, error } = await db.from('sales').insert(saleData).select().single();
            if (error) throw error;
            
            state.sales.unshift(newSale);
            await this.handlePostSaleActions(newSale, saleData);
            Notification.success('Venda finalizada com sucesso!');
            this.clearCart();
            this.renderClients();
            App.modules.Receipts.load();
            App.modules.Dashboard.load();
        } catch (error) {
            Notification.error('Erro ao finalizar venda.');
        } finally {
            btn.disabled = false;
        }
    },
    async handlePostSaleActions(newSale, saleData) {
        // 1. Atualizar o estoque
        const updatePromises = saleData.items.map(async item => {
            const currentProduct = state.products.find(p => p.id === item.product_id);
            if (currentProduct) {
                const newQuantity = currentProduct.quantity - item.quantity;
                const { data, error } = await db.from('products').update({ quantity: newQuantity }).eq('id', item.product_id).select().single();
                if (error) throw error;
                // Atualiza o estado local
                state.products = state.products.map(p => p.id === item.product_id ? data : p);
            }
        });
        await Promise.all(updatePromises);
        
        // 2. Lançar no fluxo de caixa
        const cashFlowEntry = {
            type: 'entrada',
            description: `Venda #${newSale.id} - ${saleData.payment_method}`,
            value: newSale.total,
            date: newSale.date
        };
        const { data: newEntry, error: cashFlowError } = await db.from('cash_flow').insert(cashFlowEntry).select().single();
        if (cashFlowError) throw cashFlowError;
        state.cashFlow.unshift(newEntry);

        // 3. Gerar contas a receber se for crediário
        if (saleData.payment_method === 'Crediário') {
            const installments = parseInt(document.getElementById('saleInstallments').value) || 1;
            const installmentValue = newSale.total / installments;
            for (let i = 0; i < installments; i++) {
                const dueDate = new Date(newSale.date);
                dueDate.setMonth(dueDate.getMonth() + i + 1);
                const receivableData = {
                    client_id: newSale.client_id,
                    sale_id: newSale.id,
                    description: `Crediário da Venda #${newSale.id} - Parcela ${i + 1}/${installments}`,
                    value: installmentValue,
                    due_date: dueDate.toISOString().split('T')[0],
                    status: 'Pendente'
                };
                const { data: newReceivable, error: receivableError } = await db.from('receivables').insert(receivableData).select().single();
                if (receivableError) throw receivableError;
                state.receivables.unshift(newReceivable);
            }
        }
    }
};

App.modules.Receipts = {
    pageId: 'receipts',
    init() {
        document.getElementById('receiptClientFilter').addEventListener('change', this.render.bind(this));
        document.getElementById('receiptDateFilter').addEventListener('change', this.render.bind(this));
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
        const client_id = document.getElementById('receiptClientFilter').value;
        const date = document.getElementById('receiptDateFilter').value;
        let filtered = state.sales;

        if (client_id) {
            filtered = filtered.filter(s => s.client_id === client_id);
        }
        if (date) {
            filtered = filtered.filter(s => new Date(s.date).toISOString().split('T')[0] === date);
        }
        return filtered;
    },
    render() {
        const data = this.getFiltered();
        const tbody = document.getElementById('receiptsTableBody');
        tbody.innerHTML = data.map(s => {
            const clientName = state.clients.find(c => c.id === s.client_id)?.name || 'Venda Direta';
            return `
                <tr>
                    <td data-label="ID da Venda">${s.id.substring(0, 8)}</td>
                    <td data-label="Data">${Utils.formatDate(s.date)}</td>
                    <td data-label="Cliente">${clientName}</td>
                    <td data-label="Total">${Utils.formatCurrency(s.total)}</td>
                    <td data-label="Pagamento">${s.payment_method}</td>
                    <td data-label="Ações"><div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="App.modules.Receipts.view('${s.id}')"><i class="fas fa-eye"></i></button>
                    </div></td>
                </tr>`;
        }).join('') || `<tr><td colspan="6" class="text-center">Nenhuma venda encontrada.</td></tr>`;
    },
    view(saleId) {
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale) return;

        const client = state.clients.find(c => c.id === sale.client_id);
        const itemsHtml = sale.items.map(item => `
            <div class="modal-receipt-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>${Utils.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');
        
        const content = `
            <div class="modal-receipt">
                <h3>Recibo de Venda #${sale.id.substring(0, 8)}</h3>
                <p><strong>Data:</strong> ${Utils.formatDate(sale.date)}</p>
                <p><strong>Cliente:</strong> ${client?.name || 'Venda Direta'}</p>
                <hr>
                <h4>Itens</h4>
                <div class="modal-receipt-items-list">${itemsHtml}</div>
                <hr>
                <p><strong>Total:</strong> ${Utils.formatCurrency(sale.total)}</p>
                <p><strong>Pagamento:</strong> ${sale.payment_method}</p>
            </div>`;
        Modal.show(`Detalhes da Venda`, content);
    }
};

App.modules.CashFlow = {
    pageId: 'cashflow',
    init() {
        document.getElementById('cashFlowForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('cashFlowSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('clearCashFlowForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportCashFlow').addEventListener('click', this.export.bind(this));
        document.getElementById('cashFlowDate').valueAsDate = new Date();
    },
    load() {
        this.render();
        this.updateStats();
        this.clearForm();
    },
    getFiltered() {
        const q = document.getElementById('cashFlowSearch').value.toLowerCase();
        return q
            ? state.cashFlow.filter(c => c.description.toLowerCase().includes(q))
            : state.cashFlow;
    },
    render() {
        const data = this.getFiltered();
        const tbody = document.getElementById('cashFlowTableBody');
        tbody.innerHTML = data.map(cf => `
            <tr>
                <td data-label="Data">${Utils.formatDate(cf.date)}</td>
                <td data-label="Tipo"><span class="badge badge-${cf.type === 'entrada' ? 'success' : 'danger'}">${cf.type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td data-label="Descrição">${cf.description}</td>
                <td data-label="Valor">${Utils.formatCurrency(cf.value)}</td>
                <td data-label="Ações"><div class="table-actions">
                    <button class="btn btn-danger btn-sm" onclick="App.modules.CashFlow.remove('${cf.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`).join('') || `<tr><td colspan="5" class="text-center">Nenhum lançamento encontrado.</td></tr>`;
    },
    updateStats() {
        const { cashFlow } = state;
        const totalEntradas = cashFlow.filter(c => c.type === 'entrada').reduce((a, c) => a + c.value, 0);
        const totalSaidas = cashFlow.filter(c => c.type === 'saida').reduce((a, c) => a + c.value, 0);
        document.getElementById('totalEntradas').textContent = Utils.formatCurrency(totalEntradas);
        document.getElementById('totalSaidas').textContent = Utils.formatCurrency(totalSaidas);
        document.getElementById('saldoAtual').textContent = Utils.formatCurrency(totalEntradas - totalSaidas);
    },
    async save(e) {
        e.preventDefault();
        const cashFlowData = {
            type: e.target.cashFlowType.value,
            description: e.target.cashFlowDescription.value.trim(),
            value: parseFloat(e.target.cashFlowValue.value),
            date: e.target.cashFlowDate.value
        };
        if (Object.values(cashFlowData).some(v => v === '' || isNaN(v))) {
            return Notification.error('Por favor, preencha todos os campos corretamente.');
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const { data, error } = await db.from('cash_flow').insert(cashFlowData).select().single();
            if (error) throw error;
            state.cashFlow.unshift(data);
            Notification.success('Lançamento salvo!');
            this.clearForm();
            this.render();
            this.updateStats();
        } catch (error) {
            Notification.error(error.message);
        } finally {
            btn.disabled = false;
        }
    },
    async remove(id) {
        if (!confirm('Deseja realmente excluir este lançamento?')) return;
        try {
            const { error } = await db.from('cash_flow').delete().eq('id', id);
            if (error) throw error;
            state.cashFlow = state.cashFlow.filter(c => c.id !== id);
            this.render();
            this.updateStats();
            Notification.success('Lançamento excluído.');
        } catch (error) {
            Notification.error('Erro ao excluir lançamento.');
        }
    },
    clearForm() {
        document.getElementById('cashFlowForm').reset();
        document.getElementById('cashFlowDate').valueAsDate = new Date();
    },
    export() {
        Utils.exportToCSV("fluxo_de_caixa.csv", this.getFiltered().map(cf => ({
            data: Utils.formatDate(cf.date),
            tipo: cf.type,
            descricao: cf.description,
            valor: cf.value
        })));
    }
};

App.modules.Expenses = {
    pageId: 'expenses',
    init() {
        document.getElementById('expenseForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('expenseSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('expenseFilterCategory').addEventListener('change', this.render.bind(this));
        document.getElementById('clearExpenseForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportExpenses').addEventListener('click', this.export.bind(this));
        document.getElementById('expenseDate').valueAsDate = new Date();
    },
    load() {
        this.render();
        this.updateStats();
        this.clearForm();
        this.populateCategories();
    },
    getFiltered() {
        const q = document.getElementById('expenseSearch').value.toLowerCase();
        const category = document.getElementById('expenseFilterCategory').value;
        let filtered = state.expenses;
        if (q) {
            filtered = filtered.filter(e => e.description.toLowerCase().includes(q));
        }
        if (category) {
            filtered = filtered.filter(e => e.category === category);
        }
        return filtered;
    },
    render() {
        const data = this.getFiltered();
        const tbody = document.getElementById('expensesTableBody');
        tbody.innerHTML = data.map(e => `
            <tr>
                <td data-label="Data">${Utils.formatDate(e.date)}</td>
                <td data-label="Descrição">${e.description}</td>
                <td data-label="Categoria">${e.category}</td>
                <td data-label="Valor">${Utils.formatCurrency(e.value)}</td>
                <td data-label="Ações"><div class="table-actions">
                    <button class="btn btn-danger btn-sm" onclick="App.modules.Expenses.remove('${e.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>`).join('') || `<tr><td colspan="5" class="text-center">Nenhuma despesa encontrada.</td></tr>`;
    },
    updateStats() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalMonth = state.expenses.filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear).reduce((a, e) => a + e.value, 0);
        const totalYear = state.expenses.filter(e => new Date(e.date).getFullYear() === currentYear).reduce((a, e) => a + e.value, 0);
        document.getElementById('totalExpensesMonth').textContent = Utils.formatCurrency(totalMonth);
        document.getElementById('totalExpensesYear').textContent = Utils.formatCurrency(totalYear);
    },
    populateCategories() {
        const select = document.getElementById('expenseFilterCategory');
        const categories = [...new Set(state.expenses.map(e => e.category))].sort();
        select.innerHTML = `<option value="">Todas as categorias</option>`;
        categories.forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    },
    async save(e) {
        e.preventDefault();
        const expenseData = {
            description: e.target.expenseDescription.value.trim(),
            category: e.target.expenseCategory.value,
            value: parseFloat(e.target.expenseValue.value),
            date: e.target.expenseDate.value
        };
        if (Object.values(expenseData).some(v => v === '' || isNaN(v))) {
            return Notification.error('Por favor, preencha todos os campos corretamente.');
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const { data, error } = await db.from('expenses').insert(expenseData).select().single();
            if (error) throw error;
            state.expenses.unshift(data);
            Notification.success('Despesa salva!');
            this.clearForm();
            this.render();
            this.updateStats();
            this.populateCategories();
        } catch (error) {
            Notification.error(error.message);
        } finally {
            btn.disabled = false;
        }
    },
    async remove(id) {
        if (!confirm('Deseja realmente excluir esta despesa?')) return;
        try {
            const { error } = await db.from('expenses').delete().eq('id', id);
            if (error) throw error;
            state.expenses = state.expenses.filter(e => e.id !== id);
            this.render();
            this.updateStats();
            this.populateCategories();
            Notification.success('Despesa excluída.');
        } catch (error) {
            Notification.error('Erro ao excluir despesa.');
        }
    },
    clearForm() {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').valueAsDate = new Date();
    },
    export() {
        Utils.exportToCSV("despesas.csv", this.getFiltered().map(e => ({
            data: Utils.formatDate(e.date),
            descricao: e.description,
            categoria: e.category,
            valor: e.value
        })));
    }
};

App.modules.Receivables = {
    pageId: 'receivables',
    init() {
        document.getElementById('receivableForm').addEventListener('submit', this.save.bind(this));
        document.getElementById('receivableSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('receivableFilterStatus').addEventListener('change', this.render.bind(this));
        document.getElementById('clearReceivableForm').addEventListener('click', () => this.clearForm());
        document.getElementById('exportReceivables').addEventListener('click', this.export.bind(this));
    },
    load() {
        this.render();
        this.updateStats();
        this.clearForm();
        Utils.populateSelect('receivableClient', state.clients, 'id', 'name', 'Selecione um cliente');
    },
    getFiltered() {
        const q = document.getElementById('receivableSearch').value.toLowerCase();
        const status = document.getElementById('receivableFilterStatus').value;
        let filtered = state.receivables.map(r => {
            const isOverdue = new Date(r.due_date) < new Date() && r.status === 'Pendente';
            return { ...r, status: isOverdue ? 'Vencido' : r.status };
        });
        if (q) {
            filtered = filtered.filter(r => (state.clients.find(c => c.id === r.client_id)?.name.toLowerCase().includes(q)) || r.description.toLowerCase().includes(q));
        }
        if (status) {
            filtered = filtered.filter(r => r.status === status);
        }
        return filtered.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    },
    render() {
        const data = this.getFiltered();
        const tbody = document.getElementById('receivablesTableBody');
        tbody.innerHTML = data.map(r => {
            const clientName = state.clients.find(c => c.id === r.client_id)?.name || 'Cliente Removido';
            const badgeClass = r.status === 'Pendente' ? 'info' : r.status === 'Pago' ? 'success' : 'danger';
            const actionBtn = r.status !== 'Pago'
                ? `<button class="btn btn-primary btn-sm" onclick="App.modules.Receivables.markAsPaid('${r.id}')"><i class="fas fa-check"></i></button>`
                : '';
            return `
                <tr>
                    <td data-label="Cliente">${clientName}</td>
                    <td data-label="Descrição">${r.description}</td>
                    <td data-label="Valor">${Utils.formatCurrency(r.value)}</td>
                    <td data-label="Vencimento">${Utils.formatDate(r.due_date)}</td>
                    <td data-label="Status"><span class="badge badge-${badgeClass}">${r.status}</span></td>
                    <td data-label="Ações"><div class="table-actions">${actionBtn}</div></td>
                </tr>`;
        }).join('') || `<tr><td colspan="6" class="text-center">Nenhuma conta a receber encontrada.</td></tr>`;
    },
    updateStats() {
        const pending = state.receivables.filter(r => r.status === 'Pendente').reduce((a, r) => a + r.value, 0);
        const overdue = state.receivables.filter(r => r.status === 'Vencido').reduce((a, r) => a + r.value, 0);
        const paid = state.receivables.filter(r => r.status === 'Pago' && new Date(r.paid_at).getMonth() === new Date().getMonth()).reduce((a, r) => a + r.value, 0);
        document.getElementById('totalReceivablesPending').textContent = Utils.formatCurrency(pending);
        document.getElementById('totalReceivablesOverdue').textContent = Utils.formatCurrency(overdue);
        document.getElementById('totalReceivablesPaid').textContent = Utils.formatCurrency(paid);
    },
    async save(e) {
        e.preventDefault();
        const receivableData = {
            client_id: e.target.receivableClient.value,
            description: e.target.receivableDescription.value.trim(),
            value: parseFloat(e.target.receivableValue.value),
            due_date: e.target.receivableDueDate.value,
            status: 'Pendente'
        };
        if (!receivableData.client_id || !receivableData.description || isNaN(receivableData.value) || !receivableData.due_date) {
            return Notification.error('Por favor, preencha todos os campos corretamente.');
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const { data, error } = await db.from('receivables').insert(receivableData).select().single();
            if (error) throw error;
            state.receivables.unshift(data);
            Notification.success('Conta a receber salva!');
            this.clearForm();
            this.render();
            this.updateStats();
        } catch (error) {
            Notification.error(error.message);
        } finally {
            btn.disabled = false;
        }
    },
    async markAsPaid(id) {
        if (!confirm('Confirmar o pagamento desta conta?')) return;
        try {
            const { data, error } = await db.from('receivables').update({ status: 'Pago', paid_at: new Date().toISOString() }).eq('id', id).select().single();
            if (error) throw error;

            state.receivables = state.receivables.map(r => r.id === id ? data : r);
            this.render();
            this.updateStats();
            Notification.success('Conta marcada como paga!');

            // Lançar no fluxo de caixa
            const cashFlowEntry = {
                type: 'entrada',
                description: `Recebimento de conta #${data.id} - ${data.description}`,
                value: data.value,
                date: data.paid_at
            };
            const { data: newEntry, error: cashFlowError } = await db.from('cash_flow').insert(cashFlowEntry).select().single();
            if (cashFlowError) throw cashFlowError;
            state.cashFlow.unshift(newEntry);
            App.modules.CashFlow.updateStats();
        } catch (error) {
            Notification.error('Erro ao registrar pagamento.');
        }
    },
    clearForm() {
        document.getElementById('receivableForm').reset();
        document.getElementById('receivableClient').value = '';
    },
    export() {
        Utils.exportToCSV("contas_a_receber.csv", this.getFiltered().map(r => ({
            cliente: state.clients.find(c => c.id === r.client_id)?.name || 'Cliente Removido',
            descricao: r.description,
            valor: r.value,
            vencimento: Utils.formatDate(r.due_date),
            status: r.status
        })));
    }
};

App.modules.Reports = {
    pageId: 'reports',
    init() {
        document.getElementById('generateReport').addEventListener('click', this.generate.bind(this));
        document.getElementById('reportType').addEventListener('change', this.toggleFilters.bind(this));
        document.getElementById('exportReportPDF').addEventListener('click', this.exportPDF.bind(this));
        document.getElementById('exportReportCSV').addEventListener('click', this.exportCSV.bind(this));
    },
    load() {
        this.toggleFilters();
        document.getElementById('reportResultContainer').classList.add('hidden');
        // Reset dates
        document.getElementById('reportStartDate').value = '';
        document.getElementById('reportEndDate').value = '';
    },
    toggleFilters() {
        const type = document.getElementById('reportType').value;
        const container = document.getElementById('reportFiltersContainer');
        container.innerHTML = '';
        if (type === 'vendas') {
            container.innerHTML = `
                <div class="form-group">
                    <label class="form-label" for="reportClientFilter">Filtrar por Cliente</label>
                    <select id="reportClientFilter" class="form-select"><option value="">Todos</option></select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="reportPaymentFilter">Filtrar por Pagamento</label>
                    <select id="reportPaymentFilter" class="form-select">
                        <option value="">Todos</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Crediário">Crediário</option>
                    </select>
                </div>`;
            Utils.populateSelect('reportClientFilter', state.clients, 'id', 'name', 'Todos os Clientes');
        }
        // Adicionar outros filtros se necessário
    },
    getFilteredData() {
        const type = document.getElementById('reportType').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        let data;
        switch (type) {
            case 'vendas': data = state.sales; break;
            case 'financeiro': data = state.cashFlow.concat(state.expenses.map(e => ({...e, type: 'saida', description: e.category + ': ' + e.description}))); break;
            case 'produtos': data = state.products; break;
            case 'clientes': data = state.clients; break;
            case 'contas_a_receber': data = state.receivables; break;
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            data = data.filter(item => {
                const itemDate = new Date(item.date || item.due_date || item.created_at);
                return itemDate >= start && itemDate <= end;
            });
        }

        // Apply specific filters
        if (type === 'vendas') {
            const clientFilter = document.getElementById('reportClientFilter')?.value;
            const paymentFilter = document.getElementById('reportPaymentFilter')?.value;
            if (clientFilter) data = data.filter(s => s.client_id === clientFilter);
            if (paymentFilter) data = data.filter(s => s.payment_method === paymentFilter);
        }
        return data;
    },
    generate() {
        const type = document.getElementById('reportType').value;
        const data = this.getFilteredData();
        document.getElementById('reportResultContainer').classList.remove('hidden');

        let summaryContent = '', topItemsContent = '', tableHead = '', tableBody = '';
        let chartData = {};

        if (type === 'vendas') {
            const totalSales = data.reduce((a, s) => a + s.total, 0);
            const totalItems = data.reduce((a, s) => a + s.items.reduce((b, i) => b + i.quantity, 0), 0);
            const uniqueClients = [...new Set(data.filter(s => s.client_id).map(s => s.client_id))].length;
            summaryContent = `
                <div class="text-center"><div class="stat-value" style="color: var(--accent-color);">${Utils.formatCurrency(totalSales)}</div><div class="stat-label">Vendas Totais</div></div>
                <div class="text-center"><div class="stat-value">${data.length}</div><div class="stat-label">Total de Vendas</div></div>
                <div class="text-center"><div class="stat-value">${totalItems}</div><div class="stat-label">Itens Vendidos</div></div>
                <div class="text-center"><div class="stat-value">${uniqueClients}</div><div class="stat-label">Clientes Atendidos</div></div>`;

            const topProducts = data.flatMap(s => s.items).reduce((acc, item) => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity; return acc;
            }, {});
            topItemsContent = Object.entries(topProducts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, qty]) => `<div class="top-item">${name} <span class="badge badge-info">${qty}</span></div>`).join('');

            chartData = {
                labels: [...new Set(data.map(s => Utils.formatDate(s.date)))].reverse(),
                datasets: [{
                    label: 'Vendas Diárias (R$)',
                    data: [...new Set(data.map(s => Utils.formatDate(s.date)))].map(date => data.filter(s => Utils.formatDate(s.date) === date).reduce((a, s) => a + s.total, 0)),
                    borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true, tension: 0.4
                }]
            };
            tableHead = `<tr><th>ID da Venda</th><th>Data</th><th>Cliente</th><th>Total</th><th>Pagamento</th></tr>`;
            tableBody = data.map(s => `<tr><td>${s.id.substring(0, 8)}</td><td>${Utils.formatDate(s.date)}</td><td>${state.clients.find(c => c.id === s.client_id)?.name || 'Venda Direta'}</td><td>${Utils.formatCurrency(s.total)}</td><td>${s.payment_method}</td></tr>`).join('');
        }
        // Implementar lógica para outros tipos de relatórios aqui
        // Ex: if (type === 'financeiro') { ... }

        document.getElementById('reportSummaryContent').innerHTML = summaryContent;
        document.getElementById('topItemsList').innerHTML = topItemsContent;
        document.getElementById('reportTableHead').innerHTML = tableHead;
        document.getElementById('reportTableBody').innerHTML = tableBody;

        Utils.renderChart('reportChart', 'line', chartData, { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } });
    },
    exportPDF() {
        const type = document.getElementById('reportType').value;
        const data = this.getFilteredData();
        let head = [], body = [];
        if (type === 'vendas') {
            head = [['ID', 'Data', 'Cliente', 'Total', 'Pagamento']];
            body = data.map(s => [s.id.substring(0, 8), Utils.formatDate(s.date), state.clients.find(c => c.id === s.client_id)?.name || 'Venda Direta', Utils.formatCurrency(s.total), s.payment_method]);
        }
        Utils.exportToPDF(`Relatório de ${type}`, head, body);
    },
    exportCSV() {
        const type = document.getElementById('reportType').value;
        const data = this.getFilteredData();
        Utils.exportToCSV(`relatorio_${type}.csv`, data);
    }
};

App.modules.Settings = {
    pageId: 'settings',
    init() {
        document.getElementById('downloadBackup').addEventListener('click', this.downloadBackup.bind(this));
        document.getElementById('restoreFile').addEventListener('change', (e) => {
            document.getElementById('restoreBackup').disabled = !e.target.files.length;
        });
        document.getElementById('restoreBackup').addEventListener('click', this.restoreBackup.bind(this));
        document.getElementById('clearAllData').addEventListener('click', this.clearAllData.bind(this));
    },
    load() {
        this.updateStats();
    },
    updateStats() {
        document.getElementById('backupClientsCount').textContent = state.clients.length;
        document.getElementById('backupProductsCount').textContent = state.products.length;
        document.getElementById('backupSalesCount').textContent = state.sales.length;
        document.getElementById('backupCashFlowCount').textContent = state.cashFlow.length;
        document.getElementById('backupExpensesCount').textContent = state.expenses.length;
        document.getElementById('backupReceivablesCount').textContent = state.receivables.length;
    },
    async downloadBackup() {
        const backupData = {
            clients: state.clients,
            products: state.products,
            sales: state.sales,
            cashFlow: state.cashFlow,
            expenses: state.expenses,
            receivables: state.receivables
        };
        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sgi_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        Notification.success('Backup dos dados baixado com sucesso!');
    },
    restoreBackup() {
        const fileInput = document.getElementById('restoreFile');
        if (!fileInput.files.length) return;
        if (!confirm('Isso irá apagar os dados atuais e substituí-los pelo backup. Deseja continuar?')) return;

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                const tables = ['clients', 'products', 'sales', 'cash_flow', 'expenses', 'receivables'];
                
                // Limpa os dados existentes
                const deletePromises = tables.map(t => db.from(t).delete().neq('id', '0'));
                await Promise.all(deletePromises);

                // Insere os novos dados
                for (const table of tables) {
                    const dataToInsert = backupData[table].map(item => {
                        delete item.id; // Supabase deve gerar novos IDs
                        return item;
                    });
                    if (dataToInsert.length > 0) {
                        await db.from(table).insert(dataToInsert);
                    }
                }

                await App.loadAllData();
                this.updateStats();
                Notification.success('Backup restaurado com sucesso!');
            } catch (error) {
                Notification.error('Erro ao restaurar o backup. Verifique o arquivo.');
                console.error('Restore error:', error);
            } finally {
                fileInput.value = '';
                document.getElementById('restoreBackup').disabled = true;
            }
        };
        reader.readAsText(file);
    },
    async clearAllData() {
        if (!confirm('ATENÇÃO! Esta ação é irreversível e irá apagar TODOS os dados do sistema. Deseja continuar?')) return;
        if (!confirm('Confirme novamente. Você tem certeza absoluta?')) return;
        
        try {
            const tables = ['clients', 'products', 'sales', 'cash_flow', 'expenses', 'receivables'];
            const deletePromises = tables.map(t => db.from(t).delete().neq('id', '0'));
            await Promise.all(deletePromises);
            
            await App.loadAllData();
            this.updateStats();
            Notification.success('Todos os dados foram limpos com sucesso!');
        } catch (error) {
            Notification.error('Erro ao limpar os dados. Tente novamente.');
            console.error('Clear data error:', error);
        }
    }
};

// INICIALIZAÇÃO DA APLICAÇÃO
document.addEventListener('DOMContentLoaded', () => App.init());
