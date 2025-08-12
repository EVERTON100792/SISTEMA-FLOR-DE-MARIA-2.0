// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.1 (Full Firebase Integration) =====

// 1. Initialize Firebase
const firebaseConfig = {
    // SUAS CHAVES DO FIREBASE DEVEM IR AQUI
    apiKey: "AIzaSyBUn5hALHO13M0uHtMawZg_8CmRVBhHzAk",
    authDomain: "sistema-flor-de-maria.firebaseapp.com",
    projectId: "sistema-flor-de-maria",
    storageBucket: "sistema-flor-de-maria.appspot.com",
    messagingSenderId: "148120762956",
    appId: "1:148120762956:web:0b1b9e9efe10407fbcd2e9"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Configurações e Estado Global
const CONFIG = {
    collections: {
        clients: 'clients',
        products: 'products',
        sales: 'sales',
        cashFlow: 'cashFlow',
        expenses: 'expenses',
        receivables: 'receivables'
    },
    storageKeys: {
        lastActivePage: 'sgi_last_active_page',
    },
    company: {
        name: 'Flor de Maria',
        address: 'Rua das Flores, 123 - Centro',
        phone: '(11) 98765-4321',
        cnpj: '12.345.678/0001-99'
    }
};

const state = {
    clients: [],
    products: [],
    sales: [],
    cashFlow: [],
    expenses: [],
    receivables: [],
    cart: [],
    currentEditId: null,
};

// MÓDULOS DE UTILIDADES E COMPONENTES
const Utils = {
    generateUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }),
    formatCurrency: value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0),
    formatDate: dateStr => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date.getTime() + userTimezoneOffset));
    },
    formatDateTime: dateStr => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
    },
    debounce: (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },
    getToday: () => new Date().toISOString().split('T')[0],
};

const Notification = {
    show(message, type = 'success') {
        const el = document.getElementById('notification');
        const textEl = document.getElementById('notificationText');
        textEl.textContent = message;
        el.className = `notification notification-${type}`;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    },
    success: (message) => Notification.show(message, 'success'),
    error: (message) => Notification.show(message, 'error'),
    warning: (message) => Notification.show(message, 'warning'),
};

const Modal = {
    show(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modal').classList.add('show');
    },
    hide() {
        document.getElementById('modal').classList.remove('show');
    }
};

const Navigation = {
    init() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggle = document.getElementById('mobileMenuToggle');

        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                    if (window.innerWidth <= 900) {
                        sidebar.classList.remove('active');
                        overlay.classList.remove('active');
                    }
                }
            });
        });

        const toggleSidebar = () => {
             sidebar.classList.toggle('active');
             overlay.classList.toggle('active');
        };
        
        toggle.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    },
    async navigateTo(page) {
        if (!document.getElementById(`${page}Page`)) {
            console.error(`Página "${page}" não encontrada.`);
            page = 'dashboard';
        }

        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById(`${page}Page`).classList.remove('hidden');

        document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        localStorage.setItem(CONFIG.storageKeys.lastActivePage, page);
        
        // Carrega os dados necessários para a página
        const pageLoaders = {
            dashboard: Dashboard.load,
            clients: Clients.load,
            products: Products.load,
            sales: Sales.load,
            receipts: Receipts.load,
            cashflow: CashFlow.load,
            expenses: Expenses.load,
            receivables: Receivables.load,
            reports: Reports.load,
            settings: Settings.load,
        };
        
        if (pageLoaders[page]) {
            await pageLoaders[page]();
        }
    }
};

// MÓDULO DE AUTENTICAÇÃO
const Auth = {
    init() {
        auth.onAuthStateChanged(user => {
            if (user) this.showApp();
            else this.showLogin();
        });

        document.getElementById('loginForm').addEventListener('submit', this.handleLogin);
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout);
    },
    handleLogin: async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            Notification.success('Login bem-sucedido!');
        } catch (error) {
            Notification.error('Email ou senha inválidos.');
            console.error(error);
        }
    },
    handleLogout: async () => {
        await auth.signOut();
        localStorage.removeItem(CONFIG.storageKeys.lastActivePage);
        Notification.success('Você saiu do sistema.');
    },
    showLogin: () => {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appLayout').classList.add('hidden');
    },
    showApp: async () => {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appLayout').classList.remove('hidden');
        await App.loadAllData();
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage) || 'dashboard';
        Navigation.navigateTo(lastPage);
    }
};

