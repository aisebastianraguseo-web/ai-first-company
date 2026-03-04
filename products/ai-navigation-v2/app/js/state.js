'use strict';

/**
 * AppState — Centralized reactive state management
 * 
 * WHY: Multi-component UI (keywords, source weights, relevance threshold,
 * feed) needs a single source of truth with change notifications.
 * Components subscribe to specific state keys and re-render on change.
 * 
 * Pattern: Observable Store (pub/sub) — no framework dependency.
 * 
 * SECURITY: State object never holds auth tokens or raw JWTs.
 * Auth state is managed separately via AuthService.
 */

/**
 * Creates a new isolated state store.
 * Factory function allows multiple stores if needed (e.g., test isolation).
 * 
 * @param {Object} initialState - Starting state shape
 * @returns {Object} Store with get/set/subscribe/reset API
 */
function createStore(initialState = {}) {
  // Deep clone to prevent external mutation of initial state
  const _initialState = JSON.parse(JSON.stringify(initialState));
  let _state = JSON.parse(JSON.stringify(initialState));
  const _listeners = {};
  const _globalListeners = [];

  return {
    /**
     * Get a value by key path (supports dot notation).
     * 
     * @param {string} keyPath - e.g., 'filterConfig.keywords' or 'ui.loading'
     * @returns {*} Value at path, or undefined if path doesn't exist
     */
    get(keyPath) {
      return keyPath.split('.').reduce((obj, key) => {
        return (obj !== null && obj !== undefined) ? obj[key] : undefined;
      }, _state);
    },

    /**
     * Set a value by key path, notifying subscribers.
     * 
     * @param {string} keyPath - Dot-notation path
     * @param {*} value - New value
     */
    set(keyPath, value) {
      const keys = keyPath.split('.');
      const lastKey = keys.pop();
      const oldValue = this.get(keyPath);

      // Navigate to parent, creating intermediate objects if needed
      let current = _state;
      for (const key of keys) {
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }

      current[lastKey] = value;

      // Notify key-specific listeners
      this._notify(keyPath, oldValue, value);

      // Also notify parent path listeners (e.g., 'filterConfig' when 'filterConfig.keywords' changes)
      let parentPath = '';
      for (const key of keyPath.split('.').slice(0, -1)) {
        parentPath = parentPath ? `${parentPath}.${key}` : key;
        if (_listeners[parentPath]) {
          _listeners[parentPath].forEach(fn => {
            try {
              fn(this.get(parentPath), undefined, keyPath);
            } catch (error) {
              console.error(`[State] Listener error for "${parentPath}":`, error.message);
            }
          });
        }
      }
    },

    /**
     * Subscribe to changes on a specific key path.
     * 
     * @param {string} keyPath - Path to watch
     * @param {Function} fn - Callback: (newValue, oldValue, changedPath) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(keyPath, fn) {
      if (typeof fn !== 'function') {
        throw new Error('[State] Subscriber must be a function');
      }

      if (!_listeners[keyPath]) {
        _listeners[keyPath] = [];
      }
      _listeners[keyPath].push(fn);

      // Return unsubscribe function for cleanup
      return () => {
        _listeners[keyPath] = _listeners[keyPath].filter(listener => listener !== fn);
      };
    },

    /**
     * Subscribe to ALL state changes (useful for debug logging, persistence).
     * 
     * @param {Function} fn - Callback: (keyPath, newValue, oldValue) => void
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(fn) {
      if (typeof fn !== 'function') {
        throw new Error('[State] Global subscriber must be a function');
      }
      _globalListeners.push(fn);
      return () => {
        const idx = _globalListeners.indexOf(fn);
        if (idx > -1) _globalListeners.splice(idx, 1);
      };
    },

    /**
     * Get a snapshot of the entire state (deep clone).
     * Safe for logging/debugging — mutations won't affect store.
     * 
     * @returns {Object} Deep clone of current state
     */
    getSnapshot() {
      return JSON.parse(JSON.stringify(_state));
    },

    /**
     * Reset state to initial values. Notifies all subscribers.
     */
    reset() {
      const oldSnapshot = this.getSnapshot();
      _state = JSON.parse(JSON.stringify(_initialState));

      // Notify all key-specific listeners
      Object.keys(_listeners).forEach(keyPath => {
        const newValue = this.get(keyPath);
        _listeners[keyPath].forEach(fn => {
          try {
            fn(newValue, undefined, keyPath);
          } catch (error) {
            console.error(`[State] Reset listener error for "${keyPath}":`, error.message);
          }
        });
      });

      // Notify global listeners
      _globalListeners.forEach(fn => {
        try {
          fn('__reset__', _state, oldSnapshot);
        } catch (error) {
          console.error('[State] Reset global listener error:', error.message);
        }
      });
    },

    /**
     * Batch multiple state updates, firing notifications only once per key.
     * Prevents UI thrashing during multi-field updates.
     * 
     * @param {Function} updateFn - Receives store, call set() multiple times
     */
    batch(updateFn) {
      const pendingNotifications = [];
      const originalNotify = this._notify.bind(this);

      // Temporarily queue notifications
      this._notify = (keyPath, oldValue, newValue) => {
        pendingNotifications.push({ keyPath, oldValue, newValue });
      };

      try {
        updateFn(this);
      } finally {
        // Restore original notify
        this._notify = originalNotify;

        // Deduplicate: only fire last notification per keyPath
        const seen = new Map();
        pendingNotifications.forEach(({ keyPath, oldValue, newValue }) => {
          if (!seen.has(keyPath)) {
            seen.set(keyPath, { oldValue, newValue });
          } else {
            // Keep original oldValue, update newValue
            seen.get(keyPath).newValue = newValue;
          }
        });

        seen.forEach(({ oldValue, newValue }, keyPath) => {
          this._notify(keyPath, oldValue, newValue);
        });
      }
    },

    /**
     * Internal: notify listeners for a specific key path.
     * @private
     */
    _notify(keyPath, oldValue, newValue) {
      const listeners = _listeners[keyPath] || [];
      listeners.forEach(fn => {
        try {
          fn(newValue, oldValue, keyPath);
        } catch (error) {
          console.error(`[State] Listener error for "${keyPath}":`, error.message);
        }
      });

      // Global listeners
      _globalListeners.forEach(fn => {
        try {
          fn(keyPath, newValue, oldValue);
        } catch (error) {
          console.error('[State] Global listener error:', error.message);
        }
      });
    }
  };
}

