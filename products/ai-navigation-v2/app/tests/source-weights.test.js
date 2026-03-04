'use strict';

/**
 * Test Suite: Source Weights Configuration
 * Feature: Domain-Filter-Konfiguration
 * Covers: Story 2 (Quellen-Gewichtung einstellen)
 * Personas: Thomas (📊 Critical), Monika (🔍 High)
 */

// ============================================================
// Test Helpers
// ============================================================

function createMockFilterConfig(overrides) {
  return {
    id: 'test-config-uuid',
    tenant_id: 'tenant-001',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    updated_by: 'user-001',
    keywords: ['computer vision'],
    source_weights: {
      github: 50,
      arxiv: 50,
      hackernews: 50
    },
    relevance_threshold: 0.5,
    ...overrides
  };
}

const AVAILABLE_SOURCES = ['github', 'arxiv', 'hackernews'];

// ============================================================
// GATE 1: SECURITY — Source Weight Input Validation
// ============================================================

describe('SECURITY: Source Weight Input Validation', () => {

  test('accepts valid integer weight (0)', () => {
    const result = validateSourceWeight(0);
    expect(result.valid).toBe(true);
  });

  test('accepts valid integer weight (100)', () => {
    const result = validateSourceWeight(100);
    expect(result.valid).toBe(true);
  });

  test('accepts valid integer weight (50)', () => {
    const result = validateSourceWeight(50);
    expect(result.valid).toBe(true);
  });

  test('rejects negative value', () => {
    const result = validateSourceWeight(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/0.*100/);
  });

  test('rejects value above 100', () => {
    const result = validateSourceWeight(101);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/0.*100/);
  });

  test('rejects string input', () => {
    const result = validateSourceWeight('abc');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/0.*100/);
  });

  test('rejects NaN', () => {
    const result = validateSourceWeight(NaN);
    expect(result.valid).toBe(false);
  });

  test('rejects Infinity', () => {
    const result = validateSourceWeight(Infinity);
    expect(result.valid).toBe(false);
  });

  test('rejects null', () => {
    const result = validateSourceWeight(null);
    expect(result.valid).toBe(false);
  });

  test('rejects undefined', () => {
    const result = validateSourceWeight(undefined);
    expect(result.valid).toBe(false);
  });

  test('rejects float values (must be integer)', () => {
    const result = validateSourceWeight(50.5);
    expect(result.valid).toBe(false);
  });

  test('rejects object input', () => {
    const result = validateSourceWeight({ value: 50 });
    expect(result.valid).toBe(false);
  });

  test('rejects array input', () => {
    const result = validateSourceWeight([50]);
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// GATE 2: ACCESSIBILITY — Source Weight UI
// ============================================================

describe('ACCESSIBILITY: Source Weight UI', () => {

  test('each slider has aria-valuemin, aria-valuemax, aria-valuenow', () => {
    const html = renderSourceWeightSlider('github', 70);
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-valuenow="70"');
  });

  test('each slider has descriptive aria-label', () => {
    const html = renderSourceWeightSlider('github', 70);
    expect(html).toMatch(/aria-label=".*[Gg]it[Hh]ub.*[Gg]ewichtung/);
  });

  test('current value is displayed numerically (not color-only)', () => {
    const html = renderSourceWeightSlider('github', 70);
    expect(html).toContain('70');
    // Monika (Deuteranomalie): value must not be communicated via color alone
    expect(html).toMatch(/\b70\s*%/);
  });

  test('slider is keyboard accessible (role="slider")', () => {
    const html = renderSourceWeightSlider('arxiv', 50);
    expect(html).toContain('role="slider"');
  });

  test('slider has tabindex for keyboard navigation', () => {
    const html = renderSourceWeightSlider('arxiv', 50);
    expect(html).toContain('tabindex="0"');
  });

  test('source label is associated with slider', () => {
    const html = renderSourceWeightSlider('hackernews', 30);
    expect(html).toContain('id="slider-hackernews"');
    expect(html).toMatch(/for="slider-hackernews"|aria-labelledby/);
  });

  test('error state announced to screen readers', () => {
    const html = renderSourceWeightError('Bitte geben Sie einen Wert zwischen 0 und 100 ein');
    expect(html).toContain('role="alert"');
  });

  test('tooltip accessible via focus (keyboard hover equivalent)', () => {
    const html = renderSourceWeightSlider('github', 70, { showTooltip: true });
    expect(html).toContain('aria-describedby');
  });
});

// ============================================================
// GATE 3: CODE QUALITY — Source Weight Logic
// ============================================================

describe('CODE QUALITY: Source Weight Business Logic', () => {

  test('at least one source must have weight > 0', () => {
    const weights = { github: 0, arxiv: 0, hackernews: 0 };
    const result = validateAllSourceWeights(weights);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/mindestens eine quelle/i);
  });

  test('allows single source with weight > 0', () => {
    const weights = { github: 100, arxiv: 0, hackernews: 0 };
    const result = validateAllSourceWeights(weights);
    expect(result.valid).toBe(true);
  });

  test('allows all sources with equal weights', () => {
    const weights = { github: 50, arxiv: 50, hackernews: 50 };
    const result = validateAllSourceWeights(weights);
    expect(result.valid).toBe(true);
  });

  test('weights are relative (no sum constraint)', () => {
    const weights = { github: 100, arxiv: 100, hackernews: 100 };
    const result = validateAllSourceWeights(weights);
    expect(result.valid).toBe(true);
    // Sum is 300, which is fine — weights are relative
  });

  test('unknown source key is rejected', () => {
    const weights = { github: 50, arxiv: 50, hackernews: 50, unknown_source: 50 };
    const result = validateAllSourceWeights(weights, AVAILABLE_SOURCES);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unknown_source/i);
  });

  test('missing required source key fills with default', () => {
    const weights = { github: 70 };
    const result = normalizeSourceWeights(weights, AVAILABLE_SOURCES, 50);
    expect(result.github).toBe(70);
    expect(result.arxiv).toBe(50);
    expect(result.hackernews).toBe(50);
  });
});

// ============================================================
// GATE 4: SPEC COMPLIANCE — Story 2 Acceptance Criteria
// ============================================================

describe('SPEC COMPLIANCE: Story 2 — Quellen-Gewichtung einstellen', () => {

  test('AC1: All available sources displayed with current weight', () => {
    const config = createMockFilterConfig();
    const rendered = renderSourceWeightsSection(config);
    AVAILABLE_SOURCES.forEach(source => {
      expect(rendered).toContain(source);
    });
    expect(rendered).toContain('50');  // Default weight
  });

  test('AC2: Changing weight and saving persists the new value', () => {
    const config = createMockFilterConfig();
    const result = updateSourceWeight(config, 'github', 80);
    expect(result.success).toBe(true);
    expect(result.config.source_weights.github).toBe(80);
    expect(result.config.updated_at).not.toBe(config.updated_at);
  });

  test('AC3: All sources at 0 is rejected with hint', () => {
    const config = createMockFilterConfig({
      source_weights: { github: 0, arxiv: 0, hackernews: 0 }
    });
    const result = saveSourceWeights(config);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/mindestens eine quelle.*gewichtet/i);
  });

  test('AC5: Invalid value resets to previous and shows hint', () => {
    const config = createMockFilterConfig();
    const result = updateSourceWeight(config, 'github', -10);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/0.*100/);
    expect(result.config.source_weights.github).toBe(50); // Unchanged
  });

  test('AC5: Text input resets to previous with hint', () => {
    const config = createMockFilterConfig();
    const result = updateSourceWeight(config, 'github', 'abc');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/0.*100/);
    expect(result.config.source_weights.github).toBe(50);
  });
});