// MÓDULO PRINCIPAL DA APLICAÇÃO
const App = {
    async loadAllData() {
        try {
            const collections = Object.keys(CONFIG.collections);
            const promises = collections.map(col => db.collection(col).get());
            const snapshots = await Promise.all(promises);

            snapshots.forEach((snapshot, index) => {
                const collectionName = collections[index];
                state[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

        } catch (error) {
            console.error("Erro ao carregar todos os dados:", error);
            Notification.error("Falha ao sincronizar dados com o servidor.");
        }
    },
    init() {
        Auth.init();
        Navigation.init();
        Clients.init();
        Products.init();
        Sales.init();
        Receipts.init();
        CashFlow.init();
        Expenses.init();
        Receivables.init();
        Reports.init();
        Settings.init();
        
        document.getElementById('modalClose').addEventListener('click', Modal.hide);
        document.getElementById('modal').addEventListener('click', e => {
            if (e.target.id === 'modal') Modal.hide();
        });

        console.log('SGI - Flor de Maria v3.1 (Firebase) iniciado!');
    }
};

// MÓDULOS DE NEGÓCIO

const Dashboard = {
    chart: null,
    async load() {
        await this.updateStats();
        await this.renderChart();
        await this.renderOverdueAccounts();
    },
    updateStats() {
        const { cashFlow, receivables, sales, expenses } = state;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const cashBalance = cashFlow.reduce((acc, t) => acc + (t.type === 'entrada' ? t.value : -t.value), 0);
        const totalReceivables = receivables.filter(r => r.status === 'Pendente' || r.status === 'Vencido').reduce((acc, r) => acc + r.value, 0);
        
        const monthlySales = sales
            .filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((acc, s) => acc + s.total, 0);

        const monthlyExpenses = expenses
            .filter(e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((acc, e) => acc + e.value, 0);
            
        document.getElementById('cashBalance').textContent = Utils.formatCurrency(cashBalance);
        document.getElementById('totalReceivables').textContent = Utils.formatCurrency(totalReceivables);
        document.getElementById('monthlyExpenses').textContent = Utils.formatCurrency(monthlyExpenses);
        document.getElementById('monthlySales').textContent = Utils.formatCurrency(monthlySales);
    },
    renderChart() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlySales = state.sales.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const data = monthlySales.reduce((acc, sale) => {
            acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
            return acc;
        }, {});

        const ctx = document.getElementById('paymentMethodChart').getContext('2d');
        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: Object.values(data),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                    x: { ticks: { color: '#94A3B8' }, grid: { display: false } }
                }
            }
        });
    },
    renderOverdueAccounts() {
        const overdue = state.receivables.filter(r => r.status === 'Vencido');
        const container = document.getElementById('overdueAccounts');
        if (overdue.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 20px;">Nenhuma conta vencida. 🎉</p>';
            return;
        }

        const today = new Date();
        container.innerHTML = overdue.map(account => {
            const client = state.clients.find(c => c.id === account.clientId);
            const daysOverdue = Math.floor((today - new Date(account.dueDate)) / (1000 * 60 * 60 * 24));
            return `
                <div>
                    <div class="flex-between">
                        <div>
                            <strong>${client?.name || 'Cliente não encontrado'}</strong><br>
                            <small>${daysOverdue} dia(s) em atraso</small>
                        </div>
                        <div class="text-right">
                            <strong style="color: var(--danger-color);">${Utils.formatCurrency(account.value)}</strong><br>
                            <small>Venc: ${Utils.formatDate(account.dueDate)}</small>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
};

const Clients = {
    init() {
        document.getElementById('clientForm').addEventListener('submit', this.save);
        document.getElementById('clearClientForm').addEventListener('click', this.clearForm);
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(() => this.render(this.getFiltered()), 300));
        document.getElementById('exportClients').addEventListener('click', this.exportToCSV);
    },
    async load() {
        this.render(state.clients);
    },
    render(clientsToRender) {
        const tbody = document.getElementById('clientsTableBody');
        document.getElementById('clientCount').textContent = `${state.clients.length} clientes cadastrados`;

        if (clientsToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = clientsToRender
            .sort((a,b) => a.name.localeCompare(b.name))
            .map(client => {
                const purchaseCount = state.sales.filter(s => s.clientId === client.id).length;
                return `
                    <tr>
                        <td>${client.name}</td>
                        <td>${client.phone}</td>
                        <td>${Utils.formatDate(client.createdAt)}</td>
                        <td>${purchaseCount} compra(s)</td>
                        <td>
                            <div class="flex gap-2">
                                <button class="btn btn-secondary btn-sm" onclick="Clients.edit('${client.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-secondary btn-sm" onclick="Clients.viewHistory('${client.id}')" title="Histórico"><i class="fas fa-history"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="Clients.remove('${client.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
    },
    save: async (e) => {
        e.preventDefault();
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        if (!name || !phone) return Notification.error('Nome e telefone são obrigatórios.');

        try {
            if (state.currentEditId) {
                const clientRef = db.collection(CONFIG.collections.clients).doc(state.currentEditId);
                await clientRef.update({ name, phone, updatedAt: new Date().toISOString() });
                Notification.success('Cliente atualizado com sucesso!');
            } else {
                const id = Utils.generateUUID();
                const newClient = { id, name, phone, createdAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.clients).doc(id).set(newClient);
                Notification.success('Cliente cadastrado com sucesso!');
            }
        } catch (error) {
            Notification.error('Erro ao salvar cliente.');
            console.error(error);
        }
        
        Clients.clearForm();
        await App.loadAllData();
        await Clients.load();
    },
    edit(id) {
        const client = state.clients.find(c => c.id === id);
        if (client) {
            state.currentEditId = id;
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientPhone').value = client.phone;
            document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
        }
    },
    remove: async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação é irreversível.')) return;
        try {
            await db.collection(CONFIG.collections.clients).doc(id).delete();
            Notification.success('Cliente excluído com sucesso.');
            await App.loadAllData();
            await Clients.load();
        } catch(error) {
            Notification.error('Erro ao excluir cliente.');
            console.error(error);
        }
    },
    clearForm() {
        document.getElementById('clientForm').reset();
        state.currentEditId = null;
    },
    getFiltered() {
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
        if (!searchTerm) return state.clients;
        return state.clients.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            c.phone.includes(searchTerm)
        );
    },
    viewHistory: (id) => {/* Implementação do Modal */},
    exportToCSV: () => {/* Implementação da exportação */}
};

