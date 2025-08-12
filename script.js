// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.0 (Firebase Integration) =====

// 1. Initialize Firebase
// TODO: Substitua este objeto pela configuração do seu projeto Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyBUn5hALHO13M0uHtMawZg_8CmRVBhHzAk",
  authDomain: "sistema-flor-de-maria.firebaseapp.com",
  projectId: "sistema-flor-de-maria",
  storageBucket: "sistema-flor-de-maria.firebasestorage.app",
  messagingSenderId: "148120762956",
  appId: "1:148120762956:web:253cb554ded28a13bcd2e9"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Configurações globais
const CONFIG = {
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

// ===================================================================================
// ============================= SISTEMAS PRINCIPAIS =================================
// ===================================================================================

const Utils = {
    generateUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }),
    formatCurrency: value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
    formatDate: dateStr => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
    },
    formatDateTime: dateStr => {
        if (!dateStr) return 'N/A';
        return new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(dateStr));
    },
    getToday: () => new Date().toISOString().split('T')[0],
    async loadFromStorage(collectionName) {
        try {
            const snapshot = await db.collection(collectionName).get();
            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error(`Erro ao carregar de '${collectionName}':`, error);
            Notification.error('Erro ao carregar dados. Verifique o console.');
            return [];
        }
    },
    debounce: (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },
    downloadCSV(content, filename) {
        const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
};

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

const Modal = {
    show(title, content, actionsHtml = '') {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        const modalContent = document.querySelector('.modal-content');
        
        let actionsContainer = document.getElementById('modalActions');
        if (actionsContainer) actionsContainer.remove();
        
        if (actionsHtml) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'modalActions';
            actionsContainer.className = "flex gap-2 mt-3";
            actionsContainer.style.paddingTop = '16px';
            actionsContainer.style.borderTop = `1px solid var(--border-color)`;
            actionsContainer.innerHTML = actionsHtml;
            modalContent.appendChild(actionsContainer);
        }
        document.getElementById('modal').classList.add('show');
    },
    hide: () => document.getElementById('modal').classList.remove('show')
};

