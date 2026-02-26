// exporter.js — CSV export (UTF-8 BOM, German format, Excel-compatible)

const SEPARATOR_SEMICOLON = ';';
const SEPARATOR_COMMA     = ',';
const SEPARATOR_TAB       = '\t';

const PAYMENT_METHOD_LABELS = {
  cash:     'Bar',
  card:     'Karte',
  transfer: 'Überweisung',
  other:    'Sonstige',
};

export class ExporterService {
  constructor(categoryService) {
    this._categories = categoryService;
  }

  /**
   * Generate CSV string from expenses array.
   * @param {object[]} expenses
   * @param {object}   options  { separator, includeHeader, includeSummary }
   * @returns {string} UTF-8 BOM + CSV
   */
  generateCSV(expenses, options = {}) {
    const sep = options.separator ?? SEPARATOR_SEMICOLON;
    const includeSummary = options.includeSummary !== false;

    const BOM    = '\uFEFF'; // UTF-8 BOM — Windows Excel compatibility
    const header = [
      'Datum', 'Betrag (EUR)', 'Kategorie', 'Steuerrelevant',
      'Beschreibung', 'Händler', 'Zahlungsart', 'Beleg-Datei', 'Erfasst am',
    ].join(sep);

    const rows = expenses
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => this._expenseToRow(e, sep));

    const lines = [header, ...rows];

    if (includeSummary) {
      lines.push(...this._buildSummary(expenses, sep));
    }

    return BOM + lines.join('\r\n');
  }

  /**
   * Trigger browser file download.
   * @param {string} content  CSV string
   * @param {string} filename
   */
  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after short delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Build suggested filename: ausgaben_YYYY-MM-DD_YYYY-MM-DD.csv
   * @param {object[]} expenses
   * @returns {string}
   */
  buildFilename(expenses) {
    if (!expenses.length) return `ausgaben_leer.csv`;
    const dates = expenses.map((e) => e.date).sort();
    const start = dates[0];
    const end   = dates[dates.length - 1];
    return `ausgaben_${start}_${end}.csv`;
  }

  /**
   * Summary data for preview dialog.
   */
  getPreviewData(expenses) {
    if (!expenses.length) {
      return { total: 0, taxRelevant: 0, count: 0, byCategory: [] };
    }

    let total = 0;
    let taxRelevant = 0;
    const byCat = {};

    for (const e of expenses) {
      total += e.amount;
      const cat = this._categories.getById(e.categoryId);
      if (cat?.taxRelevant) taxRelevant += e.amount;
      const key = cat?.name || 'Unbekannt';
      byCat[key] = (byCat[key] || 0) + e.amount;
    }

    const byCategory = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount }));

    return { total, taxRelevant, count: expenses.length, byCategory };
  }

  // ── Private Helpers ──────────────────────────────────────

  _expenseToRow(expense, sep) {
    const cat       = this._categories.getById(expense.categoryId);
    const dateDE    = expense.date.split('-').reverse().join('.');
    const amountDE  = expense.amount.toFixed(2).replace('.', ',');
    const createdAt = new Date(expense.createdAt).toLocaleString('de-DE');

    return [
      dateDE,
      amountDE,
      this._csvCell(cat?.name || 'Unbekannt', sep),
      cat?.taxRelevant ? 'Ja' : 'Nein',
      this._csvCell(expense.description || '', sep),
      this._csvCell(expense.merchant    || '', sep),
      PAYMENT_METHOD_LABELS[expense.paymentMethod] || 'Sonstige',
      expense.receipt?.fileName || '',
      createdAt,
    ].join(sep);
  }

  _buildSummary(expenses, sep) {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const taxRelevant = expenses
      .filter((e) => this._categories.getById(e.categoryId)?.taxRelevant)
      .reduce((s, e) => s + e.amount, 0);

    const byCat = {};
    for (const e of expenses) {
      const name = this._categories.getById(e.categoryId)?.name || 'Unbekannt';
      byCat[name] = (byCat[name] || 0) + e.amount;
    }

    const catRows = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amt]) => `${this._csvCell(name, sep)}${sep}${amt.toFixed(2).replace('.', ',')}`);

    const fmt = (n) => n.toFixed(2).replace('.', ',');
    return [
      '',
      'ZUSAMMENFASSUNG',
      `Zeitraum${sep}${expenses[0]?.date.split('-').reverse().join('.')} - ${expenses[expenses.length - 1]?.date.split('-').reverse().join('.')}`,
      `Anzahl Ausgaben${sep}${expenses.length}`,
      `Gesamtbetrag${sep}${fmt(total)} EUR`,
      `Steuerrelevant${sep}${fmt(taxRelevant)} EUR`,
      `Nicht steuerrelevant${sep}${fmt(total - taxRelevant)} EUR`,
      '',
      'NACH KATEGORIE',
      ...catRows,
    ];
  }

  /**
   * Escape a cell value for CSV:
   * - Neutralize formula injection (=, +, -, @, tab, CR)
   * - Wrap in quotes if it contains separator, quote, or newline
   */
  _csvCell(value, sep) {
    let str = String(value ?? '');

    // Neutralize formula injection (OWASP CSV Injection prevention)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Quote if contains separator, double-quote, or newline
    if (str.includes(sep) || str.includes('"') || /[\r\n]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}
