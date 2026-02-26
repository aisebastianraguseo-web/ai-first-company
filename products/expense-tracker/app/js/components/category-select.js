// category-select.js — Accessible category dropdown component

export class CategorySelect {
  /**
   * @param {object} options
   * @param {HTMLElement}       options.container
   * @param {CategoryService}   options.categoryService
   * @param {Function}          options.onChange   (category) => void
   * @param {string|null}       options.value      initial category id
   */
  constructor({ container, categoryService, onChange, value = null }) {
    this._container  = container;
    this._categories = categoryService;
    this._onChange   = onChange;
    this._value      = value;
    this._open       = false;
    this._query      = '';
    this._focusIdx   = -1;

    this._render();
    this._attachListeners();
  }

  getValue()  { return this._value; }
  hasError()  { return !this._value; }

  showError() {
    const btn = this._container.querySelector('.category-button');
    if (btn) btn.classList.add('input--error');
  }

  clearError() {
    const btn = this._container.querySelector('.category-button');
    if (btn) btn.classList.remove('input--error');
  }

  // ── Rendering ────────────────────────────────────────────

  _render() {
    const cat = this._value ? this._categories.getById(this._value) : null;

    this._container.innerHTML = `
      <div class="field" style="position:relative">
        <label class="label label-required" id="cat-label">Kategorie</label>
        <button
          type="button"
          class="category-button ${this._value ? '' : 'category-button-placeholder'}"
          aria-haspopup="listbox"
          aria-expanded="${this._open}"
          aria-labelledby="cat-label"
          aria-describedby="cat-hint"
          id="cat-btn"
        >
          ${cat
            ? `<span aria-hidden="true">${cat.icon}</span><span>${this._esc(cat.name)}</span>`
            : `<span style="color:var(--color-text-disabled)">Kategorie auswählen …</span>`
          }
          <svg style="margin-left:auto;flex-shrink:0" width="18" height="18" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
          </svg>
        </button>
        <span class="field-hint" id="cat-hint" style="display:none"></span>

        ${this._open ? this._renderDropdown() : ''}
      </div>
    `;
  }

  _renderDropdown() {
    const recent   = this._categories.getRecent();
    const filtered = this._categories.search(this._query);

    let html = `
      <div
        class="category-dropdown"
        role="listbox"
        aria-labelledby="cat-label"
        id="cat-listbox"
      >
        <div class="category-search" role="search">
          <input
            type="search"
            class="input"
            placeholder="Suchen…"
            value="${this._esc(this._query)}"
            id="cat-search"
            autocomplete="off"
            aria-label="Kategorien durchsuchen"
            style="min-height:40px"
          >
        </div>
    `;

    if (!this._query && recent.length) {
      html += `<div class="category-group-label" role="presentation">Zuletzt verwendet</div>`;
      for (const cat of recent) {
        html += this._renderOption(cat);
      }
      html += `<div class="category-group-label" role="presentation">Alle Kategorien</div>`;
    }

    if (filtered.length) {
      for (const cat of filtered) {
        if (!this._query && recent.some((r) => r.id === cat.id)) continue;
        html += this._renderOption(cat);
      }
    } else {
      html += `<div style="padding:var(--space-4);color:var(--color-text-muted);font-size:var(--font-size-sm)">
        Keine Kategorie gefunden
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  _renderOption(cat) {
    const selected = cat.id === this._value;
    return `
      <div
        class="category-option"
        role="option"
        aria-selected="${selected}"
        data-id="${this._esc(cat.id)}"
        tabindex="-1"
      >
        <span class="category-option-icon" aria-hidden="true">${cat.icon}</span>
        <span class="category-option-name">${this._esc(cat.name)}</span>
        ${selected ? `<svg style="margin-left:auto;color:var(--color-primary)" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>` : ''}
      </div>
    `;
  }

  // ── Event Listeners ──────────────────────────────────────

  _attachListeners() {
    const btn = this._container.querySelector('#cat-btn');
    if (!btn) return;

    btn.addEventListener('click', () => this._toggle());
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this._open) this._openDropdown();
      }
    });

    if (this._open) {
      this._bindDropdownListeners();
    }

    // Close on outside click
    document.addEventListener('click', this._handleOutsideClick.bind(this), { once: true });
  }

  _bindDropdownListeners() {
    const search = this._container.querySelector('#cat-search');
    if (search) {
      search.focus();
      search.addEventListener('input', (e) => {
        this._query = e.target.value;
        this._rerenderDropdown();
      });
      search.addEventListener('keydown', (e) => this._handleKeydown(e));
    }

    this._container.querySelectorAll('.category-option').forEach((opt) => {
      opt.addEventListener('click', () => this._select(opt.dataset.id));
      opt.addEventListener('keydown', (e) => this._handleKeydown(e));
    });
  }

  _handleKeydown(e) {
    const options = [...this._container.querySelectorAll('.category-option')];
    if (!options.length) return;

    if (e.key === 'Escape') {
      this._closeDropdown();
      this._container.querySelector('#cat-btn')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._focusIdx = Math.min(this._focusIdx + 1, options.length - 1);
      options[this._focusIdx]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._focusIdx = Math.max(this._focusIdx - 1, 0);
      options[this._focusIdx]?.focus();
    } else if (e.key === 'Enter' && document.activeElement.classList.contains('category-option')) {
      e.preventDefault();
      this._select(document.activeElement.dataset.id);
    }
  }

  _handleOutsideClick = (e) => {
    if (!this._container.contains(e.target)) {
      this._closeDropdown();
    }
  };

  // ── State Changes ────────────────────────────────────────

  _toggle() {
    this._open ? this._closeDropdown() : this._openDropdown();
  }

  _openDropdown() {
    this._open = true;
    this._query = '';
    this._focusIdx = -1;
    this._render();
    this._attachListeners();
    document.addEventListener('click', this._handleOutsideClick, { once: true });
  }

  _closeDropdown() {
    this._open = false;
    this._render();
    this._attachListeners();
    document.removeEventListener('click', this._handleOutsideClick);
  }

  _rerenderDropdown() {
    const dropdown = this._container.querySelector('.category-dropdown');
    if (dropdown) {
      dropdown.outerHTML = this._renderDropdown();
      this._bindDropdownListeners();
    }
  }

  _select(id) {
    const cat = this._categories.getById(id);
    if (!cat) return;
    this._value = id;
    this._categories.markUsed(id);
    this._closeDropdown();
    this.clearError();
    this._onChange?.(cat);
  }

  _esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
}