const Navigation = {
    init() {
        const sidebar = document.getElementById('sidebar');
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                if (window.innerWidth <= 800) sidebar.classList.remove('active');
                const page = link.getAttribute('data-page');
                if (page) this.navigateTo(page);
            });
        });

        const mobileToggle = document.getElementById('mobileMenuToggle');
        mobileToggle.addEventListener('click', () => sidebar.classList.toggle('active'));

        document.addEventListener('click', e => {
            if (window.innerWidth <= 800 && sidebar.classList.contains('active') && !sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    },
    async navigateTo(page) {
        try {
            if (!document.getElementById(`${page}Page`)) page = 'dashboard';
            
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
        const pageLoaders = {
            'dashboard': Dashboard.loadData,
            'clients': Clients.loadClients,
            'products': Products.loadProducts,
            'sales': Sales.initPage,
            'receipts': Receipts.initPage,
            'cashflow': CashFlow.loadEntries,
            'expenses': Expenses.loadExpenses,
            'receivables': Receivables.loadReceivables,
            'reports': Reports.initPage,
            'settings': Settings.updateBackupStats
        };
        if (pageLoaders[page]) await pageLoaders[page]();
    }
};

const Auth = {
    init() {
        document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); this.logout(); });
        auth.onAuthStateChanged(user => user ? this.showApp() : this.showLogin());
    },
    async login() {
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            Notification.success('Login realizado com sucesso!');
        } catch (error) {
            Notification.error('Email ou senha incorretos!');
        }
    },
    async logout() {
        await auth.signOut();
        localStorage.removeItem('sgi_last_active_page');
        Notification.success('Logout realizado com sucesso!');
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

const Dashboard = { /* ... Lógica do Dashboard (sem alterações) ... */ };
const Clients = { /* ... Lógica de Clientes (sem alterações) ... */ };
const Products = { /* ... Lógica de Produtos (sem alterações) ... */ };

const Sales = {
    cart: [],
    products: [],
    clients: [],

    init() {
        // PDV Elements
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(e => this.searchProducts(e.target.value), 300));
        document.getElementById('clearCart').addEventListener('click', () => this.clearCart());
        document.getElementById('finalizeSale').addEventListener('click', () => this.finalizeSale());
        document.getElementById('salePaymentMethod').addEventListener('change', e => {
            document.getElementById('installmentsGroup').classList.toggle('hidden', e.target.value !== 'Crediário');
        });
    },

    async initPage() {
        this.products = await Utils.loadFromStorage(CONFIG.collections.products);
        this.clients = await Utils.loadFromStorage(CONFIG.collections.clients);
        this.populateClientSelect();
        this.clearCart();
    },

    populateClientSelect() {
        const select = document.getElementById('saleClient');
        select.innerHTML = '<option value="">Consumidor Final</option>';
        this.clients.sort((a, b) => a.name.localeCompare(b.name)).forEach(client => {
            select.innerHTML += `<option value="${client.id}">${client.name}</option>`;
        });
    },

    searchProducts(term) {
        const suggestionsEl = document.getElementById('productSuggestions');
        if (!term) {
            suggestionsEl.classList.add('hidden');
            return;
        }

        const filtered = this.products.filter(p =>
            p.quantity > 0 && (p.name.toLowerCase().includes(term.toLowerCase()) || p.refCode.toLowerCase().includes(term.toLowerCase()))
        ).slice(0, 5);

        if (filtered.length > 0) {
            suggestionsEl.innerHTML = filtered.map(p => `
                <div class="suggestion-item p-2" onclick="Sales.addToCart('${p.id}')">
                    <strong>${p.name}</strong> (${p.refCode}) - ${Utils.formatCurrency(p.salePrice)} | Estoque: ${p.quantity}
                </div>
            `).join('');
            suggestionsEl.classList.remove('hidden');
        } else {
            suggestionsEl.classList.add('hidden');
        }
    },

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.quantity < product.quantity) {
                existingItem.quantity++;
            } else {
                Notification.warning('Quantidade máxima em estoque atingida.');
            }
        } else {
            this.cart.push({ ...product, quantity: 1 });
        }
        document.getElementById('productSearchPDV').value = '';
        document.getElementById('productSuggestions').classList.add('hidden');
        this.renderCart();
    },
    
    updateCartItem(productId, quantity) {
        const item = this.cart.find(i => i.id === productId);
        const product = this.products.find(p => p.id === productId);
        if(item && product) {
            if (quantity > product.quantity) {
                Notification.warning(`Estoque máximo para este item é ${product.quantity}.`);
                quantity = product.quantity;
            }
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
            }
        }
        this.renderCart();
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.renderCart();
    },

    renderCart() {
        const tbody = document.getElementById('cartTableBody');
        const totalEl = document.getElementById('cartTotal');
        const finalizeBtn = document.getElementById('finalizeSale');

        if (this.cart.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Carrinho vazio</td></tr>`;
            totalEl.textContent = Utils.formatCurrency(0);
            finalizeBtn.disabled = true;
            return;
        }

        let total = 0;
        tbody.innerHTML = this.cart.map(item => {
            const subtotal = item.salePrice * item.quantity;
            total += subtotal;
            return `
                <tr>
                    <td>${item.name}</td>
                    <td>${Utils.formatCurrency(item.salePrice)}</td>
                    <td>
                        <input type="number" value="${item.quantity}" min="1" onchange="Sales.updateCartItem('${item.id}', this.valueAsNumber)" class="form-input" style="width: 70px; padding: 4px;">
                    </td>
                    <td>${Utils.formatCurrency(subtotal)}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="Sales.removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        }).join('');

        totalEl.textContent = Utils.formatCurrency(total);
        finalizeBtn.disabled = false;
    },

    clearCart() {
        this.cart = [];
        document.getElementById('saleClient').value = '';
        document.getElementById('salePaymentMethod').value = 'Dinheiro';
        document.getElementById('installmentsGroup').classList.add('hidden');
        this.renderCart();
    },

    async finalizeSale() {
        const finalizeBtn = document.getElementById('finalizeSale');
        finalizeBtn.disabled = true;
        finalizeBtn.innerHTML = '<span class="loading"></span> Finalizando...';

        const clientId = document.getElementById('saleClient').value;
        const paymentMethod = document.getElementById('salePaymentMethod').value;
        
        if (paymentMethod === 'Crediário' && !clientId) {
            Notification.error('Selecione um cliente para vendas em crediário.');
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar Venda';
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
        const saleId = Utils.generateUUID();
        const saleDate = new Date().toISOString();

        const sale = {
            id: saleId,
            date: saleDate,
            clientId: clientId || null,
            items: this.cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.salePrice })),
            total,
            paymentMethod
        };

        try {
            const batch = db.batch();

            // 1. Save Sale
            const saleRef = db.collection(CONFIG.collections.sales).doc(saleId);
            batch.set(saleRef, sale);

            // 2. Update Product Stock
            for (const item of this.cart) {
                const productRef = db.collection(CONFIG.collections.products).doc(item.id);
                const newQuantity = firebase.firestore.FieldValue.increment(-item.quantity);
                batch.update(productRef, { quantity: newQuantity });
            }

            // 3. Handle Financials
            if (paymentMethod === 'Crediário') {
                const installments = parseInt(document.getElementById('saleInstallments').value) || 1;
                const installmentValue = total / installments;
                let dueDate = new Date();

                for (let i = 1; i <= installments; i++) {
                    dueDate.setMonth(dueDate.getMonth() + 1);
                    const receivableId = Utils.generateUUID();
                    const receivable = {
                        id: receivableId,
                        clientId,
                        saleId,
                        description: `Parcela ${i}/${installments} da venda ${saleId.substring(0, 4)}`,
                        value: installmentValue,
                        dueDate: dueDate.toISOString().split('T')[0],
                        status: 'Pendente', // Status will be updated to Vencido dynamically
                        createdAt: saleDate
                    };
                    const receivableRef = db.collection(CONFIG.collections.accountsReceivable).doc(receivableId);
                    batch.set(receivableRef, receivable);
                }
            } else {
                // Add to cash flow for non-credit sales
                const cashFlowId = Utils.generateUUID();
                const cashFlowEntry = {
                    id: cashFlowId,
                    date: saleDate.split('T')[0],
                    type: 'entrada',
                    description: `Venda #${saleId.substring(0, 8)}`,
                    value: total,
                    origin: 'Venda'
                };
                const cashFlowRef = db.collection(CONFIG.collections.cashFlow).doc(cashFlowId);
                batch.set(cashFlowRef, cashFlowEntry);
            }
            
            await batch.commit();

            Notification.success('Venda finalizada com sucesso!');
            await Receipts.viewReceipt(saleId); // Show receipt after sale
            await this.initPage(); // Reload products and clear cart

        } catch (error) {
            console.error("Erro ao finalizar venda:", error);
            Notification.error("Falha ao finalizar a venda. Verifique o console.");
        } finally {
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar Venda';
        }
    }
};

