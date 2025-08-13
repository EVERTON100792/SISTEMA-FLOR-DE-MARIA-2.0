// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.5 (Correções Completas) =====

// 1. Inicialização do Firebase
const firebaseConfig = {
    // SUAS CHAVES DO FIREBASE DEVEM IR AQUI
    apiKey: "AIzaSyBUn5hALHO13M0uHtMawZg_8CmRVBhHzAk", // Mantenha sua chave real aqui
    authDomain: "sistema-flor-de-maria.firebaseapp.com",
    projectId: "sistema-flor-de-maria",
    storageBucket: "sistema-flor-de-maria.appspot.com",
    messagingSenderId: "148120762956",
    appId: "1:148120762956:web:0b1b9e9efe10407fbcd2e9"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// 2. Configurações e Estado Global
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

// 3. Módulos de Utilidades e Componentes
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

// 4. Módulo de Navegação
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
        
        // CORREÇÃO: Carrega os dados mais recentes do Firebase sempre que uma página for carregada
        await App.loadAllData();
        
        if (pageLoaders[page]) {
            await pageLoaders[page]();
        }
    }
};

// 5. Módulo de Autenticação
const Auth = {
    init() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.showApp();
            } else {
                this.showLogin();
            }
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
            console.error("Erro de login:", error);
        }
    },
    handleLogout: async () => {
        await auth.signOut();
        localStorage.removeItem(CONFIG.storageKeys.lastActivePage);
        state.cart = []; // Limpa o carrinho ao sair
        Notification.success('Você saiu do sistema.');
    },
    showLogin: () => {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appLayout').classList.add('hidden');
    },
    showApp: async () => {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appLayout').classList.remove('hidden');
        // CORREÇÃO: Garante que todos os dados sejam carregados ao iniciar o app
        await App.loadAllData();
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage) || 'dashboard';
        await Navigation.navigateTo(lastPage);
    }
};

// 6. Módulo Principal da Aplicação
const App = {
    async loadAllData() {
        try {
            const collections = Object.keys(CONFIG.collections);
            const promises = collections.map(col => db.collection(CONFIG.collections[col]).get());
            const snapshots = await Promise.all(promises);

            snapshots.forEach((snapshot, index) => {
                const collectionName = collections[index];
                state[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });
            console.log("Dados carregados com sucesso:", state);
        } catch (error) {
            console.error("Erro ao carregar todos os dados do Firebase:", error);
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

// 7. Módulos de Negócio (Clientes, Produtos, Vendas, etc.)

// MÓDULO DASHBOARD
const Dashboard = {
    chart: null,
    async load() {
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

        const monthlySales =
