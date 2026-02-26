// expenses.test.js — Unit tests for ExpenseService
// Run with: node --experimental-vm-modules tests/expenses.test.js
// (or any test runner like Vitest / Jest with ESM support)

// ── Minimal Test Framework ───────────────────────────────
// No external dependencies — pure browser-compatible assertions

let passed = 0;
let failed = 0;
const errors = [];
const _tests = [];

function test(name, fn) {
  _tests.push({ name, fn });
}

async function runAll() {
  for (const { name, fn } of _tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}`);
      console.error(`     ${err.message}`);
      failed++;
      errors.push({ name, error: err.message });
    }
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual: (expected) => {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      if (a !== e) throw new Error(`Expected ${e}, got ${a}`);
    },
    toBeGreaterThan: (n) => {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy: () => {
      if (actual) throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
    },
    toThrow: (msg) => {
      if (typeof actual !== 'function') throw new Error('toThrow requires a function');
      let threw = false;
      try { actual(); } catch (e) { threw = true; if (msg && !e.message.includes(msg)) throw new Error(`Expected error "${msg}", got "${e.message}"`); }
      if (!threw) throw new Error('Expected function to throw');
    },
    toHaveLength: (n) => {
      if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
    toContain: (item) => {
      if (!actual.includes(item)) throw new Error(`Expected array/string to contain ${JSON.stringify(item)}`);
    },
    toMatch: (regex) => {
      if (!regex.test(actual)) throw new Error(`Expected "${actual}" to match ${regex}`);
    },
  };
}

// ── Mock Storage ─────────────────────────────────────────

class MockStorage {
  constructor() {
    this._expenses = [];
    this._receipts = {};
    this._custom   = [];
    this._recent   = [];
  }
  getExpenses()            { return [...this._expenses]; }
  saveExpenses(es)         { this._expenses = [...es]; }
  async saveReceipt(id, buffer, name, type) { this._receipts[id] = { buffer, name, type }; }
  async getReceipt(id)     { return this._receipts[id] || null; }
  async deleteReceipt(id)  { delete this._receipts[id]; }
  getCustomCategories()    { return []; }
  saveCustomCategories()   {}
  getRecentCategoryIds()   { return this._recent; }
  addRecentCategoryId(id)  { this._recent = [id, ...this._recent.filter(r => r !== id)].slice(0, 3); }
  getSettings()            { return {}; }
  saveSettings()           {}
  async getQuotaInfo()     { return null; }
}

// ── Import services (simulated for Node environment) ──────
// In a real test runner (Vitest), we'd use:
// import { ExpenseService, ValidationError } from '../js/expenses.js';
// For this standalone test, we inline the validation logic

function createExpenseService(storage) {
  const ValidationError_stub = class extends Error {
    constructor(errors) { super('Validation failed'); this.errors = errors; }
  };

  function validate(data) {
    const errors = [];
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0 || amount > 99999.99) {
      errors.push({ field: 'amount', message: 'Betrag muss zwischen 0,01 € und 99.999,99 € liegen' });
    }
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push({ field: 'date', message: 'Ungültiges Datum' });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (data.date > today) errors.push({ field: 'date', message: 'Datum darf nicht in der Zukunft liegen' });
    }
    if (!data.categoryId) {
      errors.push({ field: 'categoryId', message: 'Bitte eine Kategorie auswählen' });
    }
    return errors;
  }

  return {
    ValidationError: ValidationError_stub,
    async create(data) {
      const errs = validate(data);
      if (errs.length) throw new ValidationError_stub(errs);
      const id = Math.random().toString(36).slice(2);
      const expense = { id, amount: parseFloat(parseFloat(data.amount).toFixed(2)), date: data.date, categoryId: data.categoryId,
        description: data.description || null, merchant: data.merchant || null, paymentMethod: data.paymentMethod || 'other',
        receipt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), currency: 'EUR' };
      const all = storage.getExpenses();
      all.push(expense);
      storage.saveExpenses(all);
      return expense;
    },
    getAll()              { return storage.getExpenses(); },
    getById(id)           { return storage.getExpenses().find(e => e.id === id) || null; },
    getByMonth(y, m)      {
      const mm = String(m).padStart(2, '0');
      return storage.getExpenses().filter(e => e.date.startsWith(`${y}-${mm}`));
    },
    async delete(id)      {
      const all = storage.getExpenses();
      storage.saveExpenses(all.filter(e => e.id !== id));
    },
    getSummary(exps, cats) {
      const total = exps.reduce((s, e) => s + e.amount, 0);
      return { total, taxRelevant: total, count: exps.length };
    },
  };
}

// ── Test Suites ──────────────────────────────────────────

const storage = new MockStorage();
const svc     = createExpenseService(storage);

console.log('\n📋 ExpenseService Tests\n');

// Validation
console.log('  Validation:');
test('reject zero amount', async () => {
  try { await svc.create({ amount: 0, date: '2026-01-01', categoryId: 'software' }); }
  catch (e) { expect(e.errors[0].field).toBe('amount'); return; }
  throw new Error('Should have thrown');
});

test('reject future date', async () => {
  try { await svc.create({ amount: 10, date: '2099-01-01', categoryId: 'software' }); }
  catch (e) { expect(e.errors.some(err => err.field === 'date')).toBeTruthy(); return; }
  throw new Error('Should have thrown');
});

test('reject missing category', async () => {
  try { await svc.create({ amount: 10, date: '2026-01-01', categoryId: '' }); }
  catch (e) { expect(e.errors[0].field).toBe('categoryId'); return; }
  throw new Error('Should have thrown');
});

test('reject negative amount', async () => {
  try { await svc.create({ amount: -5, date: '2026-01-01', categoryId: 'software' }); }
  catch (e) { expect(e.errors[0].field).toBe('amount'); return; }
  throw new Error('Should have thrown');
});

test('reject amount over 99999.99', async () => {
  try { await svc.create({ amount: 100000, date: '2026-01-01', categoryId: 'software' }); }
  catch (e) { expect(e.errors[0].field).toBe('amount'); return; }
  throw new Error('Should have thrown');
});

// Happy path
test('create valid expense', async () => {
  const e = await svc.create({ amount: '49.99', date: '2026-01-15', categoryId: 'software', merchant: 'GitHub' });
  expect(e.amount).toBe(49.99);
  expect(e.categoryId).toBe('software');
  expect(e.merchant).toBe('GitHub');
  expect(e.id).toBeTruthy();
});

test('getAll returns expense list', () => {
  expect(svc.getAll().length).toBeGreaterThan(0);
});

test('getById finds expense', async () => {
  const created = await svc.create({ amount: '25', date: '2026-02-10', categoryId: 'education' });
  const found   = svc.getById(created.id);
  expect(found?.id).toBe(created.id);
});

test('getById returns null for unknown id', () => {
  expect(svc.getById('nonexistent-id')).toBeNull();
});

test('delete removes expense', async () => {
  const created = await svc.create({ amount: '15', date: '2026-01-20', categoryId: 'office_supplies' });
  await svc.delete(created.id);
  expect(svc.getById(created.id)).toBeNull();
});

test('getByMonth filters correctly', async () => {
  storage.saveExpenses([]); // Reset
  await svc.create({ amount: '10', date: '2025-11-05', categoryId: 'software' });
  await svc.create({ amount: '20', date: '2025-11-15', categoryId: 'software' });
  await svc.create({ amount: '30', date: '2025-12-01', categoryId: 'software' });
  const nov = svc.getByMonth(2025, 11);
  expect(nov.length).toBe(2);
});

// Amount precision
test('amount stored with 2 decimal places', async () => {
  const e = await svc.create({ amount: '12.999', date: '2026-01-01', categoryId: 'software' });
  expect(e.amount).toBe(13);
});

// Summary
test('getSummary calculates total', () => {
  const exps = [
    { amount: 10.50 },
    { amount: 20.00 },
    { amount: 5.75 },
  ];
  const summary = svc.getSummary(exps, {});
  expect(summary.total).toBe(36.25);
  expect(summary.count).toBe(3);
});

// ── Run ───────────────────────────────────────────────────
(async () => {
  await runAll();
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Passed: ${passed}   ❌ Failed: ${failed}`);
  if (errors.length) {
    console.log('\nFailed tests:');
    errors.forEach(e => console.log(`  • ${e.name}: ${e.error}`));
  }
  console.log(`${'─'.repeat(50)}\n`);
  if (failed > 0) process.exit(1);
})();
