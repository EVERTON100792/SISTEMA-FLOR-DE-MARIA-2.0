// ===== SGI - FLOR DE MARIA v4.1 (Correção de Persistência e Transações) =====

// 1. Initialize Supabase
const SUPABASE_URL = 'https://pjbmcwefqsfqnlfvledz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYm1jd2VmcXNmcW5sZnZsZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzUwMTIsImV4cCI6MjA3MDcxMTAxMn0.f1V4yZ01eOt_ols8Cg5ATvtvz-GEomU6K6SzHg8kKIQ';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Configurações e Estado Global
const CONFIG = {
    tables: { clients: 'clients', products: 'products', sales: 'sales', cashFlow: 'cash_flow', expenses: 'expenses', receivables: 'receivables' },
    storageKeys: { lastActivePage: 'sgi_last_active_page' },
    company: { name: 'Flor de Maria', address: 'Rua das Flores, 123 - Centro', phone: '(11) 98765-4321', cnpj: '12.345.678/0001-99' }
};

const state = {
    clients: [], products: [], sales: [], cashFlow: [], expenses: [], receivables: [], cart: [],
    currentEditId: null, currentReport: { data: [], headers: [], title: '' },
};

// 3. Módulos de Utilidades, Notificação e Modal (sem mudanças significativas)
const Utils = {
    generateUUID: () => self.crypto.randomUUID(),
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
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
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
    // Funções de exportação (sem mudança)
    exportToCSV(filename, displayHeaders, data, dataKeys) { /* ...código original... */ },
    exportToPDF(title, head, body) { /* ...código original... */ }
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
    hide() { document.getElementById('modal').classList.remove('show'); }
};

// 4. Módulos Principais (App, Auth, Navigation)
const App = {
    async loadAllData() {
        try {
            const tableNames = Object.values(CONFIG.tables);
            const promises = tableNames.map(tableName => db.from(tableName).select('*'));
            const results = await Promise.all(promises);
            const keyMap = Object.keys(CONFIG.tables);

            results.forEach((result, index) => {
                const stateKey = keyMap[index];
                if (result.error) throw new Error(`Erro ao carregar ${stateKey}: ${result.error.message}`);
                // Ordena os dados para melhor visualização (opcional, mas recomendado)
                if (result.data?.[0]?.date) result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                else if (result.data?.[0]?.created_at) result.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                state[stateKey] = result.data;
            });
            Receivables.checkOverdue(); // Verificar vencidos ao carregar os dados
        } catch (error) {
            console.error("Erro fatal ao carregar dados:", error);
            Notification.error("Falha ao sincronizar dados. Verifique o console (F12).");
        }
    },
    async init() {
        if (SUPABASE_URL.includes('COLE_SUA_URL') || SUPABASE_ANON_KEY.includes('COLE_SUA_CHAVE')) {
            document.body.innerHTML = `<div style="padding: 40px; text-align: center; color: white; font-family: sans-serif;"><h1>Erro de Configuração</h1><p>As chaves do Supabase não foram configuradas no arquivo script.js.</p></div>`;
            return;
        }
        Auth.init(); Navigation.init(); Clients.init(); Products.init(); Sales.init(); Receipts.init(); CashFlow.init(); Expenses.init(); Receivables.init(); Reports.init(); Settings.init();
        document.getElementById('modalClose').addEventListener('click', Modal.hide);
        document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') Modal.hide(); });

        const { data } = await db.auth.getSession();
        if (data.session) Auth.showApp();
        else Auth.showLogin();

        console.log('SGI - Flor de Maria v4.1 (Supabase) iniciado!');
    }
};

const Auth = {
    init() { /* ...código original sem mudanças... */ },
    handleLogin: async (e) => { /* ...código original sem mudanças... */ },
    handleLogout: async () => { /* ...código original sem mudanças... */ },
    showLogin: () => { /* ...código original sem mudanças... */ },
    showApp: async () => {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appLayout').classList.remove('hidden');
        await App.loadAllData();
        const lastPage = localStorage.getItem(CONFIG.storageKeys.lastActivePage) || 'dashboard';
        await Navigation.navigateTo(lastPage);
    }
};

const Navigation = {
    init() { /* ...código original sem mudanças... */ },
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
            dashboard: Dashboard.load, clients: Clients.load, products: Products.load,
            sales: Sales.load, receipts: Receipts.load, cashflow: CashFlow.load,
            expenses: Expenses.load, receivables: Receivables.load, reports: Reports.load,
            settings: Settings.load,
        };
        if (pageLoaders[page]) await pageLoaders[page]();
    }
};

