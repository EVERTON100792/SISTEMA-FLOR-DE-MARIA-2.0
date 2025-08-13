// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.5 (Correções e Melhorias) =====

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

        console.log('SGI - Flor de Maria v3.5 (Firebase) iniciado!');
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
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">Nenhuma conta vencida. 🎉</p>';
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

// ==================================================================
// ===== INÍCIO DA SEÇÃO CORRIGIDA - CLIENTES =====
// ==================================================================
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
                        <td data-label="Nome">${client.name}</td>
                        <td data-label="Telefone">${client.phone}</td>
                        <td data-label="Cadastro">${Utils.formatDate(client.createdAt)}</td>
                        <td data-label="Compras">${purchaseCount} compra(s)</td>
                        <td data-label="Ações">
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
                // --- LÓGICA DE EDIÇÃO ---
                const clientRef = db.collection(CONFIG.collections.clients).doc(state.currentEditId);
                const updatedData = { name, phone, updatedAt: new Date().toISOString() };
                await clientRef.update(updatedData);
                
                // Atualiza o cliente no array local 'state'
                const clientIndex = state.clients.findIndex(c => c.id === state.currentEditId);
                if (clientIndex > -1) {
                    state.clients[clientIndex] = { ...state.clients[clientIndex], ...updatedData };
                }
                Notification.success('Cliente atualizado com sucesso!');

            } else {
                // --- LÓGICA DE CRIAÇÃO ---
                const id = Utils.generateUUID();
                const newClient = { id, name, phone, createdAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.clients).doc(id).set(newClient);

                // Adiciona o novo cliente ao array local 'state'
                state.clients.push(newClient);
                Notification.success('Cliente cadastrado com sucesso!');
            }

            // Limpa o formulário e renderiza novamente todos os componentes que usam a lista de clientes
            Clients.clearForm();
            Clients.render(state.clients); // Renderiza a tabela na página de Clientes
            
            // **IMPORTANTE**: Atualiza os dropdowns de clientes nas outras páginas
            Sales.populateClientSelect('saleClient');
            Receipts.populateClientSelect('receiptClientFilter');
            Receivables.populateClientSelect('receivableClient');

        } catch (error) {
            Notification.error('Erro ao salvar cliente.');
            console.error(error);
        }
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

            // Remove o cliente do array local 'state'
            state.clients = state.clients.filter(c => c.id !== id);

            // Renderiza novamente todos os componentes que usam a lista de clientes
            Clients.render(state.clients);
            Sales.populateClientSelect('saleClient');
            Receipts.populateClientSelect('receiptClientFilter');
            Receivables.populateClientSelect('receivableClient');
            Notification.success('Cliente excluído com sucesso.');
            
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
    viewHistory: (id) => {
        Notification.warning('Funcionalidade de histórico ainda em desenvolvimento.');
    },
    exportToCSV: () => {
        Notification.warning('Funcionalidade de exportação ainda em desenvolvimento.');
    }
};
// ==================================================================
// ===== FIM DA SEÇÃO CORRIGIDA - CLIENTES =====
// ==================================================================


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
                        <td data-label="Código">${product.refCode}</td>
                        <td data-label="Nome" style="white-space:normal;">${product.name}</td>
                        <td data-label="Qtd.">${product.quantity}</td>
                        <td data-label="P. Custo">${Utils.formatCurrency(product.costPrice)}</td>
                        <td data-label="P. Venda">${Utils.formatCurrency(product.salePrice)}</td>
                        <td data-label="Margem">${margin.toFixed(1)}%</td>
                        <td data-label="Status"><span class="badge ${statusClass}">${statusText}</span></td>
                        <td data-label="Ações">
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
        const newProductData = {
            refCode: document.getElementById('productRefCode').value.trim(),
            name: document.getElementById('productName').value.trim(),
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            costPrice: parseFloat(document.getElementById('productCostPrice').value) || 0,
            salePrice: parseFloat(document.getElementById('productSalePrice').value) || 0,
        };

        if (!newProductData.refCode || !newProductData.name) return Notification.error('Código e Nome são obrigatórios.');

        try {
            if (state.currentEditId) {
                const updatedData = { ...newProductData, updatedAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.products).doc(state.currentEditId).update(updatedData);
                const productIndex = state.products.findIndex(p => p.id === state.currentEditId);
                if (productIndex > -1) {
                    state.products[productIndex] = { ...state.products[productIndex], ...updatedData };
                }
                Notification.success('Produto atualizado!');
            } else {
                const id = Utils.generateUUID();
                const finalProduct = { ...newProductData, id, createdAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.products).doc(id).set(finalProduct);
                state.products.push(finalProduct);
                Notification.success('Produto cadastrado!');
            }
        } catch (error) {
            Notification.error('Erro ao salvar produto.'); console.error(error);
        }

        Products.clearForm();
        Products.render(state.products);
        Products.updateStats();
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
            state.products = state.products.filter(p => p.id !== id);
            Notification.success('Produto excluído.');
            Products.render(state.products);
            Products.updateStats();
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
    exportToCSV: () => {
         Notification.warning('Funcionalidade de exportação ainda em desenvolvimento.');
    }
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
        state.clients.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
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
            state.cart.push({ ...product, quantity: 1, quantity_stock: product.quantity });
        }
        this.updateCartView();
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('productSuggestions').classList.add('hidden');
    },
    updateCartView() {
        const tbody = document.getElementById('cartTableBody');
        const subtotalEl = document.getElementById('cartSubtotal');
        const totalEl = document.getElementById('cartTotal');
        const finalizeBtn = document.getElementById('finalizeSale');

        if (state.cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">Carrinho vazio</td></tr>';
            subtotalEl.textContent = Utils.formatCurrency(0);
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
                    <td data-label="Produto">${item.name}</td>
                    <td data-label="Preço Unit.">${Utils.formatCurrency(item.salePrice)}</td>
                    <td data-label="Qtd.">
                        <div class="flex" style="align-items:center; gap: 8px; justify-content: flex-end;">
                            <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" onclick="Sales.updateQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" onclick="Sales.updateQuantity('${item.id}', 1)">+</button>
                        </div>
                    </td>
                    <td data-label="Subtotal">${Utils.formatCurrency(subtotal)}</td>
                    <td data-label="Ações"><button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="Sales.removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        }).join('');

        subtotalEl.textContent = Utils.formatCurrency(total);
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
            await App.loadAllData(); // Recarrega todos os dados após a transação complexa
        } catch (error) {
            Notification.error('Erro ao finalizar a venda.');
            console.error(error);
        }
    },
};

