// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.0 (Firebase Integration) =====

// 1. Initialize Firebase
// TODO: Replace this with your own Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Configurações globais
const CONFIG = {
    // Collection names are now the source of truth
    collections: {
        clients: 'sgi_clients',
        products: 'sgi_products',
        sales: 'sgi_sales',
        cashFlow: 'sgi_cashflow',
        expenses: 'sgi_expenses',
        accountsReceivable: 'sgi_accounts_receivable'
    },
    company: {
        name: 'Flor de Maria',
        address: 'Rua das Flores, 123 - Centro',
        phone: '(11) 98765-4321',
        cnpj: '12.345.678/0001-99'
    }
};

// Utilitários
const Utils = {
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date.getTime() + userTimezoneOffset));
    },
    formatDateTime(date) {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
    },
    async loadFromStorage(collectionName) {
        try {
            const snapshot = await db.collection(collectionName).get();
            const data = [];
            snapshot.forEach(doc => {
                data.push(doc.data());
            });
            return data;
        } catch (error) {
            console.error(`Erro ao carregar de '${collectionName}':`, error);
            Notification.error('Erro ao carregar dados. Verifique o console.');
            return [];
        }
    },
    debounce(func, delay = 300) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    },
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
};

// Sistema de Notificações
const Notification = {
    show(message, type = 'success') {
        const el = document.getElementById('notification');
        document.getElementById('notificationText').textContent = message;
        el.className = `notification notification-${type} show`;
        setTimeout(() => el.classList.remove('show'), 3000);
    },
    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); }
};

// Sistema de Modal
const Modal = {
    show(title, content, actionsHtml = '') {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        
        const existingActions = document.getElementById('modalActions');
        if (existingActions) existingActions.remove();
        
        if (actionsHtml) {
            const modalContent = document.querySelector('.modal-content');
            const actionsContainer = document.createElement('div');
            actionsContainer.id = 'modalActions';
            actionsContainer.className = "flex gap-2 mt-3";
            actionsContainer.style.paddingTop = '16px';
            actionsContainer.style.borderTop = `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border-color')}`;
            actionsContainer.innerHTML = actionsHtml;
            modalContent.appendChild(actionsContainer);
        }
        
        document.getElementById('modal').classList.add('show');
    },
    hide() {
        document.getElementById('modal').classList.remove('show');
    }
};

// Sistema de Navegação
const Navigation = {
    init() {
        const sidebar = document.getElementById('sidebar');
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.innerWidth <= 800) sidebar.classList.remove('active');
                const page = link.getAttribute('data-page');
                if (page) this.navigateTo(page);
            });
        });

        const mobileToggle = document.getElementById('mobileMenuToggle');
        mobileToggle.addEventListener('click', () => sidebar.classList.toggle('active'));

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 800 && sidebar.classList.contains('active') && !sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    },
    async navigateTo(page) {
        try {
            if (!document.getElementById(`${page}Page`)) {
                console.error(`Página "${page}" não encontrada.`);
                page = 'dashboard';
            }
            
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.getElementById(`${page}Page`).classList.remove('hidden');

            document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.remove('active'));
            document.querySelector(`[data-page="${page}"]`).classList.add('active');
            
            localStorage.setItem('sgi_last_active_page', page);
            
            await this.loadPageData(page);
        } catch (error) {
            console.error(`Erro ao navegar para a página ${page}:`, error);
            Notification.error("Ocorreu um erro ao carregar a página.");
        }
    },
    async loadPageData(page) {
        switch (page) {
            case 'dashboard': await Dashboard.loadData(); break;
            case 'clients': await Clients.loadClients(); break;
            case 'products': await Products.loadProducts(); break;
            case 'sales': await Sales.initPage(); break;
            case 'receipts': await Receipts.initPage(); break;
            case 'cashflow': await CashFlow.loadEntries(); break;
            case 'expenses': await Expenses.loadExpenses(); break;
            case 'receivables': await Receivables.loadReceivables(); break;
            case 'reports': await Reports.initPage(); break;
            case 'settings': await Settings.updateBackupStats(); break;
        }
    }
};