// =========================================================
// MÓDULOS DA APLICAÇÃO (COM CORREÇÕES E MELHORIAS)
// =========================================================

const Dashboard = { /* ...código da versão anterior, já estava bom... */ };

const Clients = {
    init() {
        document.getElementById('clientForm').addEventListener('submit', this.save);
        document.getElementById('clientSearch').addEventListener('input', Utils.debounce(this.render, 300));
        document.getElementById('clientCancelEdit').addEventListener('click', () => this.clearForm());
    },
    async load() { this.render(); },
    getFiltered() {
        const query = document.getElementById('clientSearch').value.toLowerCase();
        if (!query) return state.clients;
        return state.clients.filter(c => c.name.toLowerCase().includes(query) || c.phone?.includes(query));
    },
    render() {
        const filteredClients = this.getFiltered();
        const tbody = document.getElementById('clientsTable');
        tbody.innerHTML = filteredClients.map(client => `
            <tr>
                <td>${client.name}</td>
                <td>${client.phone || 'N/A'}</td>
                <td>${Utils.formatDate(client.created_at)}</td>
                <td class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="Clients.edit('${client.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="Clients.remove('${client.id}')"><i class="fas fa-trash"></i> Excluir</button>
                </td>
            </tr>
        `).join('');
    },
    save: async (e) => {
        e.preventDefault();
        const clientData = {
            name: document.getElementById('clientName').value.trim(),
            phone: document.getElementById('clientPhone').value.trim()
        };
        if (!clientData.name) return Notification.error('O nome é obrigatório.');

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            if (state.currentEditId) {
                // ATUALIZAÇÃO
                const { data, error } = await db.from(CONFIG.tables.clients).update(clientData).eq('id', state.currentEditId).select().single();
                if (error) throw error;
                const index = state.clients.findIndex(c => c.id === state.currentEditId);
                if (index !== -1) state.clients[index] = data;
                Notification.success('Cliente atualizado com sucesso!');
            } else {
                // CRIAÇÃO
                const { data, error } = await db.from(CONFIG.tables.clients).insert(clientData).select().single();
                if (error) throw error;
                state.clients.unshift(data); // Adiciona no início da lista
                Notification.success('Cliente cadastrado com sucesso!');
            }
            Clients.clearForm();
            Clients.render();
        } catch (error) {
            Notification.error(`Erro ao salvar cliente: ${error.message}`);
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
        }
    },
    edit(id) {
        const client = state.clients.find(c => c.id === id);
        if (client) {
            state.currentEditId = id;
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientPhone').value = client.phone;
            document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Atualizar Cliente';
            document.getElementById('clientCancelEdit').classList.remove('hidden');
            document.getElementById('clientName').focus();
        }
    },
    remove: async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) return;
        const { error } = await db.from(CONFIG.tables.clients).delete().eq('id', id);
        if (error) {
            Notification.error(`Erro ao excluir cliente: ${error.message}`);
            console.error(error);
        } else {
            state.clients = state.clients.filter(c => c.id !== id);
            Clients.render();
            Notification.success('Cliente excluído com sucesso.');
        }
    },
    clearForm() {
        document.getElementById('clientForm').reset();
        state.currentEditId = null;
        document.querySelector('#clientForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Cliente';
        document.getElementById('clientCancelEdit').classList.add('hidden');
    },
};

const Products = {
    init() {
        document.getElementById('productForm').addEventListener('submit', this.save);
        document.getElementById('productSearch').addEventListener('input', Utils.debounce(this.render, 300));
        document.getElementById('productCancelEdit').addEventListener('click', () => this.clearForm());
    },
    async load() { this.render(); this.updateStats(); },
    getFiltered() { /* ...código de filtro sem mudanças... */ },
    render() { /* ...código de render sem mudanças... */ },
    save: async (e) => {
        e.preventDefault();
        const productData = {
            ref_code: document.getElementById('productRefCode').value.trim(),
            name: document.getElementById('productName').value.trim(),
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            cost_price: parseFloat(document.getElementById('productCostPrice').value) || 0,
            sale_price: parseFloat(document.getElementById('productSalePrice').value) || 0,
        };
        if (!productData.ref_code || !productData.name) return Notification.error('Código e Nome são obrigatórios.');
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            if (state.currentEditId) {
                // ATUALIZAÇÃO
                productData.updated_at = new Date().toISOString();
                const { data, error } = await db.from(CONFIG.tables.products).update(productData).eq('id', state.currentEditId).select().single();
                if (error) throw error;
                const index = state.products.findIndex(p => p.id === state.currentEditId);
                if (index !== -1) state.products[index] = data;
                Notification.success('Produto atualizado!');
            } else {
                // CRIAÇÃO
                const { data, error } = await db.from(CONFIG.tables.products).insert(productData).select().single();
                if (error) throw error;
                state.products.unshift(data);
                Notification.success('Produto cadastrado!');
            }
            Products.clearForm();
            Products.render();
            Products.updateStats();
        } catch (error) {
            Notification.error(`Erro ao salvar produto: ${error.message}`);
            console.error(error);
        } finally {
             submitButton.disabled = false;
             submitButton.innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
        }
    },
    edit(id) { /* ...código de edit similar ao de clientes... */ },
    remove: async (id) => { /* ...código de remove similar ao de clientes... */ },
    clearForm() { /* ...código de clearForm similar ao de clientes... */ },
    updateStats() { /* ...código original... */ },
};