const Receipts = {
    init() {
        document.getElementById('receiptClientFilter').addEventListener('change', () => this.render(this.getFiltered()));
        document.getElementById('receiptDateFilter').addEventListener('change', () => this.render(this.getFiltered()));
        document.getElementById('clearReceiptFilters').addEventListener('click', this.clearFilters);
    },
    async load() {
        this.populateClientSelect('receiptClientFilter');
        this.render(state.sales);
    },
    populateClientSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Todos os Clientes</option>';
        state.clients.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    },
    getFiltered() {
        const clientId = document.getElementById('receiptClientFilter').value;
        const date = document.getElementById('receiptDateFilter').value;

        return state.sales.filter(sale => {
            const clientMatch = !clientId || sale.clientId === clientId;
            const dateMatch = !date || Utils.formatDate(sale.date) === Utils.formatDate(new Date(date).toISOString());
            return clientMatch && dateMatch;
        });
    },
    clearFilters() {
        document.getElementById('receiptClientFilter').value = '';
        document.getElementById('receiptDateFilter').value = '';
        this.render(state.sales);
    },
    render(salesToRender) {
        const tbody = document.getElementById('receiptsTableBody');
        if (salesToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">Nenhuma venda encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = salesToRender
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(sale => `
                <tr>
                    <td data-label="ID da Venda">#${sale.id.substring(0, 6)}</td>
                    <td data-label="Data">${Utils.formatDateTime(sale.date)}</td>
                    <td data-label="Cliente">${sale.clientName}</td>
                    <td data-label="Total">${Utils.formatCurrency(sale.total)}</td>
                    <td data-label="Pagamento">${sale.paymentMethod}</td>
                    <td data-label="Ações">
                        <button class="btn btn-secondary btn-sm" onclick="Receipts.viewReceipt('${sale.id}')" title="Ver Recibo">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
    },
    viewReceipt(saleId) {
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale) return;

        const itemsHtml = sale.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${Utils.formatCurrency(item.price)}</td>
                <td class="text-right">${Utils.formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        const modalContent = `
            <div class="receipt-professional-container" id="receiptToPrint">
                <header class="receipt-professional-header">
                    <div class="receipt-logo-container"><i class="fas fa-store"></i></div>
                    <div class="receipt-company-details">
                        <h3>${CONFIG.company.name}</h3>
                        <p>${CONFIG.company.address}</p>
                        <p>${CONFIG.company.phone} | CNPJ: ${CONFIG.company.cnpj}</p>
                    </div>
                </header>
                <section class="receipt-sale-info">
                    <div>
                        <strong>CLIENTE:</strong>
                        <p>${sale.clientName}</p>
                    </div>
                    <div style="text-align: right;">
                        <strong>RECIBO Nº:</strong> <p>#${sale.id.substring(0, 8).toUpperCase()}</p>
                        <strong>DATA:</strong> <p>${Utils.formatDateTime(sale.date)}</p>
                    </div>
                </section>
                <table class="receipt-items-table">
                    <thead><tr><th>Descrição</th><th class="text-center">Qtd</th><th class="text-right">Preço Unit.</th><th class="text-right">Subtotal</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <section class="receipt-summary">
                    <table>
                        <tr><td><strong>Forma de Pagamento:</strong></td><td class="text-right">${sale.paymentMethod}</td></tr>
                        <tr><td><strong style="font-size: 1.2rem;">TOTAL:</strong></td><td class="text-right total-value">${Utils.formatCurrency(sale.total)}</td></tr>
                    </table>
                </section>
                <footer class="receipt-footer">Obrigado pela sua preferência!</footer>
            </div>
            <button class="btn btn-primary mt-3" style="width:100%" onclick="Receipts.printReceipt()"><i class="fas fa-print"></i> Imprimir</button>
        `;
        Modal.show(`Recibo da Venda #${sale.id.substring(0,6)}`, modalContent);
    },
    printReceipt() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const receiptElement = document.getElementById('receiptToPrint');

        doc.html(receiptElement, {
            callback: function (doc) {
                doc.save(`recibo_${CONFIG.company.name.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`);
                Notification.success("Gerando PDF do recibo...");
            },
            x: 10,
            y: 10,
            width: 190,
            windowWidth: 800
        });
    }
};