// Autenticação com Firebase
const Auth = {
    init() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        auth.onAuthStateChanged(user => {
            if (user) {
                this.showApp();
            } else {
                this.showLogin();
            }
        });
    },
    async login() {
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            Notification.success('Login realizado com sucesso!');
        } catch (error) {
            console.error("Login error:", error);
            Notification.error('Email ou senha incorretos!');
        }
    },
    async logout() {
        try {
            await auth.signOut();
            localStorage.removeItem('sgi_last_active_page');
            Notification.success('Logout realizado com sucesso!');
        } catch (error) {
            console.error("Logout error:", error);
            Notification.error('Erro ao sair.');
        }
    },
    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appLayout').classList.add('hidden');
    },
    showApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appLayout').classList.remove('hidden');
        const lastPage = localStorage.getItem('sgi_last_active_page');
        Navigation.navigateTo(lastPage || 'dashboard');
    }
};

// ===================================================================================
// ============================= MÓDULOS DA APLICAÇÃO ================================
// ===================================================================================

// Dashboard
const Dashboard = {
    chart: null,
    async loadData() {
        await this.updateStats();
        await this.updateChart();
        await this.updateOverdueAccounts();
    },
    async updateStats() {
        const cashFlow = await Utils.loadFromStorage(CONFIG.collections.cashFlow);
        const accountsReceivable = await Utils.loadFromStorage(CONFIG.collections.accountsReceivable);
        const sales = await Utils.loadFromStorage(CONFIG.collections.sales);

        const cashBalance = cashFlow.reduce((total, item) => item.type === 'entrada' ? total + item.value : total - item.value, 0);
        const totalReceivables = accountsReceivable.filter(acc => acc.status === 'Pendente').reduce((total, acc) => total + acc.value, 0);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlySales = sales
            .filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((total, s) => total + s.total, 0);
        
        const monthlyExpenses = cashFlow
            .filter(cf => cf.type === 'saida' && cf.origin !== 'Venda')
            .filter(cf => { const d = new Date(cf.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((total, cf) => total + cf.value, 0);

        document.getElementById('cashBalance').textContent = Utils.formatCurrency(cashBalance);
        document.getElementById('totalReceivables').textContent = Utils.formatCurrency(totalReceivables);
        document.getElementById('monthlyExpenses').textContent = Utils.formatCurrency(monthlyExpenses);
        document.getElementById('monthlySales').textContent = Utils.formatCurrency(monthlySales);
    },
    async updateChart() {
        const sales = await Utils.loadFromStorage(CONFIG.collections.sales);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlySales = sales.filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; });

        const paymentMethods = {};
        monthlySales.forEach(sale => {
            const method = sale.paymentMethod || 'N/A';
            paymentMethods[method] = (paymentMethods[method] || 0) + sale.total;
        });

        const ctx = document.getElementById('paymentMethodChart').getContext('2d');
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(paymentMethods),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: Object.values(paymentMethods),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#F1F5F9' } } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94A3B8' }, grid: { color: '#475569' } },
                    x: { ticks: { color: '#94A3B8' }, grid: { color: '#475569' } }
                }
            }
        });
    },
    async updateOverdueAccounts() {
        const accountsReceivable = await Utils.loadFromStorage(CONFIG.collections.accountsReceivable);
        const clients = await Utils.loadFromStorage(CONFIG.collections.clients);
        const clientMap = new Map(clients.map(c => [c.id, c.name]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdueAccounts = accountsReceivable.filter(account => account.status === 'Pendente' && new Date(account.dueDate) < today);
        const container = document.getElementById('overdueAccounts');

        if (overdueAccounts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">Nenhuma conta vencida</p>';
        } else {
            container.innerHTML = overdueAccounts.map(account => {
                const clientName = clientMap.get(account.clientId) || 'Cliente não encontrado';
                const daysOverdue = Math.floor((today - new Date(account.dueDate)) / (1000 * 60 * 60 * 24));
                return `
                    <div style="padding: 12px; border-left: 4px solid var(--danger-color); background: rgba(239, 68, 68, 0.1); margin-bottom: 8px; border-radius: 4px;">
                        <div class="flex-between">
                            <div><strong>${clientName}</strong><br><small class="text-muted">${daysOverdue} dia(s) em atraso</small></div>
                            <div class="text-right"><strong style="color: var(--danger-color);">${Utils.formatCurrency(account.value)}</strong><br><small class="text-muted">Venc: ${Utils.formatDate(account.dueDate)}</small></div>
                        </div>
                    </div>`;
            }).join('');
        }
    }
};

// Módulo de Clientes
const Clients = {
    currentEditId: null,
    init() {
        document.getElementById('clientForm').addEventListener('submit', (e) => { e.preventDefault(); this.saveClient(); });
        document.getElementById('clearClientForm').addEventListener('click', () => this.clearForm());
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(() => this.filterClients(), 300));
        document.getElementById('exportClients').addEventListener('click', () => this.exportToCSV());
    },
    async saveClient() {
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        if (!name || !phone) return Notification.error('Preencha nome e telefone!');

        const data = { name, phone, updatedAt: new Date().toISOString() };
        
        try {
            if (this.currentEditId) {
                await db.collection(CONFIG.collections.clients).doc(this.currentEditId).update(data);
                Notification.success('Cliente atualizado!');
            } else {
                const newId = Utils.generateUUID();
                data.id = newId;
                data.createdAt = new Date().toISOString();
                await db.collection(CONFIG.collections.clients).doc(newId).set(data);
                Notification.success('Cliente cadastrado!');
            }
        } catch (error) {
            Notification.error('Erro ao salvar cliente.');
            console.error(error);
        }
        this.clearForm();
        await this.loadClients();
    },
    async editClient(id) {
        try {
            const doc = await db.collection(CONFIG.collections.clients).doc(id).get();
            if (doc.exists) {
                const client = doc.data();
                document.getElementById('clientName').value = client.name;
                document.getElementById('clientPhone').value = client.phone;
                this.currentEditId = id;
                document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            Notification.error("Erro ao buscar cliente para edição.");
        }
    },
    async deleteClient(id) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await db.collection(CONFIG.collections.clients).doc(id).delete();
                await this.loadClients();
                Notification.success('Cliente excluído!');
            } catch (error) {
                Notification.error('Erro ao excluir cliente.');
            }
        }
    },
    async viewHistory(id) {
        const doc = await db.collection(CONFIG.collections.clients).doc(id).get();
        if (!doc.exists) return;
        const client = doc.data();

        const sales = await Utils.loadFromStorage(CONFIG.collections.sales);
        const receivables = await Utils.loadFromStorage(CONFIG.collections.accountsReceivable);
        
        const clientSales = sales.filter(s => s.clientId === id);
        const clientReceivables = receivables.filter(r => r.clientId === id);
        
        const totalSpent = clientSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalDebt = clientReceivables.filter(r => r.status === 'Pendente').reduce((sum, r) => sum + r.value, 0);

        const getStatusBadge = (status) => {
            if (status === 'Pago') return 'badge-success';
            if (status === 'Vencido') return 'badge-danger';
            return 'badge-warning';
        };

        let historyHtml = `
            <h4>Histórico de Compras - ${client.name}</h4>
            <p><strong>Total Gasto:</strong> ${Utils.formatCurrency(totalSpent)} em ${clientSales.length} compra(s).</p>
            <div class="table-responsive" style="max-height: 150px; margin-top: 1rem;">
            ${clientSales.length === 0 ? '<p>Nenhuma compra registrada.</p>' : `
                <table class="table"><thead><tr><th>Data</th><th>Total</th><th>Pagamento</th></tr></thead><tbody>
                ${clientSales.sort((a,b) => new Date(b.date) - new Date(a.date)).map(s => `<tr><td>${Utils.formatDateTime(s.date)}</td><td>${Utils.formatCurrency(s.total)}</td><td>${s.paymentMethod}</td></tr>`).join('')}
                </tbody></table>`}
            </div>
            <h4 class="mt-3">Contas (Crediário)</h4>
            <p><strong>Total Pendente:</strong> ${Utils.formatCurrency(totalDebt)}</p>
            <div class="table-responsive" style="max-height: 150px; margin-top: 1rem;">
            ${clientReceivables.length === 0 ? '<p>Nenhuma conta no crediário.</p>' : `
                <table class="table"><thead><tr><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
                ${clientReceivables.sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate)).map(r => `<tr><td>${Utils.formatDate(r.dueDate)}</td><td>${Utils.formatCurrency(r.value)}</td><td><span class="badge ${getStatusBadge(r.status)}">${r.status}</span></td></tr>`).join('')}
                </tbody></table>`}
            </div>`;
        Modal.show('Histórico do Cliente', historyHtml);
    },
    clearForm() {
        document.getElementById('clientForm').reset();
        this.currentEditId = null;
    },
    async filterClients() {
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
        const clients = await Utils.loadFromStorage(CONFIG.collections.clients);
        const filtered = clients.filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm));
        this.renderClients(filtered);
    },
    async loadClients() {
        const clients = await Utils.loadFromStorage(CONFIG.collections.clients);
        this.renderClients(clients);
        document.getElementById('clientCount').textContent = `${clients.length} clientes`;
    },
    async renderClients(clients) {
        const tbody = document.getElementById('clientsTableBody');
        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum cliente encontrado</td></tr>`;
            return;
        }
        const sales = await Utils.loadFromStorage(CONFIG.collections.sales);
        const salesCountMap = sales.reduce((map, sale) => {
            map.set(sale.clientId, (map.get(sale.clientId) || 0) + 1);
            return map;
        }, new Map());
        
        tbody.innerHTML = clients.sort((a,b) => a.name.localeCompare(b.name)).map(client => {
            const purchaseCount = salesCountMap.get(client.id) || 0;
            return `
                <tr>
                    <td>${client.name}</td>
                    <td>${client.phone}</td>
                    <td>${Utils.formatDate(client.createdAt)}</td>
                    <td>${purchaseCount} compra(s)</td>
                    <td>
                        <div class="flex gap-1">
                            <button class="btn btn-secondary btn-sm" onclick="Clients.editClient('${client.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-primary btn-sm" onclick="Clients.viewHistory('${client.id}')" title="Histórico"><i class="fas fa-history"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="Clients.deleteClient('${client.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },
    async exportToCSV() {
        const clients = await Utils.loadFromStorage(CONFIG.collections.clients);
        if (clients.length === 0) return Notification.warning('Nenhum cliente para exportar!');
        const headers = ['ID', 'Nome', 'Telefone', 'Data de Cadastro'];
        const csvContent = [
            headers.join(','),
            ...clients.map(c => [c.id, `"${c.name}"`, `"${c.phone}"`, `"${Utils.formatDate(c.createdAt)}"`].join(','))
        ].join('\n');
        Utils.downloadCSV(csvContent, 'clientes');
        Notification.success('Relatório de clientes exportado!');
    }
};