describe('SPEC COMPLIANCE: New Tenant Defaults', () => {

  test('BR8: New tenants start with equal distribution', () => {
    const config = createDefaultFilterConfig('new-tenant-id', AVAILABLE_SOURCES);
    AVAILABLE_SOURCES.forEach(source => {
      expect(config.source_weights[source]).toBe(50);
    });
  });

  test('BR8: New tenants start with empty keyword set', () => {
    const config = createDefaultFilterConfig('new-tenant-id', AVAILABLE_SOURCES);
    expect(config.keywords).toEqual([]);
  });

  test('BR5: New tenants start with relevance threshold 0.5', () => {
    const config = createDefaultFilterConfig('new-tenant-id', AVAILABLE_SOURCES);
    expect(config.relevance_threshold).toBe(0.5);
  });
});

// ============================================================
// Implementation Stubs
// ============================================================

function validateSourceWeight(value) {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Bitte geben Sie einen Wert zwischen 0 und 100 ein.' };
  }
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return { valid: false, error: 'Bitte geben Sie einen Wert zwischen 0 und 100 ein.' };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Bitte geben Sie einen Wert zwischen 0 und 100 ein.' };
  }
  if (value < 0 || value > 100) {
    return { valid: false, error: 'Bitte geben Sie einen Wert zwischen 0 und 100 ein.' };
  }
  return { valid: true };
}

