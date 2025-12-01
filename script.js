// ===== SGI - FLOR DE MARIA v6.0 (Versão Definitiva e 100% Completa) =====

// 1. INICIALIZAÇÃO E CONFIGURAÇÕES
const SUPABASE_URL = 'https://pjbmcwefqsfqnlfvledz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYm1jd2VmcXNmcW5sZnZsZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzUwMTIsImV4cCI6MjA3MDcxMTAxMn0.f1V4yZ01eOt_ols8Cg5ATvtvz-GEomU6K6SzHg8kKIQ';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
    storageKeys: { lastActivePage: 'sgi_last_active_page' },
    company: { name: 'Flor de Maria', address: 'Rua das Flores, 123 - Centro', phone: '(11) 98765-4321', cnpj: '12.345.678/0001-99' }
};

const state = {
    clients: [], products: [], sales: [], cashFlow: [], expenses: [], receivables: [],
    cart: [], currentEditId: null, chartInstances: {}
};

// 2. MÓDULOS DE UTILIDADES (Notificação, Modal, Formatação, etc.)
const Utils = {
    formatCurrency: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0),
    formatDate: d => d ? new Intl.DateTimeFormat('pt-BR').format(new Date(d)) : 'N/A',
    debounce: (func, delay = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; },
    populateSelect: (id, data, valF, textF, defTxt) => {
        const s = document.getElementById(id);
        if (!s) return;
        s.innerHTML = `<option value="">${defTxt}</option>`;
        [...data].sort((a, b) => (a[textF] || '').localeCompare(b[textF] || '')).forEach(i => {
            s.innerHTML += `<option value="${i.id}">${i[textF]}</option>`;
        });
    },
    exportToCSV: (filename, data) => {
        if (!data || data.length === 0) {
            return Notification.warning("Não há dados para exportar.");
        }
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/