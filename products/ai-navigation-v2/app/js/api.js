'use strict';

/**
 * APIService — Backend communication layer (Supabase)
 * 
 * WHY: Centralizes all backend calls to enforce:
 * 1. Consistent error handling
 * 2. Tenant isolation via JWT (security-policy.md A01, A07)
 * 3. Rate limiting awareness
 * 4. Offline resilience (queue + retry)
 * 
 * This module abstracts Supabase-specific details so the rest
 * of the app doesn't couple to the backend provider.
 * 
 * SECURITY: JWT tokens are managed by Supabase Auth client,
 * never stored in localStorage by our code (security-policy.md A02).
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} ok - Whether the request succeeded
 * @property {*} data - Response data (null on error)
 * @property {string|null} error - Error message (null on success)
 * @property {number} status - HTTP status code
 */

/**
 * Configuration — injected at init, not hardcoded.
 * Supabase URL and anon key are public (RLS enforces security).
 */
let _config = {
  supabaseUrl: null,
  supabaseAnonKey: null,
  getAccessToken: null  // Async function that returns current JWT
};

/**
 * Request queue for offline resilience.
 * Stores pending mutations that failed due to network issues.
 */
const _pendingQueue = [];

/**
 * Rate limit tracking per endpoint category.
 */
const _rateLimitState = {
  filterConfig: {
    maxPerMinute: 30,
    timestamps: []
  }
};

/**
 * Check if a request category is rate-limited.
 * 
 * @param {string} category - Rate limit category
 * @returns {boolean} true if the request should be blocked
 */
function isRateLimited(category) {
  const state = _rateLimitState[category];
  if (!state) return false;

  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Clean old timestamps
  state.timestamps = state.timestamps.filter(t => t > oneMinuteAgo);

  if (state.timestamps.length >= state.maxPerMinute) {
    return true;
  }

  state.timestamps.push(now);
  return false;
}

/**
 * Execute a fetch request with auth headers and error handling.
 * 
 * @param {string} path - API path (relative to supabaseUrl)
 * @param {Object} options - Fetch options
 * @returns {Promise<APIResponse>}
 */
async function request(path, options = {}) {
  if (!_config.supabaseUrl) {
    return { ok: false, data: null, error: 'API not initialized', status: 0 };
  }

  const url = `${_config.supabaseUrl}${path}`;

  try {
    const token = _config.getAccessToken
      ? await _config.getAccessToken()
      : null;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': _config.supabaseAnonKey,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle non-JSON responses gracefully
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      // SECURITY: Don't expose detailed error info to console in production
      // Generic error for client, detailed info for server logs
      const errorMessage = getClientSafeError(response.status, data);
      return { ok: false, data: null, error: errorMessage, status: response.status };
    }

    return { ok: true, data, error: null, status: response.status };
  } catch (error) {
    // Network error (offline, DNS failure, etc.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        ok: false,
        data: null,
        error: 'Verbindung zum Server nicht möglich. Bitte prüfen Sie Ihre Internetverbindung.',
        status: 0
      };
    }

    return {
      ok: false,
      data: null,
      error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      status: 0
    };
  }
}

/**
 * Map HTTP status to client-safe error messages.
 * SECURITY: Never expose internal details (governance/security-policy.md A05).
 * 
 * @param {number} status - HTTP status code
 * @param {*} data - Response body (may contain error details)
 * @returns {string} Client-safe error message
 */
function getClientSafeError(status, data) {
  switch (status) {
    case 400:
      return 'Ungültige Anfrage. Bitte prüfen Sie Ihre Eingaben.';
    case 401:
      return 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
    case 403:
      // SECURITY: Generic message — don't reveal if resource exists for other tenant
      return 'Zugriff verweigert.';
    case 404:
      return 'Die angeforderte Ressource wurde nicht gefunden.';
    case 429:
      return 'Zu viele Anfragen. Bitte warten Sie einen Moment.';
    case 500:
    case 502:
    case 503:
      return 'Serverfehler. Bitte versuchen Sie es in einigen Minuten erneut.';
    default:
      return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }
}


