// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.6 (FUNCIONAL) =====

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
    currentReport: {
        data: [],
        headers: [],
        title: '',
    },
};

// MÓDULOS DE UTILIDADES E COMPONENTES
const Utils = {
    generateUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }),
    formatCurrency: value => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0),
    formatDate: dateStr => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        // Corrige o fuso horário para exibir a data local corretamente
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date.getTime() + userTimezoneOffset));
    },
    formatDateTime: dateStr => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(date);
    },
    debounce: (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },
    getToday: () => new Date().toISOString().split('T')[0],
    populateSelect: (selectId, data, valueField, textField, defaultOptionText) => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
            data.sort((a, b) => a[textField].localeCompare(b[textField])).forEach(item => {
                select.innerHTML += `<option value="${item[valueField]}">${item[textField]}</option>`;
            });
            select.value = currentValue;
        }
    },
    exportToCSV: (filename, headers, data) => {
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], {
            type: 'text/csv'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        Notification.success('Exportação CSV concluída!');
    },
    exportToPDF: (title, head, body) => {
        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Relatório gerado em: ${Utils.formatDateTime(new Date().toISOString())}`, 14, 29);

        doc.autoTable({
            head: [head],
            body: body,
            startY: 35,
            theme: 'grid',
            headStyles: {
                fillColor: [59, 130, 246]
            } // --primary-color
        });

        doc.save(`${title.replace(/ /g, '_').toLowerCase()}_${Utils.getToday()}.pdf`);
        Notification.success('Exportação PDF concluída!');
    },
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
            await pageLoaders[page]();
        }
    }
};

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
        Object.keys(state).forEach(key => state[key] = Array.isArray(state[key]) ? [] : state[key]);
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
        await Navigation.navigateTo(lastPage);
    }
};

const App = {
    async loadAllData() {
        try {
            const collections = Object.keys(CONFIG.collections);
            const promises = collections.map(col => db.collection(col).get());
            const snapshots = await Promise.all(promises);

            snapshots.forEach((snapshot, index) => {
                const collectionName = collections[index];
                state[collectionName] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
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

        console.log('SGI - Flor de Maria v3.6 (FUNCIONAL) iniciado!');
    }
};

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
        
        if (Object.keys(data).length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "16px 'Segoe UI'";
            ctx.fillStyle = 'var(--text-muted)';
            ctx.textAlign = 'center';
            ctx.fillText('Nenhuma venda este mês para exibir o gráfico.', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: Object.values(data),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'],
                    borderColor: 'var(--surface-bg)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94A3B8'
                        }
                    }
                },
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
        container.innerHTML = overdue
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(account => {
                const client = state.clients.find(c => c.id === account.clientId);
                const daysOverdue = Math.floor((today - new Date(account.dueDate)) / (1000 * 60 * 60 * 24));
                return `
                    <div class="overdue-item">
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
        document.getElementById('clearClientForm').addEventListener('click', () => this.clearForm());
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('exportClients').addEventListener('click', this.exportToCSV);
    },
    async load() {
        this.render();
    },
    getFiltered() {
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
        if (!searchTerm) return state.clients;
        return state.clients.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            (c.phone && c.phone.includes(searchTerm))
        );
    },
    render() {
        const tbody = document.getElementById('clientsTableBody');
        document.getElementById('clientCount').textContent = `${state.clients.length} clientes cadastrados`;
        const clientsToRender = this.getFiltered();

        if (clientsToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = clientsToRender
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(client => {
                const purchaseCount = state.sales.filter(s => s.clientId === client.id).length;
                return `
                    <tr>
                        <td data-label="Nome">${client.name}</td>
                        <td data-label="Telefone">${client.phone || 'N/A'}</td>
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
        if (!name) return Notification.error('O nome é obrigatório.');

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

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
        } finally {
            submitButton.disabled = false;
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
            document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar Cliente';
        }
    },
    remove: async (id) => {
        const clientSales = state.sales.some(s => s.clientId === id);
        if (clientSales) {
            return Notification.error('Não é possível excluir um cliente com histórico de vendas.');
        }
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação é irreversível.')) return;
        try {
            await db.collection(CONFIG.collections.clients).doc(id).delete();
            Notification.success('Cliente excluído com sucesso.');
            await App.loadAllData();
            await Clients.load();
        } catch (error) {
            Notification.error('Erro ao excluir cliente.');
            console.error(error);
        }
    },
    clearForm() {
        document.getElementById('clientForm').reset();
        state.currentEditId = null;
        document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
    },
    viewHistory(id) {
        const client = state.clients.find(c => c.id === id);
        const clientSales = state.sales.filter(s => s.clientId === id).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!client) return;

        let content = `<p>Histórico de compras para <strong>${client.name}</strong>.</p><br>`;
        if (clientSales.length === 0) {
            content += '<p>Este cliente ainda não realizou compras.</p>';
        } else {
            const tableRows = clientSales.map(sale =>
                `<tr>
                    <td>${Utils.formatDate(sale.date)}</td>
                    <td>${sale.items.map(i => `${i.quantity}x ${i.name}`).join('<br>')}</td>
                    <td>${Utils.formatCurrency(sale.total)}</td>
                    <td><button class="btn btn-secondary btn-sm" onclick="Receipts.generateReceiptPDF('${sale.id}')"><i class="fas fa-file-pdf"></i></button></td>
                </tr>`
            ).join('');

            content += `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr><th>Data</th><th>Itens</th><th>Total</th><th>Recibo</th></tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
        }
        Modal.show(`Histórico de ${client.name}`, content);
    },
    exportToCSV() {
        const headers = ['id', 'name', 'phone', 'createdAt'];
        const data = state.clients.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            createdAt: Utils.formatDate(c.createdAt)
        }));
        Utils.exportToCSV('clientes_flor_de_maria.csv', headers, data);
    }
};

