'use strict';

/**
 * APIService — Backend communication layer (Supabase Auth + REST)
 *
 * Auth: Supabase Auth REST API (no SDK dependency).
 * Session token stored in sessionStorage (cleared on tab close, never persists
 * to localStorage — governance/security-policy.md A02).
 * RLS on all tables enforces tenant isolation server-side.
 */

let _config = {
  supabaseUrl: null,
  supabaseAnonKey: null,
};

// In-memory session. Also backed by sessionStorage for page-reload resilience.
let _session = null;

const _rateLimitState = {
  filterConfig: { maxPerMinute: 30, timestamps: [] },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function isRateLimited(category) {
  const s = _rateLimitState[category];
  if (!s) return false;
  const now = Date.now();
  s.timestamps = s.timestamps.filter(t => t > now - 60000);
  if (s.timestamps.length >= s.maxPerMinute) return true;
  s.timestamps.push(now);
  return false;
}

async function request(path, options = {}) {
  if (!_config.supabaseUrl) return { ok: false, data: null, error: 'API not initialised', status: 0 };

  const token = _session?.access_token;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': _config.supabaseAnonKey,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${_config.supabaseUrl}${path}`, {
      ...options,
      headers,
    });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json') && res.status !== 204) {
      data = await res.json();
    }

    return { ok: res.ok, data, error: res.ok ? null : (data?.message || data?.error_description || String(res.status)), status: res.status };
  } catch (err) {
    return { ok: false, data: null, error: 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung.', status: 0 };
  }
}

function saveSession(session) {
  _session = session;
  if (session) {
    sessionStorage.setItem('ai_nav_session', JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
    }));
  } else {
    sessionStorage.removeItem('ai_nav_session');
  }
}

function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem('ai_nav_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Public API ────────────────────────────────────────────────────────────────

const APIService = {

  init({ supabaseUrl, supabaseAnonKey }) {
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('[API] credentials required');
    _config = { supabaseUrl, supabaseAnonKey };
    // Restore session from sessionStorage on page load
    const stored = loadStoredSession();
    if (stored) _session = stored;
  },

  // ── Auth ────────────────────────────────────────────────────────────────────

  async login(email, password) {
    const res = await fetch(`${_config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _config.supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, data: null, error: data.error_description || 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.', status: res.status };
    }

    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: { id: data.user.id, email: data.user.email, tenantId: data.user.id },
    };
    saveSession(session);
    return { ok: true, data: { user: session.user }, error: null, status: 200 };
  },

  async logout() {
    if (_session?.access_token) {
      await fetch(`${_config.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': _config.supabaseAnonKey,
          'Authorization': `Bearer ${_session.access_token}`,
        },
      }).catch(() => {});
    }
    saveSession(null);
    return { ok: true, data: null, error: null, status: 204 };
  },

  async getSession() {
    if (!_config.supabaseUrl) return null;

    // Use in-memory session if available
    if (_session?.access_token) {
      // Verify token is still valid
      const res = await fetch(`${_config.supabaseUrl}/auth/v1/user`, {
        headers: {
          'apikey': _config.supabaseAnonKey,
          'Authorization': `Bearer ${_session.access_token}`,
        },
      }).catch(() => null);

      if (res?.ok) {
        const user = await res.json();
        _session.user = { id: user.id, email: user.email, tenantId: user.id };
        return { user: _session.user };
      } else {
        // Token expired
        saveSession(null);
        return null;
      }
    }
    return null;
  },

  // ── Filter Config ───────────────────────────────────────────────────────────

  async getFilterConfig() {
    const res = await request('/rest/v1/filter_configurations?select=*&limit=1', { method: 'GET' });
    if (!res.ok) return res;
    const row = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!row) return { ok: true, data: null, error: null, status: 200 };
    return {
      ok: true,
      data: {
        keywords: row.keywords || [],
        weights: row.source_weights || { github: 50, arxiv: 30, hn: 20 },
        threshold: row.relevance_threshold ?? 60,
      },
      error: null,
      status: 200,
    };
  },

  async saveFilterConfig(_userId, config) {
    if (isRateLimited('filterConfig')) {
      return { ok: false, data: null, error: 'Zu viele Änderungen. Bitte warten Sie einen Moment.', status: 429 };
    }

    return request('/rest/v1/filter_configurations', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: _session?.user?.id,
        keywords: config.keywords,
        source_weights: config.weights,
        relevance_threshold: config.threshold,
        updated_at: new Date().toISOString(),
      }),
    });
  },

  // ── CLEAR Analysis ──────────────────────────────────────────────────────────

  async runClearAnalysis(_userId, { dimensions, context }) {
    return request('/functions/v1/clear-analysis', {
      method: 'POST',
      body: JSON.stringify({ dimensions, context }),
    });
  },

  async getAnalysisHistory() {
    const res = await request(
      '/rest/v1/clear_analyses?select=*&order=created_at.desc&limit=50',
      { method: 'GET' }
    );
    return res;
  },
};

export { APIService };
export default APIService;