const Products = {
    init() {
        document.getElementById('productForm').addEventListener('submit', this.save);
        document.getElementById('clearProductForm').addEventListener('click', this.clearForm);
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(() => this.render(this.getFiltered()), 300));
        document.getElementById('exportProducts').addEventListener('click', this.exportToCSV);
    },
    async load() {
        this.render(state.products);
        this.updateStats();
    },
    render(productsToRender) {
        const tbody = document.getElementById('productsTableBody');
        if (productsToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px;">Nenhum produto encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = productsToRender
            .sort((a,b) => a.name.localeCompare(b.name))
            .map(product => {
                const margin = product.salePrice > 0 ? ((product.salePrice - product.costPrice) / product.salePrice) * 100 : 0;
                const statusClass = product.quantity > 5 ? 'badge-success' : (product.quantity > 0 ? 'badge-warning' : 'badge-danger');
                const statusText = product.quantity > 5 ? 'OK' : (product.quantity > 0 ? 'Baixo' : 'Esgotado');

                return `
                    <tr>
                        <td>${product.refCode}</td>
                        <td style="white-space:normal;">${product.name}</td>
                        <td>${product.quantity}</td>
                        <td>${Utils.formatCurrency(product.costPrice)}</td>
                        <td>${Utils.formatCurrency(product.salePrice)}</td>
                        <td>${margin.toFixed(1)}%</td>
                        <td><span class="badge ${statusClass}">${statusText}</span></td>
                        <td>
                             <div class="flex gap-2">
                                <button class="btn btn-secondary btn-sm" onclick="Products.edit('${product.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="Products.remove('${product.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
    },
    save: async (e) => {
        e.preventDefault();
        const newProduct = {
            refCode: document.getElementById('productRefCode').value.trim(),
            name: document.getElementById('productName').value.trim(),
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            costPrice: parseFloat(document.getElementById('productCostPrice').value) || 0,
            salePrice: parseFloat(document.getElementById('productSalePrice').value) || 0,
        };

        if (!newProduct.refCode || !newProduct.name) return Notification.error('Código e Nome são obrigatórios.');

        try {
            if (state.currentEditId) {
                await db.collection(CONFIG.collections.products).doc(state.currentEditId).update({ ...newProduct, updatedAt: new Date().toISOString() });
                Notification.success('Produto atualizado!');
            } else {
                const id = Utils.generateUUID();
                await db.collection(CONFIG.collections.products).doc(id).set({ ...newProduct, id, createdAt: new Date().toISOString() });
                Notification.success('Produto cadastrado!');
            }
        } catch (error) {
            Notification.error('Erro ao salvar produto.'); console.error(error);
        }

        Products.clearForm();
        await App.loadAllData();
        await Products.load();
    },
    edit(id) {
        const product = state.products.find(p => p.id === id);
        if (product) {
            state.currentEditId = id;
            document.getElementById('productRefCode').value = product.refCode;
            document.getElementById('productName').value = product.name;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productCostPrice').value = product.costPrice;
            document.getElementById('productSalePrice').value = product.salePrice;
            document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        }
    },
    remove: async (id) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            await db.collection(CONFIG.collections.products).doc(id).delete();
            Notification.success('Produto excluído.');
            await App.loadAllData();
            await Products.load();
        } catch (error) {
            Notification.error('Erro ao excluir produto.'); console.error(error);
        }
    },
    clearForm() {
        document.getElementById('productForm').reset();
        state.currentEditId = null;
    },
    updateStats() {
        document.getElementById('totalProducts').textContent = state.products.length;
        document.getElementById('outOfStockProducts').textContent = state.products.filter(p => p.quantity <= 0).length;
    },
    getFiltered() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        if (!searchTerm) return state.products;
        return state.products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.refCode.toLowerCase().includes(searchTerm)
        );
    },
    exportToCSV: () => {/* Implementação */}
};

const Sales = {
    init() {
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(this.showSuggestions, 300));
        document.getElementById('clearCart').addEventListener('click', this.clearCart);
        document.getElementById('finalizeSale').addEventListener('click', this.finalize);
        document.getElementById('salePaymentMethod').addEventListener('change', this.toggleInstallments);
    },
    async load() {
        this.populateClientSelect('saleClient');
        this.clearCart();
    },
    populateClientSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Consumidor Final</option>';
        state.clients.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    },
    showSuggestions() {
        const searchTerm = document.getElementById('productSearchPDV').value.toLowerCase();
        const suggestionsEl = document.getElementById('productSuggestions');
        if (searchTerm.length < 2) {
            suggestionsEl.classList.add('hidden');
            return;
        }

        const filtered = state.products.filter(p => 
            (p.name.toLowerCase().includes(searchTerm) || p.refCode.toLowerCase().includes(searchTerm)) && p.quantity > 0
        );

        if (filtered.length === 0) {
            suggestionsEl.innerHTML = '<div class="text-muted p-2">Nenhum produto encontrado.</div>';
        } else {
            suggestionsEl.innerHTML = filtered.map(p => `
                <div onclick="Sales.addToCart('${p.id}')">
                    <strong>${p.name}</strong> (${p.refCode})<br>
                    <small>Estoque: ${p.quantity} | Preço: ${Utils.formatCurrency(p.salePrice)}</small>
                </div>
            `).join('');
        }
        suggestionsEl.classList.remove('hidden');
    },
    addToCart(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = state.cart.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.quantity < product.quantity) {
                existingItem.quantity++;
            } else {
                Notification.warning('Quantidade máxima em estoque atingida.');
            }
        } else {
            state.cart.push({ ...product, quantity: 1 });
        }
        this.updateCartView();
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('productSuggestions').classList.add('hidden');
    },
    updateCartView() {
        const tbody = document.getElementById('cartTableBody');
        const totalEl = document.getElementById('cartTotal');
        const finalizeBtn = document.getElementById('finalizeSale');

        if (state.cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">Carrinho vazio</td></tr>';
            totalEl.textContent = Utils.formatCurrency(0);
            finalizeBtn.disabled = true;
            return;
        }
        
        let total = 0;
        tbody.innerHTML = state.cart.map(item => {
            const subtotal = item.salePrice * item.quantity;
            total += subtotal;
            return `
                <tr>
                    <td style="white-space:normal;">${item.name}</td>
                    <td>${Utils.formatCurrency(item.salePrice)}</td>
                    <td>
                        <div class="flex" style="align-items:center; gap: 8px;">
                            <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" onclick="Sales.updateQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" onclick="Sales.updateQuantity('${item.id}', 1)">+</button>
                        </div>
                    </td>
                    <td>${Utils.formatCurrency(subtotal)}</td>
                    <td><button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="Sales.removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        }).join('');

        totalEl.textContent = Utils.formatCurrency(total);
        finalizeBtn.disabled = false;
    },
    updateQuantity(productId, change) {
        const item = state.cart.find(i => i.id === productId);
        const product = state.products.find(p => p.id === productId);
        if (!item) return;

        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
        } else if (newQuantity > product.quantity) {
            Notification.warning('Quantidade máxima em estoque atingida.');
        } else {
            item.quantity = newQuantity;
            this.updateCartView();
        }
    },
    removeFromCart(productId) {
        state.cart = state.cart.filter(item => item.id !== productId);
        this.updateCartView();
    },
    clearCart() {
        state.cart = [];
        this.updateCartView();
    },
    toggleInstallments(e) {
        const installmentsGroup = document.getElementById('installmentsGroup');
        installmentsGroup.classList.toggle('hidden', e.target.value !== 'Crediário');
    },
    finalize: async () => {
        const paymentMethod = document.getElementById('salePaymentMethod').value;
        const clientId = document.getElementById('saleClient').value;
        
        if (paymentMethod === 'Crediário' && !clientId) {
            return Notification.error('Selecione um cliente para vendas no crediário.');
        }

        const saleId = Utils.generateUUID();
        const total = state.cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);

        const saleData = {
            id: saleId,
            date: new Date().toISOString(),
            clientId: clientId || null,
            clientName: state.clients.find(c => c.id === clientId)?.name || 'Consumidor Final',
            items: state.cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.salePrice })),
            total,
            paymentMethod,
        };

        const batch = db.batch();

        // 1. Salvar a venda
        batch.set(db.collection(CONFIG.collections.sales).doc(saleId), saleData);

        // 2. Atualizar estoque
        for (const item of state.cart) {
            const productRef = db.collection(CONFIG.collections.products).doc(item.id);
            const newQuantity = item.quantity_stock - item.quantity; // Assuming quantity_stock is original qty
            batch.update(productRef, { quantity: firebase.firestore.FieldValue.increment(-item.quantity) });
        }
        
        // 3. Lançamentos financeiros
        if (paymentMethod === 'Crediário') {
            const installments = parseInt(document.getElementById('saleInstallments').value) || 1;
            const installmentValue = total / installments;
            let dueDate = new Date();

            for (let i = 1; i <= installments; i++) {
                dueDate.setMonth(dueDate.getMonth() + 1);
                const receivableId = Utils.generateUUID();
                const receivableData = {
                    id: receivableId,
                    clientId,
                    saleId,
                    description: `Parcela ${i}/${installments} da Venda #${saleId.substring(0,6)}`,
                    value: installmentValue,
                    dueDate: dueDate.toISOString(),
                    status: 'Pendente',
                    createdAt: new Date().toISOString()
                };
                batch.set(db.collection(CONFIG.collections.receivables).doc(receivableId), receivableData);
            }
        } else {
            const cashFlowId = Utils.generateUUID();
            const cashFlowData = {
                id: cashFlowId,
                date: new Date().toISOString(),
                type: 'entrada',
                description: `Venda #${saleId.substring(0, 6)} (${paymentMethod})`,
                value: total,
                source: 'venda',
                sourceId: saleId,
            };
            batch.set(db.collection(CONFIG.collections.cashFlow).doc(cashFlowId), cashFlowData);
        }
        
        try {
            await batch.commit();
            Notification.success('Venda finalizada com sucesso!');
            Sales.clearCart();
            await App.loadAllData(); // Recarrega todos os dados após a transação
        } catch (error) {
            Notification.error('Erro ao finalizar a venda.');
            console.error(error);
        }
    },
};