const CashFlow = {
    init() {
        document.getElementById('cashFlowForm').addEventListener('submit', this.save);
        document.getElementById('clearCashFlowForm').addEventListener('click', this.clearForm);
        document.getElementById('cashFlowSearch').addEventListener('input', Utils.debounce(() => this.render(this.getFiltered()), 300));
    },
    async load() {
        this.render(state.cashFlow);
        this.updateSummary();
    },
    render(entries) {
        const tbody = document.getElementById('cashFlowTableBody');
        if (!entries || entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum lançamento encontrado.</td></tr>';
            return;
        }
        tbody.innerHTML = entries
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(entry => `
                <tr>
                    <td data-label="Data">${Utils.formatDate(entry.date)}</td>
                    <td data-label="Tipo"><span style="color: ${entry.type === 'entrada' ? 'var(--accent-color)' : 'var(--danger-color)'}; text-transform: capitalize;">${entry.type}</span></td>
                    <td data-label="Descrição" style="white-space:normal;">${entry.description}</td>
                    <td data-label="Valor">${Utils.formatCurrency(entry.value)}</td>
                    <td data-label="Ações">
                        ${!entry.source ? `<button class="btn btn-danger btn-sm" onclick="CashFlow.remove('${entry.id}')"><i class="fas fa-trash"></i></button>` : '<span class="text-muted">Automático</span>'}
                    </td>
                </tr>
            `).join('');
    },
    async save(e) {
        e.preventDefault();
        const newEntry = {
            id: Utils.generateUUID(),
            type: document.getElementById('cashFlowType').value,
            description: document.getElementById('cashFlowDescription').value.trim(),
            value: parseFloat(document.getElementById('cashFlowValue').value),
            date: document.getElementById('cashFlowDate').valueAsDate.toISOString(),
            source: 'manual'
        };

        if (!newEntry.description || !newEntry.value || !newEntry.date) {
            return Notification.error("Todos os campos são obrigatórios.");
        }

        try {
            await db.collection(CONFIG.collections.cashFlow).doc(newEntry.id).set(newEntry);
            state.cashFlow.push(newEntry);
            this.render(state.cashFlow);
            this.updateSummary();
            this.clearForm();
            Notification.success("Lançamento salvo com sucesso!");
        } catch (error) {
            Notification.error("Erro ao salvar lançamento.");
            console.error(error);
        }
    },
    async remove(id) {
        if (!confirm("Tem certeza que deseja excluir este lançamento manual?")) return;
        try {
            await db.collection(CONFIG.collections.cashFlow).doc(id).delete();
            state.cashFlow = state.cashFlow.filter(e => e.id !== id);
            this.render(state.cashFlow);
            this.updateSummary();
            Notification.success("Lançamento excluído.");
        } catch (error) {
            Notification.error("Erro ao excluir lançamento.");
            console.error(error);
        }
    },
    updateSummary() {
        const totalEntradas = state.cashFlow.filter(e => e.type === 'entrada').reduce((sum, e) => sum + e.value, 0);
        const totalSaidas = state.cashFlow.filter(e => e.type === 'saida').reduce((sum, e) => sum + e.value, 0);
        const saldoAtual = totalEntradas - totalSaidas;

        document.getElementById('totalEntradas').textContent = Utils.formatCurrency(totalEntradas);
        document.getElementById('totalSaidas').textContent = Utils.formatCurrency(totalSaidas);
        document.getElementById('saldoAtual').textContent = Utils.formatCurrency(saldoAtual);
    },
    getFiltered() {
        const searchTerm = document.getElementById('cashFlowSearch').value.toLowerCase();
        if (!searchTerm) return state.cashFlow;
        return state.cashFlow.filter(e => e.description.toLowerCase().includes(searchTerm));
    },
    clearForm() {
        document.getElementById('cashFlowForm').reset();
        document.getElementById('cashFlowDate').valueAsDate = new Date();
    }
};

