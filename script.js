// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.6 (Correção Definitiva) =====

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
            pageLoaders[page]();
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
        // <<< CORREÇÃO: Limpando o estado local ao sair para evitar que dados antigos apareçam brevemente no próximo login
        Object.keys(state).forEach(key => {
            if(Array.isArray(state[key])) state[key] = [];
        });
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
        // <<< CORREÇÃO: O carregamento de dados agora é mais reativo e gerenciado por cada módulo.
        // A função loadAllData ainda pode ser usada para coleções que não precisam de tempo real.
        await App.loadAllData();
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage) || 'dashboard';
        Navigation.navigateTo(lastPage);
    }
};

// MÓDULO PRINCIPAL DA APLICAÇÃO
const App = {
    // <<< CORREÇÃO 1: Função para injetar o CSS que corrige as tabelas.
    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .table-container tbody {
                display: table-row-group; /* Garante o comportamento padrão de tabela */
            }
            .table-container td {
                padding: 12px 15px; /* Ajusta o preenchimento para um valor mais razoável */
            }
        `;
        document.head.appendChild(style);
    },
    
    // <<< CORREÇÃO 2: A função agora pode ser usada para dados não-reativos.
    // O carregamento de Clientes foi movido para seu próprio módulo para ser em tempo real.
    async loadAllData() {
        try {
            // Filtramos coleções que terão seu próprio listener em tempo real (como 'clients').
            const collections = Object.keys(CONFIG.collections).filter(c => c !== 'clients' && c !== 'products');
            
            if (collections.length === 0) return; // Não faz nada se não houver coleções para buscar

            const promises = collections.map(col => db.collection(col).get());
            const snapshots = await Promise.all(promises);

            snapshots.forEach((snapshot, index) => {
                const collectionName = collections[index];
                state[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            Notification.error("Falha ao sincronizar dados com o servidor.");
        }
    },
    init() {
        this.injectStyles(); // <<< CORREÇÃO 1: Chamada da função de injeção de CSS.
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

        console.log('SGI - Flor de Maria v3.6 (Firebase) - Corrigido e Reativo - Iniciado!');
    }
};

// MÓDULOS DE NEGÓCIO

const Dashboard = {
    // ... (Módulo Dashboard permanece igual)
    chart: null,
    load() {
        this.updateStats();
        this.renderChart();
        this.renderOverdueAccounts();
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

const Clients = {
    init() {
        document.getElementById('clientForm').addEventListener('submit', this.save);
        document.getElementById('clearClientForm').addEventListener('click', this.clearForm);
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(() => this.render(this.getFiltered()), 300));
        document.getElementById('exportClients').addEventListener('click', this.exportToCSV);
    },
    // <<< CORREÇÃO 2: A função load agora usa um listener em tempo real (onSnapshot).
    // Ela vai escutar por mudanças e atualizar a UI automaticamente.
    load() {
        // Se já houver um listener, não crie outro.
        if (this.unsubscribe) return; 

        this.unsubscribe = db.collection(CONFIG.collections.clients)
          .onSnapshot(snapshot => {
            state.clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Renderiza a tabela com os dados atualizados (respeitando o filtro de busca)
            this.render(this.getFiltered()); 
            
            // Atualiza os <select> de clientes em outras partes do sistema
            Sales.populateClientSelect('saleClient');
            Receipts.populateClientSelect('receiptClientFilter');
            Receivables.populateClientSelect('receivableClient');

        }, error => {
            console.error("Erro ao carregar clientes em tempo real: ", error);
            Notification.error("Não foi possível carregar a lista de clientes.");
        });
    },
    render(clientsToRender) {
        const tbody = document.getElementById('clientsTableBody');
        // Atualiza o contador de clientes aqui, pois a renderização depende dos dados já carregados.
        document.getElementById('clientCount').textContent = `${state.clients.length} clientes cadastrados`;

        if (clientsToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = clientsToRender
            .sort((a,b) => a.name.localeCompare(b.name))
            .map(client => {
                // Para calcular as compras, precisamos garantir que state.sales já foi carregado
                const purchaseCount = state.sales ? state.sales.filter(s => s.clientId === client.id).length : 0;
                return `
                    <tr>
                        <td data-label="Nome">${client.name}</td>
                        <td data-label="Telefone">${client.phone}</td>
                        <td data-label="Cadastro">${Utils.formatDate(client.createdAt)}</td>
                        <td data-label="Compras">${purchaseCount} compra(s)</td>
                        <td data-label="Ações">
                            <div class="flex gap-2">
                                <button class="btn btn-secondary btn-sm" onclick="Clients.edit('${client.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-danger btn-sm" onclick="Clients.remove('${client.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
    },
    save: async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton.disabled) return;

        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        if (!name || !phone) return Notification.error('Nome e telefone são obrigatórios.');

        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando...`;

        try {
            if (state.currentEditId) {
                const clientRef = db.collection(CONFIG.collections.clients).doc(state.currentEditId);
                const updatedData = { name, phone, updatedAt: new Date().toISOString() };
                await clientRef.update(updatedData);
                // Não precisa atualizar o state.clients manualmente, o listener onSnapshot fará isso.
                Notification.success('Cliente atualizado com sucesso!');
            } else {
                const id = Utils.generateUUID();
                const newClient = { id, name, phone, createdAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.clients).doc(id).set(newClient);
                // Não precisa dar push no state.clients, o listener onSnapshot fará isso.
                Notification.success('Cliente cadastrado com sucesso!');
            }

            Clients.clearForm();
            // A renderização é automática pelo listener, não precisa chamar aqui.

        } catch (error) {
            Notification.error('Erro ao salvar cliente.');
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save"></i> Salvar Cliente`;
        }
    },
    edit(id) {
        const client = state.clients.find(c => c.id === id);
        if (client) {
            state.currentEditId = id;
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientPhone').value = client.phone;
            document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar Cliente';
            document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
        }
    },
    remove: async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação é irreversível.')) return;
        try {
            await db.collection(CONFIG.collections.clients).doc(id).delete();
            // O listener onSnapshot vai cuidar de remover da tela.
            Notification.success('Cliente excluído com sucesso.');
            
        } catch(error) {
            Notification.error('Erro ao excluir cliente.');
            console.error(error);
        }
    },
    clearForm() {
        document.getElementById('clientForm').reset();
        state.currentEditId = null;
        document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
    },
    getFiltered() {
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
        if (!searchTerm) return state.clients;
        return state.clients.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            c.phone.includes(searchTerm)
        );
    },
    exportToCSV: () => {
        Notification.warning('Funcionalidade de exportação ainda em desenvolvimento.');
    }
};