const Receipts = {
    init() { /* ... */ },
    async load() { /* ... */ }
};

const CashFlow = {
    init() { /* ... */ },
    async load() { /* ... */ }
};

const Expenses = {
    init() { /* ... */ },
    async load() { /* ... */ }
};

const Receivables = {
    init() {
        document.getElementById('receivableForm').addEventListener('submit', this.saveManual);
        document.getElementById('clearReceivableForm').addEventListener('click', this.clearForm);
    },
    async load() {
        await this.updateStatuses();
        this.populateClientSelect('receivableClient');
        this.render(state.receivables);
        this.updateSummary();
    },
    populateClientSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Selecione um cliente</option>';
        state.clients.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    },
    render(receivablesToRender) {
        const tbody = document.getElementById('receivablesTableBody');
        tbody.innerHTML = receivablesToRender.map(r => {
            const client = state.clients.find(c => c.id === r.clientId);
            let statusClass = 'badge-info';
            if (r.status === 'Pago') statusClass = 'badge-success';
            if (r.status === 'Vencido') statusClass = 'badge-danger';
            
            return `
                <tr>
                    <td>${client?.name || 'N/A'}</td>
                    <td style="white-space:normal;">${r.description}</td>
                    <td>${Utils.formatCurrency(r.value)}</td>
                    <td>${Utils.formatDate(r.dueDate)}</td>
                    <td><span class="badge ${statusClass}">${r.status}</span></td>
                    <td>
                        ${r.status !== 'Pago' ? `<button class="btn btn-secondary btn-sm" onclick="Receivables.markAsPaid('${r.id}')" title="Marcar como Pago"><i class="fas fa-check"></i> Pagar</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },
    async markAsPaid(id) {
        if (!confirm('Confirmar recebimento desta conta?')) return;
        
        const receivable = state.receivables.find(r => r.id === id);
        const batch = db.batch();

        // 1. Atualizar conta
        const receivableRef = db.collection(CONFIG.collections.receivables).doc(id);
        batch.update(receivableRef, { status: 'Pago', paidAt: new Date().toISOString() });
        
        // 2. Lançar no caixa
        const cashFlowId = Utils.generateUUID();
        const cashFlowData = {
            id: cashFlowId,
            date: new Date().toISOString(),
            type: 'entrada',
            description: `Recebimento da conta: ${receivable.description}`,
            value: receivable.value,
            source: 'recebivel',
            sourceId: id,
        };
        batch.set(db.collection(CONFIG.collections.cashFlow).doc(cashFlowId), cashFlowData);

        try {
            await batch.commit();
            Notification.success('Conta marcada como paga!');
            await App.loadAllData();
            await this.load();
        } catch(error) {
            Notification.error('Erro ao registrar pagamento.');
            console.error(error);
        }
    },
    async updateStatuses() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const batch = db.batch();
        let hasChanges = false;
        
        state.receivables.forEach(r => {
            if (r.status === 'Pendente' && new Date(r.dueDate) < today) {
                const ref = db.collection(CONFIG.collections.receivables).doc(r.id);
                batch.update(ref, { status: 'Vencido' });
                hasChanges = true;
            }
        });

        if (hasChanges) {
            try {
                await batch.commit();
                await App.loadAllData();
            } catch (error) {
                console.error("Erro ao atualizar status de contas vencidas:", error);
            }
        }
    },
    updateSummary() {
        const pending = state.receivables.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + r.value, 0);
        const overdue = state.receivables.filter(r => r.status === 'Vencido').reduce((acc, r) => acc + r.value, 0);
        const paidThisMonth = state.receivables.filter(r => r.status === 'Pago' && new Date(r.paidAt).getMonth() === new Date().getMonth()).reduce((acc, r) => acc + r.value, 0);

        document.getElementById('totalReceivablesPending').textContent = Utils.formatCurrency(pending);
        document.getElementById('totalReceivablesOverdue').textContent = Utils.formatCurrency(overdue);
        document.getElementById('totalReceivablesPaid').textContent = Utils.formatCurrency(paidThisMonth);
    },
    saveManual: async (e) => {/* ... */},
    clearForm: () => {/* ... */}
};