const APIService = {
  /**
   * Initialize the API service with Supabase credentials.
   * Must be called before any other API method.
   * 
   * @param {Object} config
   * @param {string} config.supabaseUrl - Supabase project URL
   * @param {string} config.supabaseAnonKey - Supabase anon/public key
   * @param {Function} config.getAccessToken - Async fn returning current JWT
   */
  init(config) {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error('[API] supabaseUrl and supabaseAnonKey are required');
    }
    _config = { ..._config, ...config };
  },

  /**
   * Load the filter configuration for the current tenant.
   * Tenant isolation is enforced by RLS — the JWT's tenant_id claim
   * determines which rows are returned.
   * 
   * @returns {Promise<APIResponse>}
   */
  async loadFilterConfig() {
    return request('/rest/v1/filter_configurations?select=*', {
      method: 'GET'
    });
  },

  /**
   * Save (upsert) the filter configuration for the current tenant.
   * Rate limited: max 30 changes per minute.
   * 
   * @param {Object} config - Validated filter configuration
   * @param {string[]} config.keywords
   * @param {Object} config.sourceWeights
   * @param {number} config.relevanceThreshold
   * @returns {Promise<APIResponse>}
   */
  async saveFilterConfig(config) {
    if (isRateLimited('filterConfig')) {
      return {
        ok: false,
        data: null,
        error: 'Zu viele Änderungen. Bitte warten Sie einen Moment.',
        status: 429
      };
    }

    return request('/rest/v1/filter_configurations', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates'  // Supabase upsert
      },
      body: JSON.stringify({
        keywords: config.keywords,
        source_weights: config.sourceWeights,
        relevance_threshold: config.relevanceThreshold,
        updated_at: new Date().toISOString()
      })
    });
  },

  /**
   * Load available signal sources.
   * These are system-wide (not tenant-specific).
   * 
   * @returns {Promise<APIResponse>}
   */
  async loadSources() {
    return request('/rest/v1/signal_sources?select=id,name,description&is_active=eq.true', {
      method: 'GET'
    });
  },

  /**
   * Load filtered signals for the feed.
   * Server applies tenant's filter config via RPC function.
   * 
   * @param {Object} options
   * @param {number} options.limit - Max signals to return
   * @param {number} options.offset - Pagination offset
   * @returns {Promise<APIResponse>}
   */
  async loadFilteredSignals(options = {}) {
    const { limit = 50, offset = 0 } = options;

    return request('/rest/v1/rpc/get_filtered_signals', {
      method: 'POST',
      body: JSON.stringify({ p_limit: limit, p_offset: offset })
    });
  },

  /**
   * Estimate weekly signal count for a given threshold.
   * Used by the threshold slider to show "ca. X Signale pro Woche".
   * 
   * @param {number} threshold - Relevance threshold (0.0–1.0)
   * @returns {Promise<APIResponse>}
   */
  async estimateSignalCount(threshold) {
    return request('/rest/v1/rpc/estimate_signal_count', {
      method: 'POST',
      body: JSON.stringify({ p_threshold: threshold })
    });
  },

  /**
   * Queue a mutation for retry when offline.
   * Called when a save fails due to network issues.
   * 
   * @param {string} operation - Operation identifier
   * @param {Object} data - Data to save
   */
  queueForRetry(operation, data) {
    _pendingQueue.push({
      operation,
      data,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    });
  },

  /**
   * Process the pending queue (called on reconnect).
   * 
   * @returns {Promise<number>} Number of successfully processed items
   */
  async processPendingQueue() {
    let successCount = 0;
    const maxRetries = 3;

    while (_pendingQueue.length > 0) {
      const item = _pendingQueue[0];

      if (item.retryCount >= maxRetries) {
        _pendingQueue.shift(); // Give up on this item
        console.error('[API] Max retries exceeded for:', item.operation);
        continue;
      }

      try {
        let result;
        if (item.operation === 'saveFilterConfig') {
          result = await this.saveFilterConfig(item.data);
        }

        if (result && result.ok) {
          _pendingQueue.shift();
          successCount++;
        } else {
          item.retryCount++;
          break; // Stop processing, try again later
        }
      } catch (error) {
        item.retryCount++;
        break;
      }
    }

    return successCount;
  },

  /**
   * Get count of pending queue items.
   * @returns {number}
   */
  getPendingCount() {
    return _pendingQueue.length;
  }
};

export { APIService };
export default APIService;
