// storage.js — LocalStorage + IndexedDB Abstraction
// Persists expense metadata in LocalStorage, receipt files in IndexedDB

const STORAGE_KEYS = {
  EXPENSES:          'et_expenses_v1',
  CUSTOM_CATEGORIES: 'et_categories_custom_v1',
  RECENT_CATEGORIES: 'et_categories_recent_v1',
  SETTINGS:          'et_settings_v1',
};

const DB_NAME    = 'expense-tracker-db';
const DB_VERSION = 1;
const STORE_RECEIPTS = 'receipts';

export class StorageService {
  constructor() {
    this._db = null;
  }

  async init() {
    this._db = await this._openDB();
  }

  // ── IndexedDB Setup ──────────────────────────────────────

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('IndexedDB konnte nicht geöffnet werden'));
      request.onsuccess = (e) => resolve(e.target.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
          db.createObjectStore(STORE_RECEIPTS, { keyPath: 'id' });
        }
      };
    });
  }

  // ── Expenses (LocalStorage) ──────────────────────────────

  getExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveExpenses(expenses) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }

  // ── Receipts (IndexedDB) ─────────────────────────────────

  saveReceipt(id, fileBuffer, fileName, fileType) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not initialized')); return; }
      const tx = this._db.transaction(STORE_RECEIPTS, 'readwrite');
      const store = tx.objectStore(STORE_RECEIPTS);
      const req = store.put({ id, data: fileBuffer, name: fileName, type: fileType, savedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  getReceipt(id) {
    return new Promise((resolve, reject) => {
      if (!this._db) { resolve(null); return; }
      const tx    = this._db.transaction(STORE_RECEIPTS, 'readonly');
      const store = tx.objectStore(STORE_RECEIPTS);
      const req   = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  }

  deleteReceipt(id) {
    return new Promise((resolve, reject) => {
      if (!this._db) { resolve(); return; }
      const tx    = this._db.transaction(STORE_RECEIPTS, 'readwrite');
      const store = tx.objectStore(STORE_RECEIPTS);
      const req   = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ── Custom Categories (LocalStorage) ────────────────────

  getCustomCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveCustomCategories(categories) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  }

  // ── Recent Categories (LocalStorage) ────────────────────

  getRecentCategoryIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENT_CATEGORIES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  addRecentCategoryId(id) {
    const recent = this.getRecentCategoryIds().filter((r) => r !== id);
    recent.unshift(id);
    localStorage.setItem(STORAGE_KEYS.RECENT_CATEGORIES, JSON.stringify(recent.slice(0, 3)));
  }

  // ── Settings (LocalStorage) ──────────────────────────────

  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // ── Storage Quota ────────────────────────────────────────

  async getQuotaInfo() {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) return null;
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage, quota, percent: Math.round((usage / quota) * 100) };
    } catch {
      return null;
    }
  }

  // ── Full Reset ───────────────────────────────────────────

  async clearAll() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    if (this._db) {
      await new Promise((resolve, reject) => {
        const tx    = this._db.transaction(STORE_RECEIPTS, 'readwrite');
        const store = tx.objectStore(STORE_RECEIPTS);
        const req   = store.clear();
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
      });
    }
  }
}
