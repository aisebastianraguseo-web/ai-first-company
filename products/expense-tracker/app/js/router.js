// router.js — Hash-based SPA Router

export class Router {
  constructor() {
    this._routes   = new Map();   // path → handler
    this._current  = null;
    this._onChange = null;

    window.addEventListener('hashchange', () => this._dispatch());
    window.addEventListener('load',       () => this._dispatch());
  }

  /**
   * Register a route.
   * @param {string}   path     e.g. '/', '/add', '/export'
   * @param {Function} handler  async (params) => void
   */
  on(path, handler) {
    this._routes.set(path, handler);
    return this;
  }

  /**
   * Navigate to a path programmatically.
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Called on every route change with current path.
   */
  onChange(fn) {
    this._onChange = fn;
  }

  getCurrent() {
    return this._current;
  }

  // ─── Private ────────────────────────────────────────────

  _dispatch() {
    const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0] || '/';

    this._current = path;
    this._onChange?.(path);

    const handler = this._routes.get(path);
    if (handler) {
      handler({ path });
    } else {
      // 404 fallback → home
      this.navigate('/');
    }
  }
}
