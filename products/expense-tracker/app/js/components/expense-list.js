// expense-list.js — Expense list view with month navigation and summary

export class ExpenseList {
  /**
   * @param {object} options
   * @param {HTMLElement}     options.container
   * @param {ExpenseService}  options.expenseService
   * @param {CategoryService} options.categoryService
   * @param {Function}        options.onAdd       () => void
   * @param {Function}        options.showToast   (message, type) => void
   */
  constructor({ container, expenseService, categoryService, onAdd, showToast }) {
    this._container  = container;
    this._expenses   = expenseService;
    this._categories = categoryService;
    this._onAdd      = onAdd;
    this._showToast  = showToast;

    const now     = new Date();
    this._year    = now.getFullYear();
    this._month   = now.getMonth() + 1;
    this._search  = '';

    this._render();
  }

  refresh() {
    this._render();
  }

  // ── Render ───────────────────────────────────────────────

  _render() {
    const expenses = this._getFilteredExpenses();
    const summary  = this._expenses.getSummary(expenses, this._categories);

    this._container.innerHTML = `
      <div class="view" id="list-view">

        <div class="list-header">
          <div class="month-selector" role="group" aria-label="Monat auswählen">
            <button class="btn btn-icon btn-ghost" id="prev-month" aria-label="Vorheriger Monat">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd"/>
              </svg>
            </button>
            <span class="month-selector-label" aria-live="polite" aria-atomic="true">
              ${this._monthLabel()}
            </span>
            <button class="btn btn-icon btn-ghost" id="next-month" aria-label="Nächster Monat" ${this._isCurrentMonth() ? 'disabled aria-disabled="true"' : ''}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div role="search">
            <label class="sr-only" for="search-input">Ausgaben suchen</label>
            <input
              id="search-input"
              class="input"
              type="search"
              placeholder="Suchen…"
              value="${this._esc(this._search)}"
              style="min-height:40px;width:140px"
              autocomplete="off"
            >
          </div>
        </div>

        ${expenses.length > 0 ? this._renderSummary(summary) : ''}

        ${expenses.length > 0
          ? `<div class="expense-list" role="list" aria-label="Ausgaben">
               ${expenses.map((e) => this._renderItem(e)).join('')}
             </div>`
          : this._renderEmpty()
        }
      </div>
    `;

    this._attachListeners(expenses);
  }

  _renderSummary(summary) {
    return `
      <div class="summary-card" role="region" aria-label="Monatsübersicht">
        <div class="summary-label">Gesamt ${this._monthLabel()}</div>
        <div class="summary-total" aria-label="${this._formatAmount(summary.total)} Euro Gesamtausgaben">
          ${this._formatAmount(summary.total)} €
        </div>
        <div class="summary-row">
          <div class="summary-stat">
            <div class="summary-stat-value">${summary.count}</div>
            <div class="summary-stat-label">Ausgaben</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value">${this._formatAmount(summary.taxRelevant)} €</div>
            <div class="summary-stat-label">Steuerrelevant</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value">${this._formatAmount(summary.total - summary.taxRelevant)} €</div>
            <div class="summary-stat-label">Privat</div>
          </div>
        </div>
      </div>
    `;
  }

  _renderItem(expense) {
    const cat     = this._categories.getById(expense.categoryId);
    const dateDE  = expense.date.split('-').reverse().join('.');
    const amount  = this._formatAmount(expense.amount);
    const label   = cat?.name || 'Unbekannt';
    const icon    = cat?.icon || '❓';
    const isPriv  = !cat?.taxRelevant;

    return `
      <div
        class="expense-item"
        role="listitem"
        data-id="${this._esc(expense.id)}"
        tabindex="0"
        aria-label="${this._esc(label + ', ' + amount + ' Euro, ' + dateDE)}"
      >
        <div class="expense-icon ${isPriv ? 'expense-icon--private' : ''}" aria-hidden="true">${icon}</div>
        <div class="expense-info">
          <div class="expense-name">${this._esc(expense.merchant || label)}</div>
          <div class="expense-meta">
            <span class="expense-date">${dateDE}</span>
            ${expense.merchant ? `<span class="badge badge-blue" style="font-size:10px">${this._esc(label)}</span>` : ''}
            ${isPriv ? `<span class="badge badge-gray" style="font-size:10px">Privat</span>` : ''}
          </div>
        </div>
        ${expense.receipt?.thumbnailDataUrl
          ? `<img
               src="${expense.receipt.thumbnailDataUrl}"
               class="expense-receipt-thumb"
               alt="Beleg-Vorschau"
             >`
          : ''
        }
        <div class="expense-amount" aria-hidden="true">${amount} €</div>
      </div>
    `;
  }