const Sales = {
    init() {
        document.getElementById('saleForm').addEventListener('submit', this.save);
        document.getElementById('saleProductSelect').addEventListener('change', this.updateProductInfo);
        document.getElementById('addSaleItemBtn').addEventListener('click', this.addItemToCart);
        document.getElementById('salePaymentMethod').addEventListener('change', this.toggleInstallments);
    },
    async load() {
        Utils.populateSelect('saleClientSelect', state.clients, 'id', 'name', 'Selecione um cliente');
        Utils.populateSelect('saleProductSelect', state.products, 'id', 'name', 'Selecione um produto');
        this.renderCart();
    },
    updateProductInfo() {
        const productId = document.getElementById('saleProductSelect').value;
        const infoDiv = document.getElementById('saleProductInfo');
        if (!productId) { infoDiv.innerHTML = ''; return; }
        const product = state.products.find(p => p.id === productId);
        infoDiv.innerHTML = `Disponível: ${product.quantity} | Preço: ${Utils.formatCurrency(product.sale_price)}`;
    },
    addItemToCart() { /* ...código para adicionar item ao carrinho local (state.cart)... */ },
    renderCart() { /* ...código para renderizar o carrinho na UI... */ },
    toggleInstallments(e) {
        document.getElementById('installmentsGroup').style.display = e.target.value === 'A Prazo' ? 'block' : 'none';
        document.getElementById('dueDateGroup').style.display = e.target.value === 'A Prazo' ? 'block' : 'none';
    },
    save: async (e) => {
        e.preventDefault();
        if (state.cart.length === 0) return Notification.error('Adicione pelo menos um item à venda.');

        const saleData = {
            p_client_id: document.getElementById('saleClientSelect').value,
            p_sale_date: new Date().toISOString(),
            p_items: JSON.stringify(state.cart.map(item => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.price }))),
            p_total: state.cart.reduce((acc, item) => acc + item.total, 0),
            p_payment_method: document.getElementById('salePaymentMethod').value,
            p_due_date: document.getElementById('saleDueDate').value || null,
            p_installments: parseInt(document.getElementById('saleInstallments').value) || 1
        };

        if (!saleData.p_client_id) return Notification.error('Selecione um cliente.');
        if (saleData.p_payment_method === 'A Prazo' && !saleData.p_due_date) return Notification.error('A data de vencimento é obrigatória para vendas a prazo.');

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        try {
            const { data, error } = await db.rpc('handle_new_sale', saleData);
            if (error) throw error;
            
            // ATUALIZAÇÃO DO ESTADO LOCAL COM OS DADOS RETORNADOS PELA FUNÇÃO
            const { sale_record, cash_flow_record, receivable_record } = data[0];
            
            // 1. Adiciona nova venda ao estado
            if (sale_record) state.sales.unshift(JSON.parse(sale_record));
            
            // 2. Adiciona ao fluxo de caixa, se houver
            if (cash_flow_record) state.cashFlow.unshift(JSON.parse(cash_flow_record));

            // 3. Adiciona a contas a receber, se houver
            if (receivable_record) state.receivables.unshift(JSON.parse(receivable_record));
            
            // 4. Atualiza o estoque localmente
            state.cart.forEach(cartItem => {
                const productIndex = state.products.findIndex(p => p.id === cartItem.product_id);
                if (productIndex !== -1) {
                    state.products[productIndex].quantity -= cartItem.quantity;
                }
            });

            Notification.success('Venda registrada com sucesso!');
            Sales.clearForm();
            await Navigation.navigateTo('receipts'); // Redireciona para a aba de recibos

        } catch (error) {
            Notification.error(`Erro ao registrar venda: ${error.message}`);
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-check"></i> Finalizar Venda';
        }
    },
    clearForm() {
        state.cart = [];
        document.getElementById('saleForm').reset();
        document.getElementById('installmentsGroup').style.display = 'none';
        document.getElementById('dueDateGroup').style.display = 'none';
        this.renderCart();
    },
};