/**
 * Default application state shape for AI Navigation V2.
 * 
 * This defines the complete state tree. Every piece of UI state
 * and domain data has a home here.
 */
const DEFAULT_STATE = {
  // Authentication context (no tokens — only identity metadata)
  auth: {
    isAuthenticated: false,
    userId: null,
    tenantId: null,
    role: null
  },

  // Filter configuration (mirrors DB schema from feature spec)
  filterConfig: {
    keywords: [],
    sourceWeights: {},
    relevanceThreshold: 0.5,
    isDirty: false,              // Unsaved changes indicator
    lastSavedAt: null,
    isSaving: false,
    saveError: null
  },

  // Available signal sources (loaded from backend)
  sources: {
    available: [],               // [{id, name, description}]
    isLoading: false,
    loadError: null
  },

  // Signal feed (filtered results)
  feed: {
    signals: [],
    isLoading: false,
    loadError: null,
    lastUpdatedAt: null,
    estimatedWeeklyCount: null   // For threshold slider hint
  },

  // Real-time connection status
  connection: {
    isConnected: false,
    reconnectAttempts: 0,
    pendingSignalCount: 0        // Signals received during disconnect
  },

  // UI transient state
  ui: {
    showOnboarding: false,       // First-visit intro
    activeTooltip: null,         // Currently shown tooltip ID
    confirmDialog: null,         // {type, message, onConfirm, onCancel}
    notifications: []            // [{id, type, message, timestamp}]
  }
};

// Singleton store for the application
const AppState = createStore(DEFAULT_STATE);

export { createStore, DEFAULT_STATE, AppState };
export default AppState;