const Products = {
    // RECOMENDAÇÃO: Aplicar o mesmo padrão do `onSnapshot` aqui no Products.load() para reatividade.
    init() {
        document.getElementById('productForm').addEventListener('submit', this.save);
        document.getElementById('clearProductForm').addEventListener('click', this.clearForm);
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(() => this.render(this.getFiltered()), 300));
        document.getElementById('exportProducts').addEventListener('click', this.exportToCSV);
    },
    load() {
        // <<< CORREÇÃO SUGERIDA: Implementar onSnapshot aqui também. Por enquanto, usando o método antigo.
        if (this.unsubscribe) return;

        this.unsubscribe = db.collection(CONFIG.collections.products).onSnapshot(snapshot => {
            state.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.render(this.getFiltered());
            this.updateStats();
        }, error => {
            console.error("Erro ao carregar produtos:", error);
            Notification.error("Não foi possível carregar os produtos.");
        });
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
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton.disabled) return;

        const newProductData = {
            refCode: document.getElementById('productRefCode').value.trim(),
            name: document.getElementById('productName').value.trim(),
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            costPrice: parseFloat(document.getElementById('productCostPrice').value.replace(',', '.')) || 0,
            salePrice: parseFloat(document.getElementById('productSalePrice').value.replace(',', '.')) || 0,
        };

        if (!newProductData.refCode || !newProductData.name) return Notification.error('Código e Nome são obrigatórios.');

        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando...`;

        try {
            if (state.currentEditId) {
                const updatedData = { ...newProductData, updatedAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.products).doc(state.currentEditId).update(updatedData);
                Notification.success('Produto atualizado!');
            } else {
                const id = Utils.generateUUID();
                const finalProduct = { ...newProductData, id, createdAt: new Date().toISOString() };
                await db.collection(CONFIG.collections.products).doc(id).set(finalProduct);
                Notification.success('Produto cadastrado!');
            }
            Products.clearForm();
            // A renderização é automática pelo listener.
        } catch (error) {
            Notification.error('Erro ao salvar produto.'); console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save"></i> Salvar Produto`;
        }
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
            document.querySelector('#productForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
            document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
        }
    },
    remove: async (id) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            await db.collection(CONFIG.collections.products).doc(id).delete();
            Notification.success('Produto excluído.');
            // O listener cuida da renderização.
        } catch (error) {
            Notification.error('Erro ao excluir produto.'); console.error(error);
        }
    },
    clearForm() {
        document.getElementById('productForm').reset();
        state.currentEditId = null;
        document.querySelector('#productForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
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

// --- Demais módulos (Sales, Receipts, etc.) permanecem iguais ---
// Eles já se beneficiam da atualização reativa do state.clients e state.products
// que agora é feita pelos listeners.

const Sales = {
    init() {
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(this.showSuggestions, 300));
        document.getElementById('clearCart').addEventListener('click', this.clearCart);
        document.getElementById('finalizeSale').addEventListener('click', this.finalize);
        document.getElementById('salePaymentMethod').addEventListener('change', this.toggleInstallments);
    },
    load() {
        this.populateClientSelect('saleClient');
        this.clearCart();
    },
    populateClientSelect(selectId) {
        const select = document.getElementById(selectId);
        const currentValue = select.value; // Salva o valor atual para tentar manter a seleção
        select.innerHTML = '<option value="">Consumidor Final</option>';
        state.clients.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        select.value = currentValue; // Tenta restaurar o valor
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
            suggestionsEl.innerHTML = filtered.slice(0, 5).map(p => `
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
        if (!item || !product) return;

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
        const finalizeBtn = document.getElementById('finalizeSale');
        if (finalizeBtn.disabled) return;

        const paymentMethod = document.getElementById('salePaymentMethod').value;
        const clientId = document.getElementById('saleClient').value;
        
        if (paymentMethod === 'Crediário' && !clientId) {
            return Notification.error('Selecione um cliente para vendas no crediário.');
        }

        finalizeBtn.disabled = true;
        finalizeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Finalizando...`;

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
        batch.set(db.collection(CONFIG.collections.sales).doc(saleId), saleData);

        for (const item of state.cart) {
            const productRef = db.collection(CONFIG.collections.products).doc(item.id);
            batch.update(productRef, { quantity: firebase.firestore.FieldValue.increment(-item.quantity) });
        }
        
        if (paymentMethod === 'Crediário') {
            const installments = parseInt(document.getElementById('saleInstallments').value) || 1;
            const installmentValue = total / installments;
            let dueDate = new Date();

            for (let i = 1; i <= installments; i++) {
                dueDate.setMonth(dueDate.getMonth() + 1);
                const receivableId = Utils.generateUUID();
                const receivableData = {
                    id: receivableId, clientId, saleId,
                    description: `Parcela ${i}/${installments} da Venda #${saleId.substring(0,6)}`,
                    value: installmentValue, dueDate: dueDate.toISOString(), status: 'Pendente',
                    createdAt: new Date().toISOString()
                };
                batch.set(db.collection(CONFIG.collections.receivables).doc(receivableId), receivableData);
            }
        } else {
            const cashFlowId = Utils.generateUUID();
            const cashFlowData = {
                id: cashFlowId, date: new Date().toISOString(), type: 'entrada',
                description: `Venda #${saleId.substring(0, 6)} (${paymentMethod})`,
                value: total, source: 'venda', sourceId: saleId,
            };
            batch.set(db.collection(CONFIG.collections.cashFlow).doc(cashFlowId), cashFlowData);
        }
        
        try {
            await batch.commit();
            Notification.success('Venda finalizada com sucesso!');
            Sales.clearCart();
            await App.loadAllData(); // Recarrega dados não-reativos
        } catch (error) {
            Notification.error('Erro ao finalizar a venda.');
            console.error(error);
        } finally {
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = `<i class="fas fa-check"></i> Finalizar Venda`;
        }
    },
};

const Receipts = {
    init() {
        document.getElementById('receiptClientFilter').addEventListener('change', () => this.render(this.getFiltered()));
        document.getElementById('receiptDateFilter').addEventListener('change', () => this.render(this.getFiltered()));
        document.getElementById('clearReceiptFilters').addEventListener('click', this.clearFilters);
    },
    load() {
        // Usa o listener para carregar as vendas
        if (this.unsubscribe) return;
        this.unsubscribe = db.collection(CONFIG.collections.sales)
            .orderBy('date', 'desc')
            .onSnapshot(snapshot => {
                state.sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.render(this.getFiltered());
            }, error => {
                console.error("Erro ao carregar recibos:", error);
                Notification.error("Não foi possível carregar as vendas.");
            });

        this.populateClientSelect('receiptClientFilter');
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
            <button class="btn btn-primary mt-3" style="width:100%" onclick="Receipts.printReceipt('${sale.id}')"><i class="fas fa-file-pdf"></i> Gerar PDF</button>
        `;
        Modal.show(`Recibo da Venda #${sale.id.substring(0,6)}`, modalContent);
    },
    printReceipt(saleId) {
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const receiptElement = document.getElementById('receiptToPrint');

        doc.html(receiptElement, {
            callback: function (doc) {
                doc.save(`recibo_${CONFIG.company.name.replace(/\s/g, '_')}_${sale.id.substring(0,6)}.pdf`);
                Notification.success("Gerando PDF do recibo...");
            },
            x: 10, y: 10,
            width: 190,
            windowWidth: receiptElement.offsetWidth
        });
    }
};

const CashFlow = {
    // Código omitido para brevidade
};

const Expenses = {
    // Código omitido para brevidade
};

const Receivables = {
    // Código omitido para brevidade
};

const Reports = {
    init() { /* Lógica de inicialização de relatórios */ },
    load() { /* Lógica para carregar a página de relatórios */ }
};

const Settings = {
    // Código omitido para brevidade
};

// Inicialização Geral
document.addEventListener('DOMContentLoaded', App.init);