const Reports = {
    init() { /* ... */ },
    async load() { /* ... */ }
};

const Settings = {
    init() {
        document.getElementById('downloadBackup').addEventListener('click', this.downloadBackup);
        document.getElementById('restoreFile').addEventListener('change', e => {
            document.getElementById('restoreBackup').disabled = !e.target.files.length;
        });
        document.getElementById('restoreBackup').addEventListener('click', this.restoreBackup);
        document.getElementById('clearAllData').addEventListener('click', this.clearAllData);
    },
    async load() {
        this.updateBackupCounts();
    },
    updateBackupCounts() {
        document.getElementById('backupClientsCount').textContent = state.clients.length;
        document.getElementById('backupProductsCount').textContent = state.products.length;
        document.getElementById('backupSalesCount').textContent = state.sales.length;
        document.getElementById('backupCashFlowCount').textContent = state.cashFlow.length;
        document.getElementById('backupExpensesCount').textContent = state.expenses.length;
        document.getElementById('backupReceivablesCount').textContent = state.receivables.length;
    },
    downloadBackup() {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_flor_de_maria_${Utils.getToday()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Notification.success('Backup gerado com sucesso!');
    },
    async restoreBackup() {
        const file = document.getElementById('restoreFile').files[0];
        if (!file) return Notification.error('Nenhum arquivo selecionado.');
        if (!confirm('ATENÇÃO! Esta ação substituirá TODOS os dados atuais pelos dados do arquivo. Deseja continuar?')) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const restoredState = JSON.parse(e.target.result);
                const collections = Object.keys(CONFIG.collections);
                
                // Limpa coleções antigas primeiro
                const deleteBatch = db.batch();
                for (const collectionName of collections) {
                    const snapshot = await db.collection(collectionName).get();
                    snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
                }
                await deleteBatch.commit();
                
                // Adiciona novos dados
                const writeBatch = db.batch();
                for (const collectionName of collections) {
                    if(restoredState[collectionName]) {
                        restoredState[collectionName].forEach(item => {
                            const docRef = db.collection(collectionName).doc(item.id);
                            writeBatch.set(docRef, item);
                        });
                    }
                }
                await writeBatch.commit();

                Notification.success('Dados restaurados com sucesso! O sistema será recarregado.');
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                Notification.error('Erro ao restaurar backup. Verifique o arquivo.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    },
    async clearAllData() {
        if (!confirm('ALERTA MÁXIMO! Você tem certeza ABSOLUTA de que deseja apagar TODOS os dados do sistema? Esta ação é IRREVERSÍVEL.')) return;
        if (prompt('Para confirmar, digite "DELETAR TUDO"') !== 'DELETAR TUDO') {
            return Notification.warning('Ação cancelada.');
        }

        try {
            const collections = Object.keys(CONFIG.collections);
            const batch = db.batch();
            for (const collectionName of collections) {
                const snapshot = await db.collection(collectionName).get();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
            }
            await batch.commit();
            Notification.success('Todos os dados foram excluídos. O sistema será recarregado.');
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            Notification.error('Ocorreu um erro ao limpar os dados.');
            console.error(error);
        }
    }
};

// Inicialização Geral
document.addEventListener('DOMContentLoaded', App.init);