const Receipts = { /* ...código para listar e gerar recibos de vendas salvas... */ };

const CashFlow = { /* ...código para listar transações de entrada e saída... */ };

const Expenses = {
    // Implementar CRUD completo para despesas, seguindo o mesmo padrão de Clients e Products
    init() {
        document.getElementById('expenseForm').addEventListener('submit', this.save);
    },
    async load() { this.render(); },
    render() { /* ...código para renderizar a tabela de despesas... */ },
    save: async (e) => {
        e.preventDefault();
        const expenseData = {
            description: document.getElementById('expenseDescription').value.trim(),
            value: parseFloat(document.getElementById('expenseValue').value) || 0,
            date: document.getElementById('expenseDate').value,
            category: document.getElementById('expenseCategory').value
        };
        if (!expenseData.description || expenseData.value <= 0 || !expenseData.date) {
            return Notification.error('Preencha todos os campos obrigatórios.');
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            // CRIAÇÃO
            const { data, error } = await db.from(CONFIG.tables.expenses).insert(expenseData).select().single();
            if (error) throw error;
            
            state.expenses.unshift(data); // Adiciona ao estado local
            
            // Adiciona ao fluxo de caixa
            const cashFlowEntry = {
                description: `Despesa: ${data.description}`,
                value: data.value,
                type: 'saida',
                date: data.date,
                payment_method: 'N/A' // Ou adicionar um campo para isso
            };
            const { data: cfData, error: cfError } = await db.from(CONFIG.tables.cashFlow).insert(cashFlowEntry).select().single();
            if (cfError) throw cfError;
            
            state.cashFlow.unshift(cfData);
            
            Notification.success('Despesa registrada com sucesso!');
            document.getElementById('expenseForm').reset();
            Expenses.render();
            // O ideal seria que CashFlow.render() também fosse chamado, ou navegar para a página de fluxo de caixa
        } catch(error) {
            Notification.error(`Erro ao salvar despesa: ${error.message}`);
        } finally {
            submitButton.disabled = false;
        }
    },
    // Adicionar métodos de edit e remove se necessário
};

const Receivables = {
    init() { /* ...adicionar listeners se houver filtros ou ações... */ },
    async load() { this.render(); },
    checkOverdue() {
        const today = new Date().setHours(0,0,0,0);
        state.receivables.forEach(r => {
            if (r.status === 'Pendente' && new Date(r.due_date) < today) {
                r.status = 'Vencido';
                // Opcional: Atualizar no banco também
                // db.from('receivables').update({ status: 'Vencido' }).eq('id', r.id).then();
            }
        });
    },
    render() { /* ...código para renderizar contas a receber, com botões de ação... */ },
    markAsPaid: async (receivableId) => {
        // Usar um modal para selecionar o método de pagamento
        const paymentMethod = prompt("Informe o método de pagamento (Dinheiro, Pix, Cartão):", "Pix");
        if (!paymentMethod) return;

        try {
            const { data, error } = await db.rpc('mark_receivable_as_paid', {
                p_receivable_id: receivableId,
                p_payment_method: paymentMethod
            });
            if (error) throw error;

            const { updated_receivable, new_cash_flow_entry } = data[0];

            // Atualiza o estado de Contas a Receber
            const receivable = JSON.parse(updated_receivable);
            const index = state.receivables.findIndex(r => r.id === receivable.id);
            if (index !== -1) state.receivables[index] = receivable;

            // Adiciona ao estado de Fluxo de Caixa
            state.cashFlow.unshift(JSON.parse(new_cash_flow_entry));

            Notification.success('Conta recebida com sucesso!');
            Receivables.render(); // Re-renderiza a lista de contas
            // Poderia também atualizar o dashboard se ele estiver visível
        } catch (error) {
            Notification.error(`Erro ao dar baixa na conta: ${error.message}`);
        }
    },
};

const Reports = { /* ...módulo de relatórios... */ };
const Settings = { /* ...módulo de configurações... */ };

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', App.init);
