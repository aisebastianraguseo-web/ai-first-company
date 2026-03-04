'use strict';

/**
 * ValidationService — Input validation and sanitization
 * 
 * WHY: Keywords are a primary injection vector (see feature spec,
 * Hans persona — Adversarial). Keywords flow into:
 * 1. Database queries (SQL injection risk → mitigated by RLS + parameterized queries)
 * 2. Claude analysis prompts (Prompt injection risk → must sanitize)
 * 3. HTML rendering (XSS risk → must sanitize)
 * 
 * All validation is applied BOTH client-side (immediate feedback) and
 * server-side (defense in depth). This module handles client-side.
 * 
 * Governance: governance/security-policy.md A03 (Injection)
 */

// Business rule: Keywords allow alphanumeric, hyphens, spaces, dots only
const KEYWORD_PATTERN = /^[a-zA-Z0-9äöüÄÖÜß\s.\-]+$/;
const KEYWORD_MAX_LENGTH = 100;
const KEYWORD_MAX_COUNT = 50;

const SOURCE_WEIGHT_MIN = 0;
const SOURCE_WEIGHT_MAX = 100;

const RELEVANCE_MIN = 0.0;
const RELEVANCE_MAX = 1.0;

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the input passed validation
 * @property {*} value - Sanitized/normalized value (only if valid)
 * @property {string|null} error - Human-readable error message (German)
 */