  _renderEmpty() {
    const isSearch = this._search.length > 0;
    return `
      <div class="empty-state" role="status">
        <div class="empty-state-icon" aria-hidden="true">${isSearch ? '🔍' : '📋'}</div>
        <h2 class="empty-state-title">
          ${isSearch ? 'Keine Treffer' : 'Noch keine Ausgaben'}
        </h2>
        <p class="empty-state-text">
          ${isSearch
            ? `Keine Ausgaben für "${this._esc(this._search)}" gefunden.`
            : 'Erfasse deine erste Ausgabe über das + Symbol unten.'
          }
        </p>
        ${!isSearch ? `<button class="btn btn-primary" id="empty-add-btn" aria-label="Erste Ausgabe hinzufügen">
          Ausgabe hinzufügen
        </button>` : ''}
      </div>
    `;
  }

  // ── Delete Dialog ────────────────────────────────────────

  _showDeleteDialog(expense) {
    const cat    = this._categories.getById(expense.categoryId);
    const dateDE = expense.date.split('-').reverse().join('.');
    const amount = this._formatAmount(expense.amount);
    const label  = cat?.name || 'Unbekannt';

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal modal-centered" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" style="max-width:360px">
        <div class="modal-header">
          <h2 class="modal-title" id="delete-dialog-title">Ausgabe löschen?</h2>
          <button class="btn btn-icon btn-ghost" id="dialog-close" aria-label="Abbrechen">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="color:var(--color-text-muted)">
            Diese Ausgabe wird dauerhaft gelöscht:
          </p>
          <div class="card" style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4)">
            <strong>${this._esc(expense.merchant || label)}</strong><br>
            <span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">${amount} € · ${dateDE}</span>
          </div>
          ${expense.receipt ? `<p style="margin-top:var(--space-3);font-size:var(--font-size-sm);color:var(--color-text-muted)">Der Beleg wird ebenfalls gelöscht.</p>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger btn-full" id="confirm-delete">Ausgabe löschen</button>
          <button class="btn btn-ghost btn-full" id="cancel-delete">Abbrechen</button>
        </div>
      </div>
    `;

    const close = () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    };

    overlay.querySelector('#dialog-close').addEventListener('click', close);
    overlay.querySelector('#cancel-delete').addEventListener('click', close);
    overlay.querySelector('#confirm-delete').addEventListener('click', async () => {
      try {
        await this._expenses.delete(expense.id);
        close();
        this._showToast?.('Ausgabe gelöscht', 'success');
        this._render();
      } catch {
        this._showToast?.('Fehler beim Löschen', 'error');
        close();
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    }, { once: true });

    // Focus management
    overlay.querySelector('#confirm-delete')?.focus();
  }

  // ── Event Listeners ──────────────────────────────────────

  _attachListeners(expenses) {
    // Month navigation
    this._container.querySelector('#prev-month')?.addEventListener('click', () => {
      if (this._month === 1) { this._month = 12; this._year--; }
      else this._month--;
      this._render();
    });

    this._container.querySelector('#next-month')?.addEventListener('click', () => {
      if (!this._isCurrentMonth()) {
        if (this._month === 12) { this._month = 1; this._year++; }
        else this._month++;
        this._render();
      }
    });

    // Search
    this._container.querySelector('#search-input')?.addEventListener('input', (e) => {
      this._search = e.target.value;
      this._render();
    });

    // Empty state add button
    this._container.querySelector('#empty-add-btn')?.addEventListener('click', () => {
      this._onAdd?.();
    });

    // Expense items
    this._container.querySelectorAll('.expense-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id      = item.dataset.id;
        const expense = this._expenses.getById(id);
        if (expense) this._showDeleteDialog(expense);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Delete') {
          e.preventDefault();
          const id      = item.dataset.id;
          const expense = this._expenses.getById(id);
          if (expense) this._showDeleteDialog(expense);
        }
      });
    });
  }

  // ── Utils ────────────────────────────────────────────────

  _getFilteredExpenses() {
    let list = this._expenses.getByMonth(this._year, this._month);
    if (this._search.trim()) {
      const q = this._search.toLowerCase();
      list = list.filter((e) => {
        const cat = this._categories.getById(e.categoryId);
        return (
          e.merchant?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }

  _monthLabel() {
    return new Date(this._year, this._month - 1, 1)
      .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }

  _isCurrentMonth() {
    const now = new Date();
    return this._year === now.getFullYear() && this._month === now.getMonth() + 1;
  }

  _formatAmount(n) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
}
