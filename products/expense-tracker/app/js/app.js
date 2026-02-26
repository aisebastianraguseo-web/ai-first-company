// app.js — Application entry point
// Initializes services, wires components, handles routing

import { StorageService }  from './storage.js';
import { CategoryService } from './categories.js';
import { ExpenseService }  from './expenses.js';
import { ExporterService } from './exporter.js';
import { Router }          from './router.js';
import { ExpenseList }     from './components/expense-list.js';
import { ExpenseForm }     from './components/expense-form.js';
import { ExportDialog }    from './components/export-dialog.js';

// ── Services ─────────────────────────────────────────────

const storage    = new StorageService();
const categories = new CategoryService(storage);
const expenses   = new ExpenseService(storage);
const exporter   = new ExporterService(categories);
const router     = new Router();

// ── DOM Refs ─────────────────────────────────────────────

const viewContainer = document.getElementById('view-container');
const toastContainer = document.getElementById('toast-container');
const navItems       = document.querySelectorAll('.nav-item[data-route]');

// ── Toast Notification ───────────────────────────────────

function showToast(message, type = 'default', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

// ── Navigation State ─────────────────────────────────────

function setActiveNav(path) {
  navItems.forEach((item) => {
    const itemPath = item.dataset.route;
    const isActive = itemPath === path || (path === '/add' && item.classList.contains('nav-item-add'));
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// ── Views ─────────────────────────────────────────────────

function renderListView() {
  new ExpenseList({
    container:       viewContainer,
    expenseService:  expenses,
    categoryService: categories,
    onAdd:           () => router.navigate('/add'),
    showToast,
  });
}

function renderAddView() {
  new ExpenseForm({
    container:       viewContainer,
    expenseService:  expenses,
    categoryService: categories,
    onSuccess:       (expense) => {
      const amount = expense.amount.toLocaleString('de-DE', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
      showToast(`✓ ${amount} € gespeichert`, 'success');
      router.navigate('/');
    },
    showToast,
  });
}

function renderExportView() {
  new ExportDialog({
    container:       viewContainer,
    expenseService:  expenses,
    exporterService: exporter,
    showToast,
  });
}

// ── Router Setup ─────────────────────────────────────────

router
  .on('/',       renderListView)
  .on('/add',    renderAddView)
  .on('/export', renderExportView);

router.onChange((path) => {
  // Update header title
  const titles = { '/': 'ExpenseTracker', '/add': 'Neue Ausgabe', '/export': 'Export' };
  document.querySelector('.app-header-title').textContent = titles[path] ?? 'ExpenseTracker';

  // Update active nav state
  setActiveNav(path);

  // Skip-link: move focus to main content
  const main = document.getElementById('main-content');
  if (main) main.focus();
});

// ── Service Worker Registration ───────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

// ── Storage Quota Warning ─────────────────────────────────

async function checkStorageQuota() {
  const info = await storage.getQuotaInfo();
  if (info && info.percent >= 80) {
    showToast(
      `⚠️ Speicher zu ${info.percent}% voll — bitte Daten exportieren`,
      'warning',
      6000
    );
  }
}

// ── Bootstrap ─────────────────────────────────────────────

async function init() {
  try {
    await storage.init();
    checkStorageQuota();
  } catch (err) {
    console.error('Storage init failed:', err);
    showToast('Hinweis: Lokaler Speicher eingeschränkt', 'warning');
  }
}

init();