const ValidationService = {
  /**
   * Validate and normalize a keyword input.
   * 
   * Business rules applied:
   * - Trimmed and lowercased
   * - Must match allowlist pattern (alphanumeric + hyphens + dots + spaces)
   * - Max 100 characters
   * - No empty strings
   * - No duplicate check here (that's a list-level concern)
   * 
   * @param {string} input - Raw keyword input from user
   * @returns {ValidationResult}
   */
  validateKeyword(input) {
    if (input === null || input === undefined) {
      return { valid: false, value: null, error: 'Keyword darf nicht leer sein.' };
    }

    const trimmed = String(input).trim();

    if (trimmed.length === 0) {
      return { valid: false, value: null, error: 'Keyword darf nicht leer sein.' };
    }

    if (trimmed.length > KEYWORD_MAX_LENGTH) {
      return {
        valid: false,
        value: null,
        error: `Keyword darf maximal ${KEYWORD_MAX_LENGTH} Zeichen lang sein.`
      };
    }

    if (!KEYWORD_PATTERN.test(trimmed)) {
      return {
        valid: false,
        value: null,
        error: 'Keyword darf nur Buchstaben, Zahlen, Bindestriche und Punkte enthalten.'
      };
    }

    // Normalize: lowercase for dedup and matching consistency
    const normalized = trimmed.toLowerCase();

    return { valid: true, value: normalized, error: null };
  },

  /**
   * Validate whether a keyword can be added to an existing list.
   * Checks both individual validity and list-level constraints.
   * 
   * @param {string} input - Raw keyword input
   * @param {string[]} existingKeywords - Current keyword list
   * @returns {ValidationResult}
   */
  validateKeywordAddition(input, existingKeywords = []) {
    const result = this.validateKeyword(input);
    if (!result.valid) {
      return result;
    }

    if (existingKeywords.length >= KEYWORD_MAX_COUNT) {
      return {
        valid: false,
        value: null,
        error: `Maximale Anzahl Keywords erreicht (${KEYWORD_MAX_COUNT}). ` +
               'Bitte entfernen Sie ein Keyword, bevor Sie ein neues hinzufügen.'
      };
    }

    // Duplicate check on normalized form
    if (existingKeywords.includes(result.value)) {
      return {
        valid: false,
        value: null,
        error: 'Dieses Keyword ist bereits aktiv.'
      };
    }

    return result;
  },

  /**
   * Validate a source weight value.
   * 
   * @param {*} input - Weight value (may be string from input field)
   * @returns {ValidationResult}
   */
  validateSourceWeight(input) {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      return {
        valid: false,
        value: null,
        error: `Bitte geben Sie einen Wert zwischen ${SOURCE_WEIGHT_MIN} und ${SOURCE_WEIGHT_MAX} ein.`
      };
    }

    const rounded = Math.round(num);

    if (rounded < SOURCE_WEIGHT_MIN || rounded > SOURCE_WEIGHT_MAX) {
      return {
        valid: false,
        value: null,
        error: `Bitte geben Sie einen Wert zwischen ${SOURCE_WEIGHT_MIN} und ${SOURCE_WEIGHT_MAX} ein.`
      };
    }

    return { valid: true, value: rounded, error: null };
  },

  /**
   * Validate the complete source weights object.
   * Business rule: at least one source must have weight > 0.
   * 
   * @param {Object} weights - { sourceId: number, ... }
   * @returns {ValidationResult}
   */
  validateSourceWeights(weights) {
    if (!weights || typeof weights !== 'object') {
      return { valid: false, value: null, error: 'Quellen-Gewichtung ist ungültig.' };
    }

    const entries = Object.entries(weights);
    if (entries.length === 0) {
      return { valid: false, value: null, error: 'Keine Quellen konfiguriert.' };
    }

    const validatedWeights = {};
    for (const [sourceId, weight] of entries) {
      const result = this.validateSourceWeight(weight);
      if (!result.valid) {
        return {
          valid: false,
          value: null,
          error: `Ungültiger Wert für Quelle "${sourceId}": ${result.error}`
        };
      }
      validatedWeights[sourceId] = result.value;
    }

    // Business rule: at least one source > 0
    const hasActiveSource = Object.values(validatedWeights).some(w => w > 0);
    if (!hasActiveSource) {
      return {
        valid: false,
        value: null,
        error: 'Mindestens eine Quelle muss gewichtet sein.'
      };
    }

    return { valid: true, value: validatedWeights, error: null };
  },

  /**
   * Validate relevance threshold.
   * 
   * @param {*} input - Threshold value (0.0 to 1.0)
   * @returns {ValidationResult}
   */
  validateRelevanceThreshold(input) {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      return {
        valid: false,
        value: null,
        error: 'Ungültiger Schwellwert.'
      };
    }

    if (num < RELEVANCE_MIN || num > RELEVANCE_MAX) {
      return {
        valid: false,
        value: null,
        error: `Schwellwert muss zwischen ${RELEVANCE_MIN} und ${RELEVANCE_MAX} liegen.`
      };
    }

    // Round to 2 decimal places
    const rounded = Math.round(num * 100) / 100;

    return { valid: true, value: rounded, error: null };
  },

  /**
   * Validate a complete filter configuration object.
   * Used before saving to backend.
   * 
   * @param {Object} config - Full filter config
   * @returns {ValidationResult}
   */
  validateFilterConfig(config) {
    if (!config || typeof config !== 'object') {
      return { valid: false, value: null, error: 'Ungültige Konfiguration.' };
    }

    // Validate keywords array
    if (!Array.isArray(config.keywords)) {
      return { valid: false, value: null, error: 'Keywords müssen eine Liste sein.' };
    }

    if (config.keywords.length > KEYWORD_MAX_COUNT) {
      return {
        valid: false,
        value: null,
        error: `Maximale Anzahl Keywords überschritten (${KEYWORD_MAX_COUNT}).`
      };
    }

    // Validate each keyword individually
    for (const keyword of config.keywords) {
      const result = this.validateKeyword(keyword);
      if (!result.valid) {
        return {
          valid: false,
          value: null,
          error: `Ungültiges Keyword "${keyword}": ${result.error}`
        };
      }
    }

    // Check for duplicates
    const uniqueKeywords = [...new Set(config.keywords)];
    if (uniqueKeywords.length !== config.keywords.length) {
      return { valid: false, value: null, error: 'Keyword-Liste enthält Duplikate.' };
    }

    // Validate source weights
    const weightsResult = this.validateSourceWeights(config.sourceWeights);
    if (!weightsResult.valid) {
      return weightsResult;
    }

    // Validate threshold
    const thresholdResult = this.validateRelevanceThreshold(config.relevanceThreshold);
    if (!thresholdResult.valid) {
      return thresholdResult;
    }

    return {
      valid: true,
      value: {
        keywords: uniqueKeywords,
        sourceWeights: weightsResult.value,
        relevanceThreshold: thresholdResult.value
      },
      error: null
    };
  },

  /**
   * Sanitize a string for safe HTML rendering.
   * 
   * SECURITY: governance/security-policy.md A03
   * NEVER use innerHTML with unsanitized user input.
   * This is a defense-in-depth measure — prefer textContent.
   * 
   * @param {string} str - Raw string
   * @returns {string} HTML-entity-escaped string
   */
  sanitizeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  /** Expose constants for external use (e.g., UI hints) */
  limits: Object.freeze({
    KEYWORD_MAX_LENGTH,
    KEYWORD_MAX_COUNT,
    SOURCE_WEIGHT_MIN,
    SOURCE_WEIGHT_MAX,
    RELEVANCE_MIN,
    RELEVANCE_MAX
  })
};

export { ValidationService };
export default ValidationService;
