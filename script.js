// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.0 (Firebase Integration) =====

// 1. Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBUn5hALHO13M0uHtMawZg_8CmRVBhHzAk",
    authDomain: "sistema-flor-de-maria.firebaseapp.com",
    projectId: "sistema-flor-de-maria",
    storageBucket: "sistema-flor-de-maria.appspot.com",
    messagingSenderId: "148120762956",
    appId: "1:148120762956:web:0b1b9e9efe10407fbcd2e9"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Get Firestore instance
const auth = firebase.auth();   // Get Auth instance

// Configurações globais
const CONFIG = {
    storageKeys: {
        lastActivePage: 'sgi_last_active_page',
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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date.getTime() + userTimezoneOffset));
    },
    formatDateTime(date) {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
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
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
};

// Sistema de Notificações
const Notification = {
    show(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = message;
        notification.className = `notification notification-${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
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
            actionsContainer.style.marginTop = '24px';
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
                
                if (window.innerWidth <= 800 && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }

                const page = link.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                }
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
                console.error(`Página "${page}" não encontrada. Redirecionando para o dashboard.`);
                page = 'dashboard';
            }
            
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.getElementById(`${page}Page`).classList.remove('hidden');

            document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.remove('active'));
            document.querySelector(`[data-page="${page}"]`).classList.add('active');
            
            localStorage.setItem(CONFIG.storageKeys.lastActivePage, page);
            
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
            // Adicionar chamadas para outros módulos quando forem implementados
            // case 'sales': await Sales.initPage(); break;
            // case 'receipts': await Receipts.initPage(); break;
            // etc...
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
            localStorage.removeItem(CONFIG.storageKeys.lastActivePage);
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
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage);
        Navigation.navigateTo(lastPage || 'dashboard');
    }
};

// Dashboard
const Dashboard = {
    chart: null,
    async loadData() {
        await this.updateStats();
        await this.updateChart();
        await this.updateOverdueAccounts();
    },
    async updateStats() {
        const cashFlow = await Utils.loadFromStorage(CONFIG.storageKeys.cashFlow);
        const accountsReceivable = await Utils.loadFromStorage(CONFIG.storageKeys.accountsReceivable);
        const sales = await Utils.loadFromStorage(CONFIG.storageKeys.sales);

        const cashBalance = cashFlow.reduce((total, item) => item.type === 'entrada' ? total + item.value : total - item.value, 0);
        const totalReceivables = accountsReceivable.filter(acc => acc.status === 'Pendente').reduce((total, acc) => total + acc.value, 0);
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlySales = sales
            .filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((total, s) => total + s.total, 0);
        
        const monthlyExpenses = cashFlow
            .filter(cf => cf.type === 'saida')
            .filter(cf => { const d = new Date(cf.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((total, cf) => total + cf.value, 0);

        document.getElementById('cashBalance').textContent = Utils.formatCurrency(cashBalance);
        document.getElementById('totalReceivables').textContent = Utils.formatCurrency(totalReceivables);
        document.getElementById('monthlyExpenses').textContent = Utils.formatCurrency(monthlyExpenses);
        document.getElementById('monthlySales').textContent = Utils.formatCurrency(monthlySales);
    },
    async updateChart() {
        const sales = await Utils.loadFromStorage(CONFIG.storageKeys.sales);
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
        const accountsReceivable = await Utils.loadFromStorage(CONFIG.storageKeys.accountsReceivable);
        const clients = await Utils.loadFromStorage(CONFIG.storageKeys.clients);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdueAccounts = accountsReceivable.filter(account => account.status === 'Pendente' && new Date(account.dueDate) < today);

        const container = document.getElementById('overdueAccounts');
        if (overdueAccounts.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">Nenhuma conta vencida</p>';
        } else {
            container.innerHTML = overdueAccounts.map(account => {
                const client = clients.find(c => c.id === account.clientId);
                const daysOverdue = Math.floor((today - new Date(account.dueDate)) / (1000 * 60 * 60 * 24));
                return `
                    <div style="padding: 12px; border-left: 4px solid var(--danger-color); background: rgba(239, 68, 68, 0.1); margin-bottom: 8px; border-radius: 4px;">
                        <div class="flex-between" style="flex-direction: row; align-items: center;">
                            <div>
                                <strong>${client ? client.name : 'N/A'}</strong><br>
                                <small style="color: var(--text-muted);">${daysOverdue} dia(s) em atraso</small>
                            </div>
                            <div class="text-right">
                                <strong style="color: var(--danger-color);">${Utils.formatCurrency(account.value)}</strong><br>
                                <small style="color: var(--text-muted);">Venc: ${Utils.formatDate(account.dueDate)}</small>
                            </div>
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

        try {
            if (this.currentEditId) {
                await db.collection(CONFIG.storageKeys.clients).doc(this.currentEditId).update({
                    name, phone, updatedAt: new Date().toISOString()
                });
                Notification.success('Cliente atualizado!');
            } else {
                const newId = Utils.generateUUID();
                await db.collection(CONFIG.storageKeys.clients).doc(newId).set({
                    id: newId, name, phone, createdAt: new Date().toISOString()
                });
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
            const doc = await db.collection(CONFIG.storageKeys.clients).doc(id).get();
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
                await db.collection(CONFIG.storageKeys.clients).doc(id).delete();
                await this.loadClients();
                Notification.success('Cliente excluído!');
            } catch (error) {
                Notification.error('Erro ao excluir cliente.');
            }
        }
    },
    async viewHistory(id) {
        const client = (await db.collection(CONFIG.storageKeys.clients).doc(id).get()).data();
        if (!client) return;

        const sales = await Utils.loadFromStorage(CONFIG.storageKeys.sales);
        const receivables = await Utils.loadFromStorage(CONFIG.storageKeys.accountsReceivable);
        
        const clientSales = sales.filter(s => s.clientId === id);
        const clientReceivables = receivables.filter(r => r.clientId === id);
        
        const totalSpent = clientSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalDebt = clientReceivables.filter(r => r.status === 'Pendente').reduce((sum, r) => sum + r.value, 0);

        let historyHtml = `
            <h4>Histórico de Compras - ${client.name}</h4>
            <p><strong>Total Gasto:</strong> ${Utils.formatCurrency(totalSpent)} em ${clientSales.length} compra(s).</p>
            <hr style="margin: 16px 0;">
            <div class="table-responsive" style="max-height: 150px;">
            ${clientSales.length === 0 ? '<p>Nenhuma compra registrada.</p>' : `
                <table class="table"><thead><tr><th>Data</th><th>Total</th><th>Pagamento</th></tr></thead><tbody>
                ${clientSales.sort((a,b) => new Date(b.date) - new Date(a.date)).map(s => `<tr><td>${Utils.formatDateTime(s.date)}</td><td>${Utils.formatCurrency(s.total)}</td><td>${s.paymentMethod}</td></tr>`).join('')}
                </tbody></table>
            `}
            </div>
            <h4 class="mt-3">Contas (Crediário)</h4>
            <p><strong>Total Pendente:</strong> ${Utils.formatCurrency(totalDebt)}</p>
            <hr style="margin: 16px 0;">
            <div class="table-responsive" style="max-height: 150px;">
            ${clientReceivables.length === 0 ? '<p>Nenhuma conta no crediário.</p>' : `
                <table class="table"><thead><tr><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
                ${clientReceivables.sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate)).map(r => `<tr><td>${Utils.formatDate(r.dueDate)}</td><td>${Utils.formatCurrency(r.value)}</td><td><span class="badge ${r.status === 'Pago' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td></tr>`).join('')}
                </tbody></table>
            `}
            </div>
        `;
        Modal.show('Histórico do Cliente', historyHtml);
    },
    clearForm() {
        document.getElementById('clientForm').reset();
        this.currentEditId = null;
    },
    async filterClients() {
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
        const clients = await Utils.loadFromStorage(CONFIG.storageKeys.clients);
        const filtered = clients.filter(c => c.name.toLowerCase().includes(searchTerm) || c.phone.includes(searchTerm));
        await this.renderClients(filtered);
    },
    async loadClients() {
        const clients = await Utils.loadFromStorage(CONFIG.storageKeys.clients);
        await this.renderClients(clients);
        document.getElementById('clientCount').textContent = `${clients.length} clientes`;
    },
    async renderClients(clients) {
        const tbody = document.getElementById('clientsTableBody');
        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum cliente encontrado</td></tr>`;
            return;
        }
        const sales = await Utils.loadFromStorage(CONFIG.storageKeys.sales);
        tbody.innerHTML = clients.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(client => {
            const purchaseCount = sales.filter(s => s.clientId === client.id).length;
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
        const clients = await Utils.loadFromStorage(CONFIG.storageKeys.clients);
        if (clients.length === 0) return Notification.warning('Nenhum cliente para exportar!');

        const headers = ['Nome', 'Telefone', 'Data de Cadastro'];
        const csvContent = [
            headers.join(','),
            ...clients.map(c => [`"${c.name}"`, `"${c.phone}"`, `"${Utils.formatDate(c.createdAt)}"`].join(','))
        ].join('\n');
        this.downloadCSV(csvContent, 'clientes');
    },
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        Notification.success('Relatório CSV exportado!');
    }
};

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

        if (!refCode || !name) return Notification.error('Preencha código e nome!');
        if (salePrice < costPrice && !confirm('Preço de venda menor que o de custo. Continuar?')) return;

        const products = await Utils.loadFromStorage(CONFIG.storageKeys.products);
        if (!this.currentEditId && products.some(p => p.refCode.toLowerCase() === refCode.toLowerCase())) {
            return Notification.error('Código de referência já existe!');
        }

        try {
            if (this.currentEditId) {
                await db.collection(CONFIG.storageKeys.products).doc(this.currentEditId).update({
                    refCode, name, quantity, costPrice, salePrice, updatedAt: new Date().toISOString()
                });
                Notification.success('Produto atualizado!');
            } else {
                const newId = Utils.generateUUID();
                const newProduct = { id: newId, refCode, name, quantity, costPrice, salePrice, createdAt: new Date().toISOString() };
                await db.collection(CONFIG.storageKeys.products).doc(newId).set(newProduct);
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
        const doc = await db.collection(CONFIG.storageKeys.products).doc(id).get();
        if (doc.exists) {
            const product = doc.data();
            document.getElementById('productRefCode').value = product.refCode;
            document.getElementById('productName').value = product.name;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productCostPrice').value = product.costPrice;
            document.getElementById('productSalePrice').value = product.salePrice;
            this.currentEditId = id;
            document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        }
    },
    async deleteProduct(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            await db.collection(CONFIG.storageKeys.products).doc(id).delete();
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
        const products = await Utils.loadFromStorage(CONFIG.storageKeys.products);
        const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm) || p.refCode.toLowerCase().includes(searchTerm));
        this.renderProducts(filtered);
    },
    async loadProducts() {
        const products = await Utils.loadFromStorage(CONFIG.storageKeys.products);
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
        tbody.innerHTML = products.sort((a,b) => a.name.localeCompare(b.name)).map(product => {
            const margin = product.salePrice > 0 ? ((product.salePrice - product.costPrice) / product.salePrice * 100) : 0;
            const statusClass = product.quantity > 5 ? 'badge-success' : (product.quantity > 0 ? 'badge-warning' : 'badge-danger');
            const statusText = product.quantity > 0 ? 'Disponível' : 'Esgotado';
            return `
                <tr>
                    <td>${product.refCode}</td>
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td>${Utils.formatCurrency(product.costPrice)}</td>
                    <td>${Utils.formatCurrency(product.salePrice)}</td>
                    <td>${margin.toFixed(1)}%</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="flex gap-1">
                            <button class="btn btn-secondary btn-sm" onclick="Products.editProduct('${product.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="Products.deleteProduct('${product.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },
    async exportToCSV() {
        const products = await Utils.loadFromStorage(CONFIG.storageKeys.products);
        if (products.length === 0) return Notification.warning('Nenhum produto para exportar!');
        Clients.downloadCSV(
            ['Código', 'Nome', 'Quantidade', 'Preço Custo', 'Preço Venda', 'Margem %'].join(',') + '\n' +
            products.map(p => {
                const margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice * 100) : 0;
                return [`"${p.refCode}"`, `"${p.name}"`, p.quantity, p.costPrice.toFixed(2), p.salePrice.toFixed(2), margin.toFixed(1)].join(',');
            }).join('\n'), 'estoque'
        );
    }
};

// Inicialização do Sistema
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Navigation.init();
    Clients.init();
    Products.init();
    // Sales.init();
    // Receipts.init();
    // CashFlow.init();
    // Expenses.init();
    // Receivables.init();
    // Reports.init();
    // Settings.init();

    document.getElementById('modalClose').addEventListener('click', () => Modal.hide());
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') Modal.hide();
    });

    console.log('SGI - Flor de Maria v3.0 (Firebase) iniciado!');
});
