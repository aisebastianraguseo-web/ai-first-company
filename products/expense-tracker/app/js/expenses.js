// expenses.js — Expense business logic, validation, CRUD

const ALLOWED_MIME  = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAGIC_BYTES   = {
  'image/jpeg':     [0xFF, 0xD8, 0xFF],
  'image/png':      [0x89, 0x50, 0x4E, 0x47],
  'application/pdf':[0x25, 0x50, 0x44, 0x46],
};

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name  = 'ValidationError';
    this.errors = errors; // [{ field, message }]
  }
}

export class ExpenseService {
  constructor(storage) {
    this._storage = storage;
  }

  // ── Create ───────────────────────────────────────────────

  async create(data, receiptFile = null) {
    const errors = this._validate(data);
    if (errors.length) throw new ValidationError(errors);

    const id = this._generateId();
    let receiptMeta = null;

    if (receiptFile) {
      await this._validateFile(receiptFile);
      const thumbnail  = await this._generateThumbnail(receiptFile);
      const buffer     = await receiptFile.arrayBuffer();
      await this._storage.saveReceipt(id, buffer, this._sanitizeFilename(receiptFile.name), receiptFile.type);
      receiptMeta = {
        fileName:         this._sanitizeFilename(receiptFile.name),
        fileType:         receiptFile.type,
        fileSizeBytes:    receiptFile.size,
        thumbnailDataUrl: thumbnail,
      };
    }

    const expense = {
      id,
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
      amount:        parseFloat(parseFloat(data.amount).toFixed(2)),
      currency:      'EUR',
      date:          data.date,
      categoryId:    data.categoryId,
      description:   data.description ? this._sanitize(data.description).slice(0, 200) : null,
      merchant:      data.merchant    ? this._sanitize(data.merchant).slice(0, 100)    : null,
      paymentMethod: data.paymentMethod || 'other',
      receipt:       receiptMeta,
    };

    const expenses = this._storage.getExpenses();
    expenses.push(expense);
    this._storage.saveExpenses(expenses);
    return expense;
  }

  // ── Read ─────────────────────────────────────────────────

  getAll() {
    return this._storage.getExpenses();
  }

  getById(id) {
    return this.getAll().find((e) => e.id === id) || null;
  }

  getByPeriod(startDate, endDate) {
    return this.getAll().filter((e) => e.date >= startDate && e.date <= endDate);
  }

  getByMonth(year, month) {
    const mm    = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const end   = `${year}-${mm}-31`;
    return this.getByPeriod(start, end).sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── Delete ───────────────────────────────────────────────

  async delete(id) {
    const expense = this.getById(id);
    if (!expense) return;

    if (expense.receipt) {
      await this._storage.deleteReceipt(id).catch(() => { /* receipt may already be gone */ });
    }

    const updated = this.getAll().filter((e) => e.id !== id);
    this._storage.saveExpenses(updated);
  }

  // ── Aggregation ──────────────────────────────────────────

  getSummary(expenses, categories) {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const taxRelevant = expenses
      .filter((e) => categories.getById(e.categoryId)?.taxRelevant)
      .reduce((s, e) => s + e.amount, 0);
    return { total, taxRelevant, count: expenses.length };
  }

  getByCategory(expenses) {
    const map = {};
    for (const e of expenses) {
      map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
    }
    return map;
  }

  // ── Validation ───────────────────────────────────────────

  _validate(data) {
    const errors = [];
    const amount = parseFloat(data.amount);

    if (isNaN(amount) || amount <= 0 || amount > 99999.99) {
      errors.push({ field: 'amount', message: 'Betrag muss zwischen 0,01 € und 99.999,99 € liegen' });
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push({ field: 'date', message: 'Ungültiges Datum' });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (data.date > today) {
        errors.push({ field: 'date', message: 'Datum darf nicht in der Zukunft liegen' });
      }
    }

    if (!data.categoryId) {
      errors.push({ field: 'categoryId', message: 'Bitte eine Kategorie auswählen' });
    }

    return errors;
  }

  async _validateFile(file) {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error('Nur JPEG, PNG oder PDF-Dateien erlaubt');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Datei zu groß — max. ${MAX_FILE_SIZE / 1024 / 1024} MB erlaubt`);
    }
    if (file.size === 0) {
      throw new Error('Datei ist leer');
    }

    // Magic bytes validation — prevent MIME spoofing
    const slice  = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes  = new Uint8Array(buffer);
    const magic  = MAGIC_BYTES[file.type];
    if (magic && !magic.every((b, i) => bytes[i] === b)) {
      throw new Error('Dateiinhalt stimmt nicht mit dem Dateiformat überein');
    }
  }

  // ── Thumbnail Generation ─────────────────────────────────

  _generateThumbnail(file) {
    if (file.type === 'application/pdf') {
      return Promise.resolve(this._pdfPlaceholder());
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const MAX    = 200;
        const scale  = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  }

  _pdfPlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 56px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PDF', 100, 100);
    return canvas.toDataURL();
  }

  // ── Utils ────────────────────────────────────────────────

  _generateId() {
    // RFC4122 v4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  _sanitize(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  }

  _sanitizeFilename(name) {
    return String(name)
      .replace(/[^\w.\-\u00C0-\u024F]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 100);
  }
}