const Products = {
    init() {
        document.getElementById('productForm').addEventListener('submit', this.save);
        document.getElementById('clearProductForm').addEventListener('click', () => this.clearForm());
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('exportProducts').addEventListener('click', this.exportToCSV);
    },
    async load() {
        this.render();
        this.updateStats();
    },
    getFiltered() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        if (!searchTerm) return state.products;
        return state.products.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.refCode.toLowerCase().includes(searchTerm)
        );
    },
    render() {
        const tbody = document.getElementById('productsTableBody');
        const productsToRender = this.getFiltered();

        if (productsToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px;">Nenhum produto encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = productsToRender
            .sort((a, b) => a.name.localeCompare(b.name))
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
        const newProduct = {
            refCode: document.getElementById('productRefCode').value.trim(),
            name: document.getElementById('productName').value.trim(),
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            costPrice: parseFloat(document.getElementById('productCostPrice').value) || 0,
            salePrice: parseFloat(document.getElementById('productSalePrice').value) || 0,
        };

        if (!newProduct.refCode || !newProduct.name) return Notification.error('Código e Nome são obrigatórios.');

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

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
            Notification.error('Erro ao salvar produto.');
            console.error(error);
        } finally {
            submitButton.disabled = false;
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
            document.querySelector('#productForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar Produto';
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
            Notification.error('Erro ao excluir produto.');
            console.error(error);
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
    exportToCSV() {
        const headers = ['refCode', 'name', 'quantity', 'costPrice', 'salePrice'];
        Utils.exportToCSV('estoque_flor_de_maria.csv', headers, state.products);
    }
};

const Sales = {
    init() {
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(this.showSuggestions, 300));
        document.getElementById('clearCart').addEventListener('click', () => this.clearCart());
        document.getElementById('finalizeSale').addEventListener('click', this.finalize);
        document.getElementById('salePaymentMethod').addEventListener('change', this.toggleInstallments);
    },
    async load() {
        Utils.populateSelect('saleClient', state.clients, 'id', 'name', 'Consumidor Final');
        this.clearCart();
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
            suggestionsEl.innerHTML = '<div class="suggestion-item text-muted p-2">Nenhum produto encontrado.</div>';
        } else {
            suggestionsEl.innerHTML = filtered.slice(0, 10).map(p => `
                <div class="suggestion-item" onclick="Sales.addToCart('${p.id}')">
                    <strong>${p.name}</strong> (${p.refCode})<br>
                    <small>Estoque: ${p.quantity} | Preço: ${Utils.formatCurrency(p.salePrice)}</small>
                </div>
            `).join('');
        }
        suggestionsEl.classList.remove('hidden');
    },
    addToCart(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product || product.quantity <= 0) {
             Notification.warning('Produto esgotado ou inválido.');
             return;
        }

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
        document.getElementById('productSearchPDV').focus();
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
                    <td data-label="Produto" style="white-space:normal;">${item.name}</td>
                    <td data-label="Preço Unit.">${Utils.formatCurrency(item.salePrice)}</td>
                    <td data-label="Qtd.">
                        <div class="quantity-control">
                            <button class="btn btn-secondary btn-sm" onclick="Sales.updateQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="btn btn-secondary btn-sm" onclick="Sales.updateQuantity('${item.id}', 1)">+</button>
                        </div>
                    </td>
                    <td data-label="Subtotal">${Utils.formatCurrency(subtotal)}</td>
                    <td data-label="Ações"><button class="btn btn-danger btn-sm" onclick="Sales.removeFromCart('${item.id}')" title="Remover"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        }).join('');

        subtotalEl.textContent = Utils.formatCurrency(total);
        totalEl.textContent = Utils.formatCurrency(total);
        finalizeBtn.disabled = false;
    },
    updateQuantity(productId, change) {
        const item = state.cart.find(i => i.id === productId);
        const productInStock = state.products.find(p => p.id === productId);
        if (!item || !productInStock) return;

        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
        } else if (newQuantity > productInStock.quantity) {
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
        document.getElementById('saleClient').value = '';
        document.getElementById('salePaymentMethod').value = 'Dinheiro';
        document.getElementById('installmentsGroup').classList.add('hidden');
    },
    toggleInstallments(e) {
        const installmentsGroup = document.getElementById('installmentsGroup');
        installmentsGroup.classList.toggle('hidden', e.target.value !== 'Crediário');
    },
    finalize: async () => {
        const paymentMethod = document.getElementById('salePaymentMethod').value;
        const clientId = document.getElementById('saleClient').value;
        const finalizeBtn = document.getElementById('finalizeSale');

        if (paymentMethod === 'Crediário' && !clientId) {
            return Notification.error('Selecione um cliente para vendas no crediário.');
        }
        if (state.cart.length === 0) {
            return Notification.warning('O carrinho está vazio.');
        }

        finalizeBtn.disabled = true;
        finalizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        const saleId = Utils.generateUUID();
        const total = state.cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
        const totalCost = state.cart.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);

        const saleData = {
            id: saleId,
            date: new Date().toISOString(),
            clientId: clientId || null,
            clientName: state.clients.find(c => c.id === clientId)?.name || 'Consumidor Final',
            items: state.cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.salePrice, cost: i.costPrice })),
            total,
            totalCost,
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
                    description: `Parcela ${i}/${installments} da Venda #${saleId.substring(0, 6)}`,
                    value: installmentValue,
                    dueDate: new Date(dueDate).toISOString().split('T')[0],
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
            Receipts.generateReceiptPDF(saleId, true); // Pergunta se quer imprimir
            Sales.clearCart();
            await App.loadAllData();
            await Sales.load();
        } catch (error) {
            Notification.error('Erro ao finalizar a venda.');
            console.error(error);
        } finally {
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar Venda';
        }
    },
};

