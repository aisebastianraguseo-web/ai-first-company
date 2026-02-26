// expense-form.js — Add Expense form component

import { ValidationError } from '../expenses.js';
import { CategorySelect } from './category-select.js';

const PAYMENT_METHODS = [
  { value: 'card',     label: 'Karte' },
  { value: 'cash',     label: 'Bar' },
  { value: 'transfer', label: 'Überweisung' },
  { value: 'other',    label: 'Sonstige' },
];

export class ExpenseForm {
  /**
   * @param {object} options
   * @param {HTMLElement}     options.container
   * @param {ExpenseService}  options.expenseService
   * @param {CategoryService} options.categoryService
   * @param {Function}        options.onSuccess  (expense) => void
   * @param {Function}        options.showToast  (message, type) => void
   */
  constructor({ container, expenseService, categoryService, onSuccess, showToast }) {
    this._container   = container;
    this._expenses    = expenseService;
    this._categories  = categoryService;
    this._onSuccess   = onSuccess;
    this._showToast   = showToast;
    this._receiptFile = null;
    this._catSelect   = null;
    this._submitting  = false;

    this._render();
  }

  // ── Render ───────────────────────────────────────────────

  _render() {
    const today = new Date().toISOString().slice(0, 10);

    this._container.innerHTML = `
      <div class="form-view" id="expense-form-view">
        <div class="amount-wrapper">
          <label class="sr-only" for="amount">Betrag in Euro</label>
          <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-2)">
            <span class="currency-prefix" aria-hidden="true">€</span>
            <input
              id="amount"
              class="input input-amount"
              type="number"
              inputmode="decimal"
              min="0.01"
              max="99999.99"
              step="0.01"
              placeholder="0,00"
              required
              autocomplete="off"
              style="width:200px"
            >
          </div>
          <div id="error-amount" class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <div class="field">
          <label class="label label-required" for="date">Datum</label>
          <input
            id="date"
            class="input"
            type="date"
            value="${today}"
            max="${today}"
            required
          >
          <div id="error-date" class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <div id="category-select-container"></div>
        <div id="error-categoryId" class="field-error" role="alert" aria-live="polite"></div>

        <div class="field">
          <label class="label" for="merchant">Händler / Anbieter <span style="color:var(--color-text-muted);font-weight:400">(optional)</span></label>
          <input
            id="merchant"
            class="input"
            type="text"
            maxlength="100"
            placeholder="z.B. Rewe, Amazon, Telekom"
            autocomplete="organization"
          >
        </div>

        <div class="field">
          <label class="label" for="description">Notiz <span style="color:var(--color-text-muted);font-weight:400">(optional)</span></label>
          <textarea
            id="description"
            class="textarea"
            maxlength="200"
            placeholder="z.B. Jahresabo für Projektplanung"
            rows="2"
          ></textarea>
          <div class="field-hint" id="desc-count">0 / 200 Zeichen</div>
        </div>

        <div class="field">
          <label class="label">Zahlungsart</label>
          <div class="select-wrapper">
            <select id="paymentMethod" class="select">
              ${PAYMENT_METHODS.map((m) =>
                `<option value="${m.value}">${m.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label class="label">Beleg <span style="color:var(--color-text-muted);font-weight:400">(optional)</span></label>
          <div id="receipt-area">
            <div class="receipt-upload-area" id="upload-trigger" tabindex="0" role="button" aria-label="Beleg hochladen oder fotografieren">
              <input
                type="file"
                id="receipt-file"
                accept="image/jpeg,image/png,application/pdf"
                capture="environment"
                aria-label="Beleg-Datei auswählen"
              >
              <div class="receipt-upload-icon" aria-hidden="true">📎</div>
              <div class="receipt-upload-title">Foto aufnehmen oder Datei wählen</div>
              <div class="receipt-upload-hint">JPEG, PNG oder PDF — max. 10 MB</div>
            </div>
          </div>
          <div id="error-receipt" class="field-error" role="alert" aria-live="polite"></div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-3);padding-bottom:var(--space-8)">
          <button
            type="button"
            class="btn btn-primary btn-full btn-lg"
            id="submit-btn"
            aria-describedby="submit-status"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
            </svg>
            Ausgabe speichern
          </button>
          <div id="submit-status" class="sr-only" aria-live="polite"></div>
        </div>
      </div>
    `;

    // Mount category select
    const catContainer = this._container.querySelector('#category-select-container');
    this._catSelect = new CategorySelect({
      container:       catContainer,
      categoryService: this._categories,
      onChange:        () => this._clearFieldError('categoryId'),
      value:           null,
    });

    this._attachListeners();
  }

  // ── Event Listeners ──────────────────────────────────────

  _attachListeners() {
    // Amount: clear error on input
    this._el('amount').addEventListener('input', () => this._clearFieldError('amount'));

    // Date: max = today
    this._el('date').addEventListener('change', () => this._clearFieldError('date'));

    // Description character counter
    this._el('description').addEventListener('input', (e) => {
      const count = e.target.value.length;
      this._el('desc-count').textContent = `${count} / 200 Zeichen`;
    });

    // Receipt upload
    this._el('receipt-file').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this._handleReceiptSelected(file);
    });

    // Click on upload area (keyboard accessible)
    this._el('upload-trigger').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._el('receipt-file').click();
      }
    });

    // Submit
    this._el('submit-btn').addEventListener('click', () => this._handleSubmit());
  }

  // ── Receipt Handling ─────────────────────────────────────

  async _handleReceiptSelected(file) {
    // Validate file immediately for fast feedback
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowed.includes(file.type)) {
      this._setFieldError('receipt', 'Nur JPEG, PNG oder PDF erlaubt');
      return;
    }
    if (file.size > maxSize) {
      this._setFieldError('receipt', `Datei zu groß (max. 10 MB)`);
      return;
    }

    this._clearFieldError('receipt');
    this._receiptFile = file;

    // Generate thumbnail for preview
    let thumbSrc = null;
    if (file.type.startsWith('image/')) {
      thumbSrc = URL.createObjectURL(file);
    }

    const sizeKB = Math.round(file.size / 1024);
    const sizeLabel = sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;

    this._el('receipt-area').innerHTML = `
      <div class="receipt-preview">
        ${thumbSrc
          ? `<img src="${thumbSrc}" class="receipt-preview-img" alt="Beleg-Vorschau">`
          : `<div class="receipt-preview-img" style="background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;font-size:24px" aria-hidden="true">📄</div>`
        }
        <div class="receipt-preview-info">
          <div class="receipt-preview-name">${this._esc(file.name)}</div>
          <div class="receipt-preview-size">${sizeLabel}</div>
        </div>
        <button type="button" class="btn btn-icon btn-ghost" id="remove-receipt" aria-label="Beleg entfernen">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>
      </div>
    `;

    this._el('remove-receipt')?.addEventListener('click', () => this._removeReceipt());
  }

  _removeReceipt() {
    this._receiptFile = null;
    this._render();
  }

  // ── Submit ───────────────────────────────────────────────

  async _handleSubmit() {
    if (this._submitting) return;

    const data = {
      amount:        this._el('amount').value,
      date:          this._el('date').value,
      categoryId:    this._catSelect.getValue(),
      merchant:      this._el('merchant').value.trim(),
      description:   this._el('description').value.trim(),
      paymentMethod: this._el('paymentMethod').value,
    };

    // Clear previous errors
    ['amount', 'date', 'categoryId'].forEach((f) => this._clearFieldError(f));
    if (!data.categoryId) this._catSelect.showError();

    try {
      this._setSubmitting(true);
      const expense = await this._expenses.create(data, this._receiptFile);
      this._onSuccess?.(expense);
    } catch (err) {
      if (err instanceof ValidationError) {
        for (const { field, message } of err.errors) {
          this._setFieldError(field, message);
          if (field === 'categoryId') this._catSelect.showError();
        }
        // Focus first error
        const firstField = err.errors[0]?.field;
        if (firstField === 'amount') this._el('amount').focus();
        else if (firstField === 'date') this._el('date').focus();
        else if (firstField === 'categoryId') {
          this._container.querySelector('#cat-btn')?.focus();
        }
      } else {
        this._showToast?.(`Fehler: ${err.message}`, 'error');
      }
    } finally {
      this._setSubmitting(false);
    }
  }

  _setSubmitting(loading) {
    this._submitting = loading;
    const btn    = this._el('submit-btn');
    const status = this._el('submit-status');
    if (loading) {
      btn.disabled    = true;
      btn.innerHTML   = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div> Speichern…`;
      status.textContent = 'Ausgabe wird gespeichert…';
    } else {
      btn.disabled    = false;
      btn.innerHTML   = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        Ausgabe speichern
      `;
      status.textContent = '';
    }
  }

  // ── Error Handling ───────────────────────────────────────

  _setFieldError(field, message) {
    const el = this._el(`error-${field}`);
    if (!el) return;
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
      </svg>
      ${this._esc(message)}
    `;
    const input = this._el(field);
    input?.classList.add('input--error');
  }

  _clearFieldError(field) {
    const el    = this._el(`error-${field}`);
    const input = this._el(field);
    if (el)    el.textContent = '';
    if (input) input.classList.remove('input--error');
  }

  // ── Utils ────────────────────────────────────────────────

  _el(id)  { return this._container.querySelector(`#${id}`); }
  _esc(s)  { return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
}
