// export-dialog.js — Export configuration view

export class ExportDialog {
  /**
   * @param {object} options
   * @param {HTMLElement}     options.container
   * @param {ExpenseService}  options.expenseService
   * @param {ExporterService} options.exporterService
   * @param {Function}        options.showToast
   */
  constructor({ container, expenseService, exporterService, showToast }) {
    this._container  = container;
    this._expenses   = expenseService;
    this._exporter   = exporterService;
    this._showToast  = showToast;

    const now = new Date();
    this._config = {
      rangeType:  'year',
      startDate:  `${now.getFullYear()}-01-01`,
      endDate:    now.toISOString().slice(0, 10),
      separator:  ';',
      taxOnly:    false,
    };

    this._render();
  }

  // ── Render ───────────────────────────────────────────────

  _render() {
    const preview = this._buildPreview();

    this._container.innerHTML = `
      <div class="view export-view">
        <h2 style="font-size:var(--font-size-xl);font-weight:var(--font-weight-bold)">Export</h2>

        <!-- Zeitraum -->
        <div class="export-section">
          <div class="export-section-title">Zeitraum</div>
          <div class="radio-group" role="radiogroup" aria-label="Exportzeitraum">
            ${this._radioItem('range', 'year',    'Aktuelles Jahr',  this._config.rangeType === 'year')}
            ${this._radioItem('range', 'lastyear','Letztes Jahr',    this._config.rangeType === 'lastyear')}
            ${this._radioItem('range', 'quarter', 'Aktuelles Quartal', this._config.rangeType === 'quarter')}
            ${this._radioItem('range', 'custom',  'Benutzerdefiniert', this._config.rangeType === 'custom')}
          </div>

          ${this._config.rangeType === 'custom' ? `
          <div class="date-range" style="padding:var(--space-3) var(--space-4)">
            <div class="field">
              <label class="label" for="export-start">Von</label>
              <input id="export-start" class="input" type="date" value="${this._config.startDate}" max="${this._config.endDate}">
            </div>
            <div class="field">
              <label class="label" for="export-end">Bis</label>
              <input id="export-end" class="input" type="date" value="${this._config.endDate}" min="${this._config.startDate}">
            </div>
          </div>` : ''}
        </div>

        <!-- Inhalt -->
        <div class="export-section">
          <div class="export-section-title">Inhalt</div>
          <div class="checkbox-item" style="padding:var(--space-3) var(--space-4)">
            <input type="checkbox" id="tax-only" ${this._config.taxOnly ? 'checked' : ''}>
            <label for="tax-only">Nur steuerrelevante Ausgaben</label>
          </div>
        </div>

        <!-- Format -->
        <div class="export-section">
          <div class="export-section-title">Trennzeichen (CSV)</div>
          <div class="radio-group" role="radiogroup" aria-label="CSV-Trennzeichen">
            ${this._radioItem('sep', ';', 'Semikolon ( ; ) — Excel DE (empfohlen)', this._config.separator === ';')}
            ${this._radioItem('sep', ',', 'Komma ( , ) — Excel EN',               this._config.separator === ',')}
          </div>
        </div>

        <!-- Vorschau -->
        <div class="export-section" aria-label="Export-Vorschau">
          <div class="export-section-title">Vorschau</div>
          <div style="padding:var(--space-4)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-4)">
              <div>
                <div style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold)">${preview.count}</div>
                <div style="font-size:var(--font-size-sm);color:var(--color-text-muted)">Ausgaben</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold)">${this._fmt(preview.total)} €</div>
                <div style="font-size:var(--font-size-sm);color:var(--color-text-muted)">Gesamt</div>
              </div>
            </div>
            <div style="font-size:var(--font-size-sm);color:var(--color-text-muted);display:flex;justify-content:space-between">
              <span>Steuerrelevant: ${this._fmt(preview.taxRelevant)} €</span>
              <span>Privat: ${this._fmt(preview.total - preview.taxRelevant)} €</span>
            </div>

            ${preview.count > 0 ? this._renderPreviewTable(preview) : `
              <div style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">
                Keine Ausgaben im gewählten Zeitraum
              </div>
            `}
          </div>
        </div>

        <!-- Export Buttons -->
        <div style="display:flex;flex-direction:column;gap:var(--space-3);padding-bottom:var(--space-8)">
          <button
            class="btn btn-primary btn-full btn-lg"
            id="download-csv"
            ${preview.count === 0 ? 'disabled aria-disabled="true"' : ''}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd"/>
            </svg>
            CSV herunterladen
          </button>

          ${navigator.share ? `
          <button class="btn btn-secondary btn-full" id="share-csv" ${preview.count === 0 ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z"/>
            </svg>
            Teilen
          </button>` : ''}

          <p style="text-align:center;font-size:var(--font-size-xs);color:var(--color-text-muted);padding:0 var(--space-4)">
            Alle Daten bleiben auf deinem Gerät — keine Server-Übertragung.
          </p>
        </div>
      </div>
    `;

    this._attachListeners();
  }

  _renderPreviewTable(preview) {
    const rows = (preview.firstRows || []).map((e) => {
      const cat   = this._exporter._categories.getById(e.categoryId);
      const date  = e.date.split('-').reverse().join('.');
      const amount = this._fmt(e.amount);
      return `
        <tr>
          <td>${date}</td>
          <td>${amount} €</td>
          <td>${this._esc(cat?.name || '—')}</td>
          <td>${cat?.taxRelevant ? '✓' : '—'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="overflow-x:auto;margin-top:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-md)">
        <table class="export-preview-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Betrag</th>
              <th>Kategorie</th>
              <th>Steuer</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${preview.count > 5 ? `<div style="text-align:center;padding:var(--space-2);font-size:var(--font-size-xs);color:var(--color-text-muted)">… und ${preview.count - 5} weitere</div>` : ''}
      </div>
    `;
  }

  _radioItem(name, value, label, checked) {
    return `
      <label class="radio-item">
        <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
        <span>${label}</span>
      </label>
    `;
  }

  // ── Event Listeners ──────────────────────────────────────

  _attachListeners() {
    // Range radio
    this._container.querySelectorAll('input[name="range"]').forEach((r) => {
      r.addEventListener('change', (e) => {
        this._config.rangeType = e.target.value;
        this._applyRangePreset(e.target.value);
        this._render();
      });
    });

    // Custom dates
    this._container.querySelector('#export-start')?.addEventListener('change', (e) => {
      this._config.startDate = e.target.value;
      this._render();
    });
    this._container.querySelector('#export-end')?.addEventListener('change', (e) => {
      this._config.endDate = e.target.value;
      this._render();
    });

    // Separator radio
    this._container.querySelectorAll('input[name="sep"]').forEach((r) => {
      r.addEventListener('change', (e) => {
        this._config.separator = e.target.value;
      });
    });

    // Tax only checkbox
    this._container.querySelector('#tax-only')?.addEventListener('change', (e) => {
      this._config.taxOnly = e.target.checked;
      this._render();
    });

    // Download
    this._container.querySelector('#download-csv')?.addEventListener('click', () => {
      this._downloadCSV();
    });

    // Share
    this._container.querySelector('#share-csv')?.addEventListener('click', () => {
      this._shareCSV();
    });
  }

  // ── Actions ──────────────────────────────────────────────

  _downloadCSV() {
    const expenses = this._getExpenses();
    if (!expenses.length) {
      this._showToast?.('Keine Ausgaben im gewählten Zeitraum', 'warning');
      return;
    }

    const csv      = this._exporter.generateCSV(expenses, { separator: this._config.separator });
    const filename = this._exporter.buildFilename(expenses);
    this._exporter.downloadCSV(csv, filename);
    this._showToast?.(`CSV exportiert: ${expenses.length} Ausgaben`, 'success');
  }

  async _shareCSV() {
    const expenses = this._getExpenses();
    if (!expenses.length) return;

    const csv  = this._exporter.generateCSV(expenses, { separator: this._config.separator });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], this._exporter.buildFilename(expenses), { type: 'text/csv' });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Ausgaben Export' });
      } else {
        await navigator.share({ title: 'Ausgaben Export', text: 'ExpenseTracker CSV Export' });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        this._showToast?.('Teilen nicht möglich — Datei wurde heruntergeladen', 'warning');
        this._downloadCSV();
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  _buildPreview() {
    const expenses = this._getExpenses();
    const data     = this._exporter.getPreviewData(expenses);
    data.firstRows = expenses.slice(0, 5);
    return data;
  }

  _getExpenses() {
    let list = this._expenses.getByPeriod(this._config.startDate, this._config.endDate);
    if (this._config.taxOnly) {
      list = list.filter((e) => {
        const cat = this._exporter._categories.getById(e.categoryId);
        return cat?.taxRelevant;
      });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  _applyRangePreset(type) {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth();
    switch (type) {
      case 'year':
        this._config.startDate = `${y}-01-01`;
        this._config.endDate   = now.toISOString().slice(0, 10);
        break;
      case 'lastyear':
        this._config.startDate = `${y - 1}-01-01`;
        this._config.endDate   = `${y - 1}-12-31`;
        break;
      case 'quarter': {
        const q     = Math.floor(m / 3);
        const qStart = new Date(y, q * 3, 1);
        const qEnd   = new Date(y, q * 3 + 3, 0);
        this._config.startDate = qStart.toISOString().slice(0, 10);
        this._config.endDate   = qEnd.toISOString().slice(0, 10);
        break;
      }
      case 'custom':
        // Keep existing dates
        break;
    }
  }

  _fmt(n) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
}
