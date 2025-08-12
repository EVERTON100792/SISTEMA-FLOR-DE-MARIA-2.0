// ===== SISTEMA DE GESTÃO INTEGRADO - FLOR DE MARIA v3.2 (Final Responsive Fix) =====

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

// ... (Todo o início do JS: app, db, auth, CONFIG, state, Utils, Notification, Modal, Navigation, Auth, App) ...
// Nenhuma mudança é necessária nessas seções iniciais. O código abaixo foca nos módulos corrigidos.
// Cole o código completo da resposta anterior, mas garanta que os módulos Sales e Receivables abaixo substituam os antigos.

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

// ... (Cole aqui os módulos Utils, Notification, Modal, Navigation, Auth, App da resposta anterior) ...

// A partir daqui, seguem os módulos de negócio com as correções.

const Dashboard = {
    // ... (Cole o módulo Dashboard da resposta anterior, ele está correto)
};

const Clients = {
    // ... (Cole o módulo Clients da resposta anterior, ele está correto)
};

const Products = {
    // ... (Cole o módulo Products da resposta anterior, ele está correto)
};


// ===== MÓDULO DE VENDAS (PDV) - CORRIGIDO =====
const Sales = {
    init() {
        document.getElementById('productSearchPDV').addEventListener('input', Utils.debounce(this.showSuggestions, 300));
        document.getElementById('clearCart').addEventListener('click', () => this.clearCart());
        document.getElementById('finalizeSale').addEventListener('click', () => this.finalize());
        document.getElementById('salePaymentMethod').addEventListener('change', (e) => this.toggleInstallments(e));
    },

    // FUNÇÃO CORRIGIDA
    async load() {
        // Esta é a correção principal: garantir que a lista de clientes seja populada sempre que a página carregar
        console.log("Carregando página de Vendas. Populando clientes...");
        this.populateClientSelect('saleClient');
        if (state.cart.length === 0) { // Limpa o carrinho apenas se não houver uma venda em andamento
            this.clearCart();
        }
    },

    populateClientSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return; // Checagem de segurança
        
        select.innerHTML = '<option value="">Consumidor Final</option>';
        state.clients
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        console.log(`Select de clientes '${selectId}' populado com ${state.clients.length} clientes.`);
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
            suggestionsEl.innerHTML = '<div class="text-muted p-3">Nenhum produto encontrado ou sem estoque.</div>';
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
            // Adiciona o produto ao carrinho, incluindo a quantidade em estoque para validação posterior
            state.cart.push({ ...product, quantity_in_cart: 1, quantity_in_stock: product.quantity });
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
            const subtotal = item.salePrice * item.quantity_in_cart;
            total += subtotal;
            return `
                <tr>
                    <td style="white-space:normal;">${item.name}</td>
                    <td>${Utils.formatCurrency(item.salePrice)}</td>
                    <td>
                        <div class="flex" style="align-items:center; gap: 8px; justify-content: center;">
                            <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" onclick="Sales.updateQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity_in_cart}</span>
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
        if (!item) return;

        const newQuantity = item.quantity_in_cart + change;
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
        } else if (newQuantity > item.quantity_in_stock) {
            Notification.warning('Quantidade máxima em estoque atingida.');
        } else {
            item.quantity_in_cart = newQuantity;
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

    async finalize() {
        // ... (Cole a função finalize da resposta anterior, ela está correta e robusta)
        const paymentMethod = document.getElementById('salePaymentMethod').value;
        const clientId = document.getElementById('saleClient').value;
        
        if (paymentMethod === 'Crediário' && !clientId) {
            return Notification.error('Selecione um cliente para vendas no crediário.');
        }

        const saleId = Utils.generateUUID();
        const total = state.cart.reduce((acc, item) => acc + (item.salePrice * item.quantity_in_cart), 0);

        const saleData = {
            id: saleId,
            date: new Date().toISOString(),
            clientId: clientId || null,
            clientName: state.clients.find(c => c.id === clientId)?.name || 'Consumidor Final',
            items: state.cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity_in_cart, price: i.salePrice })),
            total,
            paymentMethod,
        };

        const batch = db.batch();

        batch.set(db.collection(CONFIG.collections.sales).doc(saleId), saleData);

        for (const item of state.cart) {
            const productRef = db.collection(CONFIG.collections.products).doc(item.id);
            batch.update(productRef, { quantity: firebase.firestore.FieldValue.increment(-item.quantity_in_cart) });
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
                    value: installmentValue,
                    dueDate: dueDate.toISOString(), status: 'Pendente',
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
            this.clearCart();
            await App.loadAllData();
        } catch (error) {
            Notification.error('Erro ao finalizar a venda.'); console.error(error);
        }
    },
};

// ... (Cole os módulos Receipts, CashFlow, Expenses da resposta anterior)

// ===== MÓDULO DE CONTAS A RECEBER - CORRIGIDO =====
const Receivables = {
    init() {
        document.getElementById('receivableForm').addEventListener('submit', this.saveManual);
        document.getElementById('clearReceivableForm').addEventListener('click', this.clearForm);
    },
    // FUNÇÃO CORRIGIDA
    async load() {
        await this.updateStatuses();
        // Garante que o select de clientes para lançamentos manuais seja sempre populado
        this.populateClientSelect('receivableClient');
        this.render(state.receivables);
        this.updateSummary();
    },
    populateClientSelect(selectId) {
        // Reutilizando a mesma função do módulo de vendas
        Sales.populateClientSelect(selectId);
    },
    // ... (Cole o resto do módulo Receivables, Reports e Settings da resposta anterior, eles estão corretos) ...
};

// ... (Resto do código, incluindo a chamada App.init())