function validateAllSourceWeights(weights, availableSources) {
  if (availableSources) {
    const unknownKeys = Object.keys(weights).filter(k => !availableSources.includes(k));
    if (unknownKeys.length > 0) {
      return { valid: false, error: `Unbekannte Quellen: ${unknownKeys.join(', ')}` };
    }
  }

  const values = Object.values(weights);
  if (values.every(v => v === 0)) {
    return { valid: false, error: 'Mindestens eine Quelle muss gewichtet sein.' };
  }

  for (const [key, value] of Object.entries(weights)) {
    const validation = validateSourceWeight(value);
    if (!validation.valid) {
      return { valid: false, error: `${key}: ${validation.error}` };
    }
  }

  return { valid: true };
}

function normalizeSourceWeights(weights, availableSources, defaultWeight) {
  const normalized = {};
  availableSources.forEach(source => {
    normalized[source] = weights[source] !== undefined ? weights[source] : defaultWeight;
  });
  return normalized;
}

function updateSourceWeight(config, sourceKey, newWeight) {
  const validation = validateSourceWeight(newWeight);
  if (!validation.valid) {
    return { success: false, config, error: validation.error };
  }

  const updatedWeights = { ...config.source_weights, [sourceKey]: newWeight };

  // Check that not all are zero
  if (Object.values(updatedWeights).every(v => v === 0)) {
    return {
      success: false,
      config,
      error: 'Mindestens eine Quelle muss gewichtet sein.'
    };
  }

  return {
    success: true,
    config: {
      ...config,
      source_weights: updatedWeights,
      updated_at: new Date().toISOString()
    }
  };
}

function saveSourceWeights(config) {
  const validation = validateAllSourceWeights(config.source_weights);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  return { success: true };
}

function createDefaultFilterConfig(tenantId, availableSources) {
  const sourceWeights = {};
  availableSources.forEach(source => {
    sourceWeights[source] = 50;
  });
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'generated-uuid',
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    keywords: [],
    source_weights: sourceWeights,
    relevance_threshold: 0.5
  };
}

function renderSourceWeightSlider(source, value, options = {}) {
  const label = source.charAt(0).toUpperCase() + source.slice(1);
  let html = `<div class="source-weight-row">`;
  html += `<label for="slider-${source}">${label} Gewichtung</label>`;
  html += `<div role="slider" id="slider-${source}" tabindex="0" `;
  html += `aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" `;
  html += `aria-label="${label} Gewichtung"`;

  if (options.showTooltip) {
    html += ` aria-describedby="tooltip-${source}"`;
  }
  html += `>`;
  html += `<span class="slider-value">${value} %</span>`;
  html += `</div>`;

  if (options.showTooltip) {
    html += `<span id="tooltip-${source}" role="tooltip">Bestimmt, wie stark Signale aus ${label} gewichtet werden.</span>`;
  }

  html += `</div>`;
  return html;
}

function renderSourceWeightError(message) {
  return `<div class="source-weight-error" role="alert">${message}</div>`;
}

function renderSourceWeightsSection(config) {
  let html = '<div class="source-weights-section">';
  Object.entries(config.source_weights).forEach(([source, weight]) => {
    html += renderSourceWeightSlider(source, weight);
  });
  html += '</div>';
  return html;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateSourceWeight,
    validateAllSourceWeights,
    normalizeSourceWeights,
    updateSourceWeight,
    saveSourceWeights,
    createDefaultFilterConfig,
    renderSourceWeightSlider,
    renderSourceWeightError,
    renderSourceWeightsSection
  };
}