// ... (Other modules like Products, Sales, Receipts, etc. would be here)
// NOTE: Due to the character limit, a fully complete script with all modules implemented
//       is too long. Below is a continuation with the Products module and stubs for others.
//       The full implementation follows the same async/await and Firestore patterns.

// Módulo de Produtos
const Products = {
    currentEditId: null,
    init() {
        document.getElementById('productForm').addEventListener('submit', e => { e.preventDefault(); this.saveProduct(); });
        document.getElementById('clearProductForm').addEventListener('click', () => this.clearForm());
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(() => this.filterProducts(), 300));
        document.getElementById('exportProducts').addEventListener('click', () => this.exportToCSV());
    },
    async saveProduct() {
        const refCode = document.getElementById('productRefCode').value.trim();
        const name = document.getElementById('productName').value.trim();
        const quantity = parseInt(document.getElementById('productQuantity').value) || 0;
        const costPrice = parseFloat(document.getElementById('productCostPrice').value) || 0;
        const salePrice = parseFloat(document.getElementById('productSalePrice').value) || 0;

        if (!refCode || !name) return Notification.error('Preencha código de referência e nome!');
        if (salePrice < costPrice && !confirm('Atenção: O preço de venda é menor que o preço de custo. Deseja continuar?')) return;

        try {
            const data = { refCode, name, quantity, costPrice, salePrice, updatedAt: new Date().toISOString() };
            if (this.currentEditId) {
                await db.collection(CONFIG.collections.products).doc(this.currentEditId).update(data);
                Notification.success('Produto atualizado!');
            } else {
                // Check for duplicate refCode before creating
                const existing = await db.collection(CONFIG.collections.products).where('refCode', '==', refCode).get();
                if (!existing.empty) {
                    return Notification.error('Já existe um produto com este código de referência.');
                }
                const newId = Utils.generateUUID();
                data.id = newId;
                data.createdAt = new Date().toISOString();
                await db.collection(CONFIG.collections.products).doc(newId).set(data);
                Notification.success('Produto cadastrado!');
            }
        } catch(error) {
            Notification.error("Erro ao salvar produto.");
            console.error(error);
        }
        this.clearForm();
        await this.loadProducts();
    },
    async editProduct(id) {
        const doc = await db.collection(CONFIG.collections.products).doc(id).get();
        if (doc.exists) {
            const p = doc.data();
            document.getElementById('productRefCode').value = p.refCode;
            document.getElementById('productName').value = p.name;
            document.getElementById('productQuantity').value = p.quantity;
            document.getElementById('productCostPrice').value = p.costPrice;
            document.getElementById('productSalePrice').value = p.salePrice;
            this.currentEditId = id;
            document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        }
    },
    async deleteProduct(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            await db.collection(CONFIG.collections.products).doc(id).delete();
            await this.loadProducts();
            Notification.success('Produto excluído!');
        }
    },
    clearForm() {
        document.getElementById('productForm').reset();
        this.currentEditId = null;
    },
    async filterProducts() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const products = await Utils.loadFromStorage(CONFIG.collections.products);
        const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm) || p.refCode.toLowerCase().includes(searchTerm));
        this.renderProducts(filtered);
    },
    async loadProducts() {
        const products = await Utils.loadFromStorage(CONFIG.collections.products);
        this.renderProducts(products);
        this.updateStats(products);
    },
    updateStats(products) {
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('outOfStockProducts').textContent = products.filter(p => p.quantity <= 0).length;
    },
    renderProducts(products) {
        const tbody = document.getElementById('productsTableBody');
        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px;">Nenhum produto encontrado</td></tr>`;
            return;
        }
        tbody.innerHTML = products.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
            const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice * 100) : 0;
            const statusClass = p.quantity > 5 ? 'badge-success' : (p.quantity > 0 ? 'badge-warning' : 'badge-danger');
            const statusText = p.quantity > 0 ? 'Disponível' : 'Esgotado';
            return `
                <tr>
                    <td>${p.refCode}</td>
                    <td>${p.name}</td>
                    <td>${p.quantity}</td>
                    <td>${Utils.formatCurrency(p.costPrice)}</td>
                    <td>${Utils.formatCurrency(p.salePrice)}</td>
                    <td>${margin.toFixed(1)}%</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="flex gap-1">
                            <button class="btn btn-secondary btn-sm" onclick="Products.editProduct('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="Products.deleteProduct('${p.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },
    async exportToCSV() {
        const products = await Utils.loadFromStorage(CONFIG.collections.products);
        if (products.length === 0) return Notification.warning('Nenhum produto para exportar!');
        const headers = ['ID', 'CodigoRef', 'Nome', 'Quantidade', 'PrecoCusto', 'PrecoVenda'];
        const content = [
            headers.join(','),
            ...products.map(p => [p.id, p.refCode, `"${p.name}"`, p.quantity, p.costPrice, p.salePrice].join(','))
        ].join('\n');
        Utils.downloadCSV(content, 'estoque');
        Notification.success('Relatório de estoque exportado!');
    }
};

// Stubs for remaining modules. The full implementation would be extensive but follow these patterns.
const Sales = { init() { console.log('Sales init'); }, initPage() { console.log('Sales page load'); } };
const Receipts = { init() { console.log('Receipts init'); }, initPage() { console.log('Receipts page load'); } };
const CashFlow = { init() { console.log('CashFlow init'); }, loadEntries() { console.log('CashFlow page load'); } };
const Expenses = { init() { console.log('Expenses init'); }, loadExpenses() { console.log('Expenses page load'); } };
const Receivables = { init() { console.log('Receivables init'); }, loadReceivables() { console.log('Receivables page load'); } };
const Reports = { init() { console.log('Reports init'); }, initPage() { console.log('Reports page load'); } };
const Settings = { init() { console.log('Settings init'); }, updateBackupStats() { console.log('Settings page load'); } };
// END STUBS

// Inicialização do Sistema
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Navigation.init();
    
    // Initialize all modules
    Clients.init();
    Products.init();
    Sales.init();
    Receipts.init();
    CashFlow.init();
    Expenses.init();
    Receivables.init();
    Reports.init();
    Settings.init();

    // Global modal listeners
    document.getElementById('modalClose').addEventListener('click', () => Modal.hide());
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') Modal.hide();
    });

    console.log('SGI - Flor de Maria v3.0 (Firebase) iniciado!');
});