const Expenses = {
    init() {
        document.getElementById('expenseForm').addEventListener('submit', this.save);
    },
    async load() {
        this.render(state.expenses);
        this.updateSummary();
    },
    render(expenses) {
        const tbody = document.getElementById('expensesTableBody');
         if (!expenses || expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhuma despesa encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = expenses
            .sort((a,b) => new Date(b.date) - new Date(a.date))
            .map(exp => `
                <tr>
                    <td data-label="Data">${Utils.formatDate(exp.date)}</td>
                    <td data-label="Descrição" style="white-space:normal;">${exp.description}</td>
                    <td data-label="Categoria">${exp.category}</td>
                    <td data-label="Valor">${Utils.formatCurrency(exp.value)}</td>
                    <td data-label="Ações"><button class="btn btn-danger btn-sm" onclick="Expenses.remove('${exp.id}')"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('');
    },
    async save(e) {
        e.preventDefault();
        const newExpense = {
            id: Utils.generateUUID(),
            description: document.getElementById('expenseDescription').value,
            category: document.getElementById('expenseCategory').value,
            value: parseFloat(document.getElementById('expenseValue').value),
            date: document.getElementById('expenseDate').valueAsDate.toISOString(),
        };

        try {
            await db.collection(CONFIG.collections.expenses).doc(newExpense.id).set(newExpense);
            await db.collection(CONFIG.collections.cashFlow).add({
                type: 'saida',
                description: `Despesa: ${newExpense.description}`,
                value: newExpense.value,
                date: newExpense.date,
                source: 'despesa',
                sourceId: newExpense.id
            });
            await App.loadAllData();
            this.load();
            CashFlow.load();
            Notification.success("Despesa salva com sucesso!");
        } catch (error) {
            Notification.error("Erro ao salvar despesa.");
        }
    },
    async remove(id) {
        // Implementar remoção e estorno no caixa se necessário
        Notification.warning("Função de remoção de despesa em desenvolvimento.");
    },
    updateSummary() {
        const now = new Date();
        const totalMonth = state.expenses
            .filter(e => new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear())
            .reduce((sum, e) => sum + e.value, 0);
        const totalYear = state.expenses
            .filter(e => new Date(e.date).getFullYear() === now.getFullYear())
            .reduce((sum, e) => sum + e.value, 0);
        
        document.getElementById('totalExpensesMonth').textContent = Utils.formatCurrency(totalMonth);
        document.getElementById('totalExpensesYear').textContent = Utils.formatCurrency(totalYear);
    }
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
        state.clients.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    },
    render(receivablesToRender) {
        const tbody = document.getElementById('receivablesTableBody');
        if (!receivablesToRender || receivablesToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">Nenhuma conta a receber encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = receivablesToRender
            .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(r => {
            const client = state.clients.find(c => c.id === r.clientId);
            let statusClass = 'badge-info';
            if (r.status === 'Pago') statusClass = 'badge-success';
            if (r.status === 'Vencido') statusClass = 'badge-danger';
            
            return `
                <tr>
                    <td data-label="Cliente">${client?.name || 'N/A'}</td>
                    <td data-label="Descrição" style="white-space:normal;">${r.description}</td>
                    <td data-label="Valor">${Utils.formatCurrency(r.value)}</td>
                    <td data-label="Vencimento">${Utils.formatDate(r.dueDate)}</td>
                    <td data-label="Status"><span class="badge ${statusClass}">${r.status}</span></td>
                    <td data-label="Ações">
                        ${r.status !== 'Pago' ? `<button class="btn btn-primary btn-sm" onclick="Receivables.markAsPaid('${r.id}')" title="Marcar como Pago"><i class="fas fa-check"></i></button>` : 'Quitada'}
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
            await CashFlow.load();
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
        const paidThisMonth = state.receivables.filter(r => {
            const paidDate = r.paidAt ? new Date(r.paidAt) : null;
            return r.status === 'Pago' && paidDate && paidDate.getMonth() === new Date().getMonth() && paidDate.getFullYear() === new Date().getFullYear();
        }).reduce((acc, r) => acc + r.value, 0);

        document.getElementById('totalReceivablesPending').textContent = Utils.formatCurrency(pending);
        document.getElementById('totalReceivablesOverdue').textContent = Utils.formatCurrency(overdue);
        document.getElementById('totalReceivablesPaid').textContent = Utils.formatCurrency(paidThisMonth);
    },
    saveManual: async (e) => { e.preventDefault(); Notification.warning("Funcionalidade em desenvolvimento.")},
    clearForm: () => {document.getElementById('receivableForm').reset();}
};

const Reports = {
    init() { /* Lógica de inicialização de relatórios */ },
    async load() { /* Lógica para carregar a página de relatórios */ }
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
        const backupState = {
            clients: state.clients,
            products: state.products,
            sales: state.sales,
            cashFlow: state.cashFlow,
            expenses: state.expenses,
            receivables: state.receivables,
        };
        const dataStr = JSON.stringify(backupState, null, 2);
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
                
                Notification.warning("Iniciando restauração. Isso pode levar alguns momentos...");

                // Limpa coleções antigas primeiro
                for (const collectionName of collections) {
                  const snapshot = await db.collection(collectionName).get();
                  const deleteBatch = db.batch();
                  snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
                  await deleteBatch.commit();
                }
                
                // Adiciona novos dados
                const writeBatch = db.batch();
                for (const collectionName of collections) {
                    if(restoredState[collectionName]) {
                        restoredState[collectionName].forEach(item => {
                            const docId = item.id || Utils.generateUUID();
                            const docRef = db.collection(collectionName).doc(docId);
                            writeBatch.set(docRef, {...item, id: docId });
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
        
        Notification.warning("Iniciando limpeza geral. O sistema será recarregado ao final.");

        try {
            const collections = Object.keys(CONFIG.collections);
            for (const collectionName of collections) {
                const snapshot = await db.collection(collectionName).get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
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
