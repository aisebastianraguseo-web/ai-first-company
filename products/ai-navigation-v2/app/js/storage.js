'use strict';

/**
 * StorageService — Persistent local storage with tenant isolation
 * 
 * WHY: Enterprise multi-tenant app needs local fallback storage
 * that is strictly isolated per tenant. This prevents data leakage
 * if multiple users share a browser (kiosk scenario) and provides
 * offline resilience when real-time connection drops.
 * 
 * LEARNING APPLIED: LEARN-001 — localStorage.getItem() returns null,
 * not undefined. Always provide fallback parameter.
 * 
 * SECURITY: Local storage is supplementary cache only. Source of truth
 * is always the server (Supabase + RLS). Sensitive tokens are NEVER
 * stored here (see governance/security-policy.md A02).
 */

const STORAGE_PREFIX = 'ai-nav-v2';
const STORAGE_VERSION = 1;

/**
 * Builds a tenant-scoped storage key.
 * Prevents cross-tenant data access in shared browsers.
 * 
 * @param {string} tenantId - UUID of the current tenant
 * @param {string} key - Logical data key
 * @returns {string} Namespaced storage key
 */
function buildKey(tenantId, key) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('[Storage] tenantId is required for all storage operations');
  }
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${tenantId}:${key}`;
}

/**
 * Validates that a value can be safely serialized.
 * Prevents circular reference errors and oversized writes.
 * 
 * @param {*} value - Value to validate
 * @param {number} maxBytes - Maximum serialized size (default 1MB)
 * @returns {string} Serialized JSON string
 */
function serializeValue(value, maxBytes = 1024 * 1024) {
  const serialized = JSON.stringify(value);
  if (serialized.length > maxBytes) {
    throw new Error(
      `[Storage] Value exceeds max size: ${serialized.length} bytes (max: ${maxBytes})`
    );
  }
  return serialized;
}

const StorageService = {
  /**
   * Save data to localStorage with tenant isolation.
   * 
   * @param {string} tenantId - Current tenant UUID
   * @param {string} key - Data key
   * @param {*} value - JSON-serializable value
   * @returns {boolean} true if write succeeded
   */
  save(tenantId, key, value) {
    try {
      const storageKey = buildKey(tenantId, key);
      const envelope = {
        data: value,
        savedAt: new Date().toISOString(),
        version: STORAGE_VERSION
      };
      const serialized = serializeValue(envelope);
      localStorage.setItem(storageKey, serialized);
      return true;
    } catch (error) {
      // QuotaExceededError, serialization errors, or security errors
      console.error('[Storage] Write failed:', error.message);
      return false;
    }
  },

  /**
   * Load data from localStorage with tenant isolation.
   * 
   * LEARNING: LEARN-001 — Always provide fallback.
   * localStorage.getItem() returns null for missing keys.
   * 
   * @param {string} tenantId - Current tenant UUID
   * @param {string} key - Data key
   * @param {*} fallback - Value returned if key doesn't exist or parse fails
   * @returns {*} Parsed data or fallback
   */
  load(tenantId, key, fallback = null) {
    try {
      const storageKey = buildKey(tenantId, key);
      const raw = localStorage.getItem(storageKey);

      if (raw === null) {
        return fallback;
      }

      const envelope = JSON.parse(raw);

      // Version migration: if stored version doesn't match, return fallback
      if (envelope.version !== STORAGE_VERSION) {
        console.warn(
          `[Storage] Version mismatch for key "${key}": ` +
          `stored v${envelope.version}, expected v${STORAGE_VERSION}. Returning fallback.`
        );
        return fallback;
      }

      return envelope.data;
    } catch (error) {
      console.error('[Storage] Read failed:', error.message);
      return fallback;
    }
  },

  /**
   * Remove a specific key for a tenant.
   * 
   * @param {string} tenantId - Current tenant UUID
   * @param {string} key - Data key to remove
   * @returns {boolean} true if removal succeeded
   */
  remove(tenantId, key) {
    try {
      const storageKey = buildKey(tenantId, key);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('[Storage] Remove failed:', error.message);
      return false;
    }
  },

  /**
   * Clear ALL data for a specific tenant.
   * Used during tenant offboarding or user logout on shared device.
   * 
   * WHY: GDPR Art. 17 — Right to erasure. When a tenant is offboarded,
   * all local cached data must be removable.
   * 
   * @param {string} tenantId - Tenant UUID whose data to purge
   * @returns {number} Count of removed keys
   */
  clearTenant(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('[Storage] tenantId is required for clearTenant');
    }

    const prefix = `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${tenantId}:`;
    let removedCount = 0;

    try {
      // Collect keys first to avoid mutation during iteration
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        removedCount++;
      });

      return removedCount;
    } catch (error) {
      console.error('[Storage] clearTenant failed:', error.message);
      return removedCount;
    }
  },

  /**
   * Check if localStorage is available and writable.
   * Some browsers disable it in private mode or when quota is exhausted.
   * 
   * @returns {boolean} true if storage is functional
   */
  isAvailable() {
    const testKey = `${STORAGE_PREFIX}:__test__`;
    try {
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get approximate storage usage for a tenant (in bytes).
   * Useful for monitoring and quota warnings.
   * 
   * @param {string} tenantId - Tenant UUID
   * @returns {number} Approximate bytes used
   */
  getTenantUsage(tenantId) {
    const prefix = `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${tenantId}:`;
    let totalBytes = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const value = localStorage.getItem(key);
          // Each char in JS is 2 bytes (UTF-16), but localStorage uses DOMString
          totalBytes += (key.length + (value ? value.length : 0)) * 2;
        }
      }
    } catch (error) {
      console.error('[Storage] Usage calculation failed:', error.message);
    }

    return totalBytes;
  }
};

export { StorageService };
export default StorageService;