const Receipts = {
    init() {
        document.getElementById('receiptClientFilter').addEventListener('change', () => this.render());
        document.getElementById('receiptDateFilter').addEventListener('change', () => this.render());
        document.getElementById('clearReceiptFilters').addEventListener('click', () => {
            document.getElementById('receiptClientFilter').value = '';
            document.getElementById('receiptDateFilter').value = '';
            this.render();
        });
    },
    async load() {
        Utils.populateSelect('receiptClientFilter', state.clients, 'id', 'name', 'Todos os Clientes');
        this.render();
    },
    getFiltered() {
        const clientId = document.getElementById('receiptClientFilter').value;
        const dateFilter = document.getElementById('receiptDateFilter').value;

        return state.sales.filter(s => {
            const clientMatch = !clientId || s.clientId === clientId;
            const dateMatch = !dateFilter || s.date.startsWith(dateFilter);
            return clientMatch && dateMatch;
        });
    },
    render() {
        const tbody = document.getElementById('receiptsTableBody');
        const salesToRender = this.getFiltered();

        if (salesToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">Nenhuma venda encontrada para os filtros selecionados.</td></tr>';
            return;
        }

        tbody.innerHTML = salesToRender
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(s => `
                <tr>
                    <td data-label="ID da Venda">#${s.id.substring(0, 6)}</td>
                    <td data-label="Data">${Utils.formatDate(s.date)}</td>
                    <td data-label="Cliente">${s.clientName}</td>
                    <td data-label="Total">${Utils.formatCurrency(s.total)}</td>
                    <td data-label="Pagamento">${s.paymentMethod}</td>
                    <td data-label="Ações">
                        <button class="btn btn-secondary btn-sm" onclick="Receipts.generateReceiptPDF('${s.id}')" title="Gerar Recibo PDF"><i class="fas fa-file-pdf"></i></button>
                    </td>
                </tr>
            `).join('');
    },
    generateReceiptPDF(saleId, askToPrint = false) {
        const sale = state.sales.find(s => s.id === saleId);
        if (!sale) return Notification.error("Venda não encontrada.");

        if (askToPrint && !confirm("Venda finalizada. Deseja imprimir o recibo?")) {
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(CONFIG.company.name, 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(CONFIG.company.address, 105, 27, { align: 'center' });
        doc.text(`CNPJ: ${CONFIG.company.cnpj} | Telefone: ${CONFIG.company.phone}`, 105, 32, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(20, 38, 190, 38);

        // Informações da Venda
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RECIBO DE VENDA", 20, 48);
        doc.setFont("helvetica", "normal");
        doc.text(`ID da Venda: #${sale.id.substring(0, 8)}`, 190, 48, { align: 'right' });
        doc.text(`Data: ${Utils.formatDateTime(sale.date)}`, 190, 55, { align: 'right' });
        
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, 55);
        doc.setFont("helvetica", "normal");
        doc.text(sale.clientName, 38, 55);
        
        doc.line(20, 62, 190, 62);

        // Tabela de Itens
        const tableBody = sale.items.map(item => [
            item.name,
            item.quantity,
            Utils.formatCurrency(item.price),
            Utils.formatCurrency(item.price * item.quantity)
        ]);

        doc.autoTable({
            startY: 68,
            head: [['Produto', 'Qtd.', 'Preço Unit.', 'Subtotal']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59] },
        });

        // Rodapé com Totais
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Total:", 140, finalY);
        doc.text(Utils.formatCurrency(sale.total), 190, finalY, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Método de Pagamento: ${sale.paymentMethod}`, 140, finalY + 7);

        doc.save(`recibo_${sale.id.substring(0, 6)}.pdf`);
        Notification.success('Recibo gerado com sucesso!');
    }
};

const CashFlow = {
     init() {
        document.getElementById('cashFlowForm').addEventListener('submit', this.saveManual);
        document.getElementById('clearCashFlowForm').addEventListener('click', this.clearForm);
        document.getElementById('cashFlowSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('exportCashFlow').addEventListener('click', this.exportToCSV);
        document.getElementById('cashFlowDate').value = Utils.getToday();
    },
    async load() {
        this.render();
        this.updateSummary();
    },
    getFiltered() {
        const searchTerm = document.getElementById('cashFlowSearch').value.toLowerCase();
        if (!searchTerm) return state.cashFlow;
        return state.cashFlow.filter(c => c.description.toLowerCase().includes(searchTerm));
    },
    render() {
        const tbody = document.getElementById('cashFlowTableBody');
        const cashFlowToRender = this.getFiltered();

        if (cashFlowToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum lançamento encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = cashFlowToRender
            .sort((a,b) => new Date(b.date) - new Date(a.date))
            .map(c => `
            <tr>
                <td data-label="Data">${Utils.formatDate(c.date)}</td>
                <td data-label="Tipo"><span class="badge ${c.type === 'entrada' ? 'badge-success' : 'badge-danger'}">${c.type}</span></td>
                <td data-label="Descrição" style="white-space:normal;">${c.description}</td>
                <td data-label="Valor" style="color:${c.type === 'entrada' ? 'var(--accent-color)' : 'var(--danger-color)'}">${Utils.formatCurrency(c.value)}</td>
                <td data-label="Ações">
                    ${!c.source ? `<button class="btn btn-danger btn-sm" onclick="CashFlow.remove('${c.id}')" title="Excluir Lançamento Manual"><i class="fas fa-trash"></i></button>` : `<span class="text-muted">Automático</span>`}
                </td>
            </tr>
        `).join('');
    },
    updateSummary() {
        const totalEntradas = state.cashFlow.filter(c => c.type === 'entrada').reduce((acc, c) => acc + c.value, 0);
        const totalSaidas = state.cashFlow.filter(c => c.type === 'saida').reduce((acc, c) => acc + c.value, 0);
        const saldoAtual = totalEntradas - totalSaidas;

        document.getElementById('totalEntradas').textContent = Utils.formatCurrency(totalEntradas);
        document.getElementById('totalSaidas').textContent = Utils.formatCurrency(totalSaidas);
        document.getElementById('saldoAtual').textContent = Utils.formatCurrency(saldoAtual);
        document.getElementById('saldoAtual').style.color = saldoAtual >= 0 ? 'var(--accent-color)' : 'var(--danger-color)';
    },
    saveManual: async (e) => {
        e.preventDefault();
        const data = {
            id: Utils.generateUUID(),
            type: document.getElementById('cashFlowType').value,
            description: document.getElementById('cashFlowDescription').value.trim(),
            value: parseFloat(document.getElementById('cashFlowValue').value),
            date: document.getElementById('cashFlowDate').value,
            source: null, // indica que é manual
        };
        
        if (!data.description || !data.value || !data.date) {
            return Notification.error('Todos os campos são obrigatórios.');
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            await db.collection(CONFIG.collections.cashFlow).doc(data.id).set(data);
            Notification.success('Lançamento salvo com sucesso!');
            CashFlow.clearForm();
            await App.loadAllData();
            await CashFlow.load();
        } catch(error) {
            Notification.error('Erro ao salvar lançamento.');
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    },
    remove: async(id) => {
        if (!confirm('Tem certeza que deseja remover este lançamento manual?')) return;
        try {
            await db.collection(CONFIG.collections.cashFlow).doc(id).delete();
            Notification.success('Lançamento removido.');
            await App.loadAllData();
            await CashFlow.load();
        } catch (error) {
            Notification.error('Erro ao remover lançamento.');
            console.error(error);
        }
    },
    clearForm() {
        document.getElementById('cashFlowForm').reset();
        document.getElementById('cashFlowDate').value = Utils.getToday();
    },
    exportToCSV() {
        const headers = ['id', 'date', 'type', 'description', 'value'];
        const data = state.cashFlow.map(item => ({
            ...item,
            date: Utils.formatDate(item.date)
        }));
        Utils.exportToCSV('fluxo_caixa_flor_de_maria.csv', headers, data);
    }
};

const Expenses = {
    init() {
        document.getElementById('expenseForm').addEventListener('submit', this.save);
        document.getElementById('clearExpenseForm').addEventListener('click', this.clearForm);
        document.getElementById('expenseSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('expenseFilterCategory').addEventListener('change', () => this.render());
        document.getElementById('exportExpenses').addEventListener('click', this.exportToCSV);
        document.getElementById('expenseDate').value = Utils.getToday();
    },
    async load() {
        this.updateSummary();
        this.populateCategoryFilter();
        this.render();
    },
    getFiltered() {
        const searchTerm = document.getElementById('expenseSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('expenseFilterCategory').value;
        
        return state.expenses.filter(e => {
            const searchMatch = !searchTerm || e.description.toLowerCase().includes(searchTerm);
            const categoryMatch = !categoryFilter || e.category === categoryFilter;
            return searchMatch && categoryMatch;
        });
    },
    render() {
        const tbody = document.getElementById('expensesTableBody');
        const expensesToRender = this.getFiltered();
        
        if (expensesToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhuma despesa encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = expensesToRender
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(e => `
                <tr>
                    <td data-label="Data">${Utils.formatDate(e.date)}</td>
                    <td data-label="Descrição">${e.description}</td>
                    <td data-label="Categoria">${e.category}</td>
                    <td data-label="Valor">${Utils.formatCurrency(e.value)}</td>
                    <td data-label="Ações">
                        <button class="btn btn-danger btn-sm" onclick="Expenses.remove('${e.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
    },
    save: async (e) => {
        e.preventDefault();
        const expenseData = {
            id: Utils.generateUUID(),
            description: document.getElementById('expenseDescription').value.trim(),
            category: document.getElementById('expenseCategory').value,
            value: parseFloat(document.getElementById('expenseValue').value),
            date: document.getElementById('expenseDate').value,
        };

        if (!expenseData.description || !expenseData.category || !expenseData.value || !expenseData.date) {
            return Notification.error('Todos os campos são obrigatórios.');
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const batch = db.batch();
            
            // Salva a despesa
            batch.set(db.collection(CONFIG.collections.expenses).doc(expenseData.id), expenseData);

            // Cria o lançamento no fluxo de caixa
            const cashFlowData = {
                id: Utils.generateUUID(),
                date: expenseData.date,
                type: 'saida',
                description: `Despesa: ${expenseData.description}`,
                value: expenseData.value,
                source: 'despesa',
                sourceId: expenseData.id,
            };
            batch.set(db.collection(CONFIG.collections.cashFlow).doc(cashFlowData.id), cashFlowData);

            await batch.commit();
            Notification.success('Despesa registrada com sucesso!');
            this.clearForm();
            await App.loadAllData();
            await this.load();

        } catch (error) {
            Notification.error('Erro ao registrar despesa.');
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    },
    remove: async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta despesa? Isso também removerá o lançamento do fluxo de caixa.')) return;
        try {
            const batch = db.batch();
            
            // Remove a despesa
            batch.delete(db.collection(CONFIG.collections.expenses).doc(id));
            
            // Remove o lançamento do fluxo de caixa associado
            const cashFlowEntry = state.cashFlow.find(cf => cf.sourceId === id && cf.source === 'despesa');
            if (cashFlowEntry) {
                batch.delete(db.collection(CONFIG.collections.cashFlow).doc(cashFlowEntry.id));
            }
            
            await batch.commit();
            Notification.success('Despesa excluída com sucesso.');
            await App.loadAllData();
            await this.load();
            await CashFlow.load(); // Recarrega o fluxo de caixa também
        } catch (error) {
            Notification.error('Erro ao excluir despesa.');
            console.error(error);
        }
    },
    clearForm() {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').value = Utils.getToday();
    },
    updateSummary() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthly = state.expenses
            .filter(e => { const d = new Date(e.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear;})
            .reduce((acc, e) => acc + e.value, 0);
        
        const yearly = state.expenses
            .filter(e => new Date(e.date).getFullYear() === currentYear)
            .reduce((acc, e) => acc + e.value, 0);
        
        document.getElementById('totalExpensesMonth').textContent = Utils.formatCurrency(monthly);
        document.getElementById('totalExpensesYear').textContent = Utils.formatCurrency(yearly);
    },
    populateCategoryFilter() {
        const categories = [...new Set(state.expenses.map(e => e.category))];
        const select = document.getElementById('expenseFilterCategory');
        const currentVal = select.value;
        select.innerHTML = '<option value="">Todas as categorias</option>';
        categories.sort().forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        select.value = currentVal;
    },
    exportToCSV() {
        const headers = ['id', 'date', 'description', 'category', 'value'];
        const data = this.getFiltered().map(item => ({...item, date: Utils.formatDate(item.date)}));
        Utils.exportToCSV('despesas_flor_de_maria.csv', headers, data);
    }
};

const Receivables = {
    init() {
        document.getElementById('receivableForm').addEventListener('submit', this.saveManual);
        document.getElementById('clearReceivableForm').addEventListener('click', this.clearForm);
        document.getElementById('receivableSearch').addEventListener('input', Utils.debounce(() => this.render(), 300));
        document.getElementById('receivableFilterStatus').addEventListener('change', () => this.render());
        document.getElementById('exportReceivables').addEventListener('click', this.exportToCSV);
    },
    async load() {
        await this.updateStatuses();
        Utils.populateSelect('receivableClient', state.clients, 'id', 'name', 'Selecione um cliente');
        this.render();
        this.updateSummary();
    },
    getFiltered() {
        const searchTerm = document.getElementById('receivableSearch').value.toLowerCase();
        const statusFilter = document.getElementById('receivableFilterStatus').value;
        const clients = state.clients;

        return state.receivables.filter(r => {
            const client = clients.find(c => c.id === r.clientId);
            const searchMatch = !searchTerm || r.description.toLowerCase().includes(searchTerm) || (client && client.name.toLowerCase().includes(searchTerm));
            const statusMatch = !statusFilter || r.status === statusFilter;
            return searchMatch && statusMatch;
        });
    },
    render() {
        const tbody = document.getElementById('receivablesTableBody');
        const receivablesToRender = this.getFiltered();
        
        if (receivablesToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">Nenhuma conta a receber encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = receivablesToRender
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
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
                            ${r.status !== 'Pago' ? `<button class="btn btn-primary btn-sm" onclick="Receivables.markAsPaid('${r.id}')" title="Marcar como Pago"><i class="fas fa-check"></i> Pagar</button>` : `<span class="text-muted">Recebido</span>`}
                        </td>
                    </tr>
                `;
            }).join('');
    },
    markAsPaid: async (id) => {
        if (!confirm('Confirmar recebimento desta conta?')) return;

        const receivable = state.receivables.find(r => r.id === id);
        if (!receivable) return Notification.error('Conta não encontrada.');
        
        const batch = db.batch();
        const paidAtDate = new Date().toISOString();
        
        // Atualiza a conta a receber
        batch.update(db.collection(CONFIG.collections.receivables).doc(id), { status: 'Pago', paidAt: paidAtDate });
        
        // Adiciona ao fluxo de caixa
        const cashFlowData = {
            id: Utils.generateUUID(),
            date: paidAtDate,
            type: 'entrada',
            description: `Recebimento: ${receivable.description}`,
            value: receivable.value,
            source: 'recebivel',
            sourceId: id,
        };
        batch.set(db.collection(CONFIG.collections.cashFlow).doc(cashFlowData.id), cashFlowData);

        try {
            await batch.commit();
            Notification.success('Conta marcada como paga!');
            await App.loadAllData();
            await this.load();
            await CashFlow.load(); // Recarrega o fluxo de caixa
        } catch (error) {
            Notification.error('Erro ao registrar pagamento.');
            console.error(error);
        }
    },
    async updateStatuses() {
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Final do dia
        const batch = db.batch();
        let hasChanges = false;

        state.receivables.forEach(r => {
            if (r.status === 'Pendente' && new Date(r.dueDate) < today) {
                batch.update(db.collection(CONFIG.collections.receivables).doc(r.id), { status: 'Vencido' });
                hasChanges = true;
            }
        });

        if (hasChanges) {
            try {
                await batch.commit();
                console.log("Status de contas vencidas atualizados.");
                await App.loadAllData(); // Recarrega dados após a atualização
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
            const now = new Date();
            return r.status === 'Pago' && paidDate && paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
        }).reduce((acc, r) => acc + r.value, 0);

        document.getElementById('totalReceivablesPending').textContent = Utils.formatCurrency(pending);
        document.getElementById('totalReceivablesOverdue').textContent = Utils.formatCurrency(overdue);
        document.getElementById('totalReceivablesPaid').textContent = Utils.formatCurrency(paidThisMonth);
    },
    saveManual: async (e) => {
        e.preventDefault();
        const data = {
            id: Utils.generateUUID(),
            clientId: document.getElementById('receivableClient').value,
            description: document.getElementById('receivableDescription').value.trim(),
            value: parseFloat(document.getElementById('receivableValue').value),
            dueDate: document.getElementById('receivableDueDate').value,
            status: 'Pendente',
            createdAt: new Date().toISOString()
        };

        if (!data.clientId || !data.description || !data.value || !data.dueDate) {
            return Notification.error('Todos os campos são obrigatórios.');
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            await db.collection(CONFIG.collections.receivables).doc(data.id).set(data);
            Notification.success('Conta manual cadastrada!');
            this.clearForm();
            await App.loadAllData();
            await this.load();
        } catch (error) {
            Notification.error('Erro ao cadastrar conta.');
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    },
    clearForm() {
        document.getElementById('receivableForm').reset();
    },
    exportToCSV() {
        const headers = ['clientName', 'description', 'value', 'dueDate', 'status'];
        const data = this.getFiltered().map(r => ({
            clientName: state.clients.find(c => c.id === r.clientId)?.name || 'N/A',
            description: r.description,
            value: r.value,
            dueDate: Utils.formatDate(r.dueDate),
            status: r.status
        }));
        Utils.exportToCSV('contas_receber_flor_de_maria.csv', headers, data);
    }
};

const Reports = {
    chart: null,
    init() {
        document.getElementById('generateReport').addEventListener('click', this.generateReport);
        document.getElementById('exportReportPDF').addEventListener('click', this.exportPDF);
        document.getElementById('exportReportCSV').addEventListener('click', this.exportCSV);
        
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        document.getElementById('reportStartDate').value = firstDayOfMonth;
        document.getElementById('reportEndDate').value = Utils.getToday();
    },
    async load() {
        // Limpa a área de resultados ao carregar a página
        document.getElementById('reportResultContainer').classList.add('hidden');
    },
    generateReport: async () => {
        const type = document.getElementById('reportType').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!startDate || !endDate) {
            return Notification.error('Por favor, selecione as datas inicial e final.');
        }
        
        document.getElementById('reportResultContainer').classList.remove('hidden');
        
        let reportData = [];
        let summary = {};
        let highlights = [];
        let chartData = {};
        let tableHeaders = [];
        let tableRows = [];
        let title = '';

        const filteredSales = state.sales.filter(s => new Date(s.date) >= new Date(startDate) && new Date(s.date) <= new Date(endDate + 'T23:59:59'));
        const filteredExpenses = state.expenses.filter(e => new Date(e.date) >= new Date(startDate) && new Date(e.date) <= new Date(endDate + 'T23:59:59'));

        switch (type) {
            case 'vendas':
                title = "Relatório de Vendas";
                summary = this.getSalesSummary(filteredSales);
                highlights = this.getTopSellingProducts(filteredSales);
                chartData = this.getSalesOverTimeChart(filteredSales, startDate, endDate);
                tableHeaders = ['Data', 'Cliente', 'Itens', 'Pagamento', 'Total'];
                tableRows = filteredSales.map(s => [Utils.formatDate(s.date), s.clientName, s.items.length, s.paymentMethod, Utils.formatCurrency(s.total)]);
                state.currentReport.data = filteredSales.map(s => ({ Data: Utils.formatDate(s.date), Cliente: s.clientName, Itens: s.items.length, Pagamento: s.paymentMethod, Total: s.total }));
                break;

            case 'financeiro':
                title = "Relatório Financeiro (DRE)";
                summary = this.getFinancialSummary(filteredSales, filteredExpenses);
                highlights = this.getTopExpenseCategories(filteredExpenses);
                chartData = this.getRevenueVsExpenseChart(filteredSales, filteredExpenses, startDate, endDate);
                tableHeaders = ['Data', 'Tipo', 'Descrição', 'Valor'];
                const combined = [
                    ...filteredSales.map(s => ({ date: s.date, type: 'Receita', description: `Venda #${s.id.substring(0,6)}`, value: s.total})),
                    ...filteredExpenses.map(e => ({ date: e.date, type: 'Despesa', description: e.description, value: -e.value}))
                ].sort((a,b) => new Date(a.date) - new Date(b.date));
                tableRows = combined.map(item => [Utils.formatDate(item.date), item.type, item.description, Utils.formatCurrency(item.value)]);
                state.currentReport.data = combined.map(item => ({ Data: Utils.formatDate(item.date), Tipo: item.type, Descrição: item.description, Valor: item.value }));
                break;
            
            // Outros cases (produtos, clientes, etc.) podem ser adicionados aqui seguindo o mesmo padrão.
            default:
                 Notification.warning('Tipo de relatório não implementado.');
                 document.getElementById('reportResultContainer').classList.add('hidden');
                 return;
        }
        
        state.currentReport.title = title;
        state.currentReport.headers = tableHeaders;

        this.renderSummary(summary);
        this.renderHighlights(highlights, type);
        this.renderChart(chartData);
        this.renderTable(tableHeaders, tableRows);
    },
    
    // Métodos de Geração de Dados para Relatórios
    getSalesSummary(sales) {
        const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
        const avgTicket = totalRevenue / (sales.length || 1);
        return {
            'Receita Total': Utils.formatCurrency(totalRevenue),
            'Total de Vendas': sales.length,
            'Ticket Médio': Utils.formatCurrency(avgTicket),
            'Total de Itens Vendidos': sales.reduce((acc, s) => acc + s.items.reduce((iAcc, i) => iAcc + i.quantity, 0), 0),
        };
    },
    getFinancialSummary(sales, expenses) {
        const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
        const totalCost = sales.reduce((acc, s) => acc + s.totalCost, 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0);
        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalExpenses;
        return {
            'Receita Bruta': Utils.formatCurrency(totalRevenue),
            'Custos de Produtos (CMV)': Utils.formatCurrency(totalCost),
            'Lucro Bruto': Utils.formatCurrency(grossProfit),
            'Despesas Operacionais': Utils.formatCurrency(totalExpenses),
            '<strong class="text-primary">Lucro Líquido</strong>': `<strong class="text-primary">${Utils.formatCurrency(netProfit)}</strong>`,
        };
    },
    getTopSellingProducts(sales) {
        const productSales = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });
        return Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5);
    },
    getTopExpenseCategories(expenses) {
        const categoryTotals = {};
        expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.value;
        });
        return Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).slice(0,5);
    },

    // Métodos de Geração de Gráficos
    getSalesOverTimeChart(sales, startDate, endDate) {
        const labels = this.getDateLabels(startDate, endDate);
        const data = labels.map(label => {
            return sales
                .filter(s => Utils.formatDate(s.date) === label)
                .reduce((acc, s) => acc + s.total, 0);
        });
        return { 
            type: 'line',
            data: { labels, datasets: [{ label: 'Vendas (R$)', data, borderColor: 'var(--primary-color)', tension: 0.1 }] },
            title: 'Vendas ao Longo do Tempo'
        };
    },
    getRevenueVsExpenseChart(sales, expenses, startDate, endDate) {
        const labels = this.getDateLabels(startDate, endDate);
        const revenueData = labels.map(label => sales.filter(s => Utils.formatDate(s.date) === label).reduce((acc, s) => acc + s.total, 0));
        const expenseData = labels.map(label => expenses.filter(e => Utils.formatDate(e.date) === label).reduce((acc, e) => acc + e.value, 0));
        
        return {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Receita (R$)', data: revenueData, backgroundColor: 'var(--accent-color)' },
                    { label: 'Despesa (R$)', data: expenseData, backgroundColor: 'var(--danger-color)' }
                ]
            },
            title: 'Receita vs. Despesas'
        };
    },
    getDateLabels(startDate, endDate) {
        const labels = [];
        let currentDate = new Date(startDate + 'T00:00:00');
        const finalDate = new Date(endDate + 'T00:00:00');
        while (currentDate <= finalDate) {
            labels.push(Utils.formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return labels;
    },

    // Métodos de Renderização
    renderSummary(summary) {
        const container = document.getElementById('reportSummaryContent');
        container.innerHTML = Object.entries(summary).map(([key, value]) => `
            <div class="text-center">
                <div class="stat-value">${value}</div>
                <div class="stat-label">${key}</div>
            </div>
        `).join('');
    },
    renderHighlights(highlights, type) {
        const container = document.getElementById('topItemsList');
        const titleEl = document.getElementById('reportHighlightsTitle');
        const title = type === 'vendas' ? 'Produtos Mais Vendidos' : 'Principais Despesas';
        titleEl.innerHTML = `<i class="fas fa-trophy"></i> ${title}`;
        
        if(highlights.length === 0){
            container.innerHTML = `<p class="text-center text-muted p-3">Nenhum dado para destacar.</p>`;
            return;
        }

        container.innerHTML = highlights.map(([name, value]) => `
            <div class="top-item">
                <span class="top-item-name">${name}</span>
                <span class="top-item-value">${type === 'vendas' ? value + ' un.' : Utils.formatCurrency(value)}</span>
            </div>
        `).join('');
    },
    renderChart(chartConfig) {
        const ctx = document.getElementById('reportChart').getContext('2d');
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: chartConfig.type,
            data: chartConfig.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                    x: { ticks: { color: '#94A3B8' }, grid: { display: false } }
                },
                plugins: { legend: { labels: { color: '#94A3B8' } } }
            }
        });
    },
    renderTable(headers, rows) {
        const head = document.getElementById('reportTableHead');
        const body = document.getElementById('reportTableBody');
        head.innerHTML = `<tr>${headers.map(h => `<th data-label="${h}">${h}</th>`).join('')}</tr>`;
        
        if(rows.length === 0){
            body.innerHTML = `<tr><td colspan="${headers.length}" class="text-center p-5">Nenhum dado detalhado para exibir.</td></tr>`;
            return;
        }

        body.innerHTML = rows.map(row => `<tr>${row.map((cell, index) => `<td data-label="${headers[index]}">${cell}</td>`).join('')}</tr>`).join('');
    },
    
    // Métodos de Exportação
    exportPDF() {
        const { title, headers, data } = state.currentReport;
        if (!data || data.length === 0) return Notification.warning('Gere um relatório primeiro para exportar.');
        const body = data.map(row => headers.map(header => row[header]));
        Utils.exportToPDF(title, headers, body);
    },
    exportCSV() {
        const { title, headers, data } = state.currentReport;
        if (!data || data.length === 0) return Notification.warning('Gere um relatório primeiro para exportar.');
        const filename = `${title.replace(/ /g, '_').toLowerCase()}_${Utils.getToday()}.csv`;
        Utils.exportToCSV(filename, headers, data);
    }
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

                Notification.warning("Restaurando dados... Por favor, aguarde.");

                // Apaga os dados antigos
                for (const collectionName of collections) {
                    const snapshot = await db.collection(collectionName).get();
                    const deleteBatch = db.batch();
                    snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
                    await deleteBatch.commit();
                }

                // Escreve os novos dados
                for (const collectionName of collections) {
                    if (restoredState[collectionName] && Array.isArray(restoredState[collectionName])) {
                        const writeBatch = db.batch();
                        restoredState[collectionName].forEach(item => {
                            if (!item.id) item.id = Utils.generateUUID(); // Garante que todos os itens tenham ID
                            const docRef = db.collection(collectionName).doc(item.id);
                            writeBatch.set(docRef, item);
                        });
                        await writeBatch.commit();
                    }
                }

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
            Notification.warning("Limpando todos os dados... Por favor, aguarde.");
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