const Receipts = {
    sales: [],
    clients: [],

    init() {
        document.getElementById('receiptClientFilter').addEventListener('change', () => this.filterAndRender());
        document.getElementById('receiptDateFilter').addEventListener('change', () => this.filterAndRender());
    },

    async initPage() {
        this.sales = await Utils.loadFromStorage(CONFIG.collections.sales);
        this.clients = await Utils.loadFromStorage(CONFIG.collections.clients);
        this.populateClientFilter();
        this.filterAndRender();
    },

    populateClientFilter() {
        const select = document.getElementById('receiptClientFilter');
        select.innerHTML = '<option value="">Todos os Clientes</option>';
        this.clients.forEach(client => {
            select.innerHTML += `<option value="${client.id}">${client.name}</option>`;
        });
    },

    filterAndRender() {
        const clientId = document.getElementById('receiptClientFilter').value;
        const date = document.getElementById('receiptDateFilter').value;
        
        let filteredSales = this.sales;

        if (clientId) {
            filteredSales = filteredSales.filter(s => s.clientId === clientId);
        }
        if (date) {
            filteredSales = filteredSales.filter(s => s.date.startsWith(date));
        }

        this.renderTable(filteredSales);
    },

    renderTable(sales) {
        const tbody = document.getElementById('receiptsTableBody');
        if (sales.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum recibo encontrado</td></tr>`;
            return;
        }

        const clientMap = new Map(this.clients.map(c => [c.id, c.name]));
        tbody.innerHTML = sales.sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => `
            <tr>
                <td>#${sale.id.substring(0, 8)}</td>
                <td>${Utils.formatDateTime(sale.date)}</td>
                <td>${clientMap.get(sale.clientId) || 'Consumidor Final'}</td>
                <td>${Utils.formatCurrency(sale.total)}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Receipts.viewReceipt('${sale.id}')"><i class="fas fa-eye"></i> Ver</button>
                </td>
            </tr>
        `).join('');
    },
    
    async viewReceipt(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) {
            const saleDoc = await db.collection(CONFIG.collections.sales).doc(saleId).get();
            if(saleDoc.exists) this.sales.push(saleDoc.data());
            return this.viewReceipt(saleId);
        }

        const client = sale.clientId ? this.clients.find(c => c.id === sale.clientId) : null;
        
        const receiptHtml = `
            <div class="receipt-professional-container" id="receiptToPrint">
                <div class="receipt-professional-header">
                    <div>
                        <div class="receipt-logo-container"><i class="fas fa-store"></i></div>
                        <h3>${CONFIG.company.name}</h3>
                    </div>
                    <div class="receipt-company-details">
                        <p>${CONFIG.company.address}</p>
                        <p>Telefone: ${CONFIG.company.phone}</p>
                        <p>CNPJ: ${CONFIG.company.cnpj}</p>
                    </div>
                </div>

                <div class="receipt-sale-info">
                    <div class="receipt-info-block">
                        <p><span class="label">CLIENTE:</span></p>
                        <p><strong>${client ? client.name : 'Consumidor Final'}</strong></p>
                        <p>${client ? `Telefone: ${client.phone}` : ''}</p>
                    </div>
                    <div class="receipt-info-block text-right">
                        <p><span class="label">RECIBO Nº:</span> #${sale.id.substring(0, 8)}</p>
                        <p><span class="label">DATA:</span> ${Utils.formatDateTime(sale.date)}</p>
                        <p><span class="label">PAGAMENTO:</span> ${sale.paymentMethod}</p>
                    </div>
                </div>

                <table class="receipt-items-table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th class="text-center">Qtd.</th>
                            <th class="text-right">Preço Unit.</th>
                            <th class="text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">${Utils.formatCurrency(item.price)}</td>
                                <td class="text-right">${Utils.formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="receipt-summary">
                    <table>
                        <tr>
                            <td class="total-label text-right">TOTAL GERAL:</td>
                            <td class="total-value text-right">${Utils.formatCurrency(sale.total)}</td>
                        </tr>
                    </table>
                </div>

                <div class="receipt-footer">
                    Obrigado pela sua preferência!
                </div>
            </div>`;
        
        const actionsHtml = `
            <button class="btn btn-primary" onclick="Receipts.printReceipt()"><i class="fas fa-print"></i> Imprimir</button>
            <button class="btn btn-secondary" onclick="Modal.hide()">Fechar</button>
        `;

        Modal.show(`Recibo da Venda #${sale.id.substring(0,8)}`, receiptHtml, actionsHtml);
    },
    
    printReceipt() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const receiptElement = document.getElementById('receiptToPrint');
        
        doc.html(receiptElement, {
            callback: function(doc) {
                doc.save(`recibo_${new Date().getTime()}.pdf`);
            },
            x: 10,
            y: 10,
            width: 190,
            windowWidth: 800
        });
    }
};

const CashFlow = {
    currentEditId: null,

    init() {
        document.getElementById('cashFlowForm').addEventListener('submit', e => { e.preventDefault(); this.saveEntry(); });
        document.getElementById('clearCashFlowForm').addEventListener('click', () => this.clearForm());
        document.getElementById('cashFlowSearch').addEventListener('input', Utils.debounce(() => this.loadEntries(), 300));
        document.getElementById('exportCashFlow').addEventListener('click', () => this.exportToCSV());
    },

    async saveEntry() {
        const type = document.getElementById('cashFlowType').value;
        const description = document.getElementById('cashFlowDescription').value.trim();
        const value = parseFloat(document.getElementById('cashFlowValue').value);
        const date = document.getElementById('cashFlowDate').value;
        
        if (!description || !value || !date) return Notification.error('Todos os campos são obrigatórios.');

        const entry = { type, description, value, date, origin: 'Manual' };
        try {
            if (this.currentEditId) {
                await db.collection(CONFIG.collections.cashFlow).doc(this.currentEditId).update(entry);
                Notification.success('Lançamento atualizado!');
            } else {
                const newId = Utils.generateUUID();
                entry.id = newId;
                await db.collection(CONFIG.collections.cashFlow).doc(newId).set(entry);
                Notification.success('Lançamento adicionado!');
            }
        } catch (error) {
            Notification.error('Erro ao salvar lançamento.');
            console.error(error);
        }
        this.clearForm();
        await this.loadEntries();
    },

    async deleteEntry(id) {
        if(confirm('Tem certeza que deseja excluir este lançamento?')) {
            await db.collection(CONFIG.collections.cashFlow).doc(id).delete();
            Notification.success('Lançamento excluído.');
            await this.loadEntries();
        }
    },

    clearForm() {
        document.getElementById('cashFlowForm').reset();
        this.currentEditId = null;
        document.getElementById('cashFlowDate').value = Utils.getToday();
    },

    async loadEntries() {
        const searchTerm = document.getElementById('cashFlowSearch').value.toLowerCase();
        let entries = await Utils.loadFromStorage(CONFIG.collections.cashFlow);

        if (searchTerm) {
            entries = entries.filter(e => e.description.toLowerCase().includes(searchTerm));
        }
        this.renderEntries(entries);
        this.updateSummary(entries);
    },
    
    updateSummary(entries) {
        const totalEntradas = entries.filter(e => e.type === 'entrada').reduce((sum, e) => sum + e.value, 0);
        const totalSaidas = entries.filter(e => e.type === 'saida').reduce((sum, e) => sum + e.value, 0);
        const saldoAtual = totalEntradas - totalSaidas;

        document.getElementById('totalEntradas').textContent = Utils.formatCurrency(totalEntradas);
        document.getElementById('totalSaidas').textContent = Utils.formatCurrency(totalSaidas);
        document.getElementById('saldoAtual').textContent = Utils.formatCurrency(saldoAtual);
        document.getElementById('saldoAtual').style.color = saldoAtual >= 0 ? 'var(--accent-color)' : 'var(--danger-color)';
    },

    renderEntries(entries) {
        const tbody = document.getElementById('cashFlowTableBody');
        if (entries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">Nenhum lançamento encontrado</td></tr>`;
            return;
        }
        tbody.innerHTML = entries.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => {
            const isEntrada = e.type === 'entrada';
            return `
                <tr>
                    <td>${Utils.formatDate(e.date)}</td>
                    <td><span class="badge ${isEntrada ? 'badge-success' : 'badge-danger'}">${e.type}</span></td>
                    <td>${e.description}</td>
                    <td style="color: ${isEntrada ? 'var(--accent-color)' : 'var(--danger-color)'}">${Utils.formatCurrency(e.value)}</td>
                    <td>${e.origin === 'Manual' ? `<button class="btn btn-danger btn-sm" onclick="CashFlow.deleteEntry('${e.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>
                </tr>
            `;
        }).join('');
    },

    async exportToCSV() {
        const entries = await Utils.loadFromStorage(CONFIG.collections.cashFlow);
        if (entries.length === 0) return Notification.warning('Nenhum lançamento para exportar!');
        const headers = ['Data', 'Tipo', 'Descricao', 'Valor', 'Origem'];
        const content = [
            headers.join(','),
            ...entries.map(e => [Utils.formatDate(e.date), e.type, `"${e.description}"`, e.value, e.origin].join(','))
        ].join('\n');
        Utils.downloadCSV(content, 'fluxo_caixa');
        Notification.success('Fluxo de caixa exportado!');
    }
};

const Expenses = { /* ... implementação completa segue o padrão do CashFlow ... */ };
const Receivables = { /* ... implementação completa ... */ };
const Reports = { /* ... implementação completa ... */ };
const Settings = { /* ... implementação completa ... */ };

// ===================================================================================
// ============================= INICIALIZAÇÃO GERAL =================================
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Navigation.init();
    
    // Inicializa todos os módulos
    Dashboard.init?.();
    Clients.init?.();
    Products.init?.();
    Sales.init?.();
    Receipts.init?.();
    CashFlow.init?.();
    Expenses.init?.();
    Receivables.init?.();
    Reports.init?.();
    Settings.init?.();

    // Listeners globais do Modal
    document.getElementById('modalClose').addEventListener('click', () => Modal.hide());
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') Modal.hide();
    });

    console.log('SGI - Flor de Maria v3.0 (Firebase) iniciado!');
});

// Polyfill para requestIdleCallback
window.requestIdleCallback = window.requestIdleCallback || function (cb) {
  return setTimeout(function () {
    var start = Date.now();
    cb({
      didTimeout: false,
      timeRemaining: function () {
        return Math.max(0, 50 - (Date.now() - start));
      }
    });
  }, 1);
};
