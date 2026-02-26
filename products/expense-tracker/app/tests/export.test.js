// export.test.js — Unit tests for ExporterService
// Focus: CSV injection prevention, UTF-8 BOM, German number format

let passed = 0;
let failed = 0;
const errors = [];
const _tests = [];

function test(name, fn) { _tests.push({ name, fn }); }

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
    toBe:        (e) => { if (actual !== e) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(actual)}`); },
    toBeTruthy:  ()  => { if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`); },
    toContain:   (s) => { if (!actual.includes(s)) throw new Error(`Expected to contain ${JSON.stringify(s)}`); },
    not: {
      toContain: (s) => { if (actual.includes(s)) throw new Error(`Expected NOT to contain ${JSON.stringify(s)}`); },
    },
    toMatch:     (r) => { if (!r.test(actual)) throw new Error(`Expected to match ${r}`); },
    toHaveLength:(n) => { if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`); },
  };
}

// ── Inline ExporterService (sans import) ─────────────────

class MockCategories {
  constructor(map) { this._map = map; }
  getById(id) { return this._map[id] || null; }
}

function csvCell(value, sep) {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (str.includes(sep) || str.includes('"') || /[\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(expenses, categories, sep = ';') {
  const BOM = '\uFEFF';
  const header = ['Datum', 'Betrag (EUR)', 'Kategorie', 'Steuerrelevant', 'Beschreibung', 'Händler', 'Zahlungsart', 'Beleg-Datei', 'Erfasst am'].join(sep);
  const rows = expenses.map(e => {
    const cat = categories.getById(e.categoryId);
    const dateDE = e.date.split('-').reverse().join('.');
    const amountDE = e.amount.toFixed(2).replace('.', ',');
    return [
      dateDE, amountDE,
      csvCell(cat?.name || 'Unbekannt', sep),
      cat?.taxRelevant ? 'Ja' : 'Nein',
      csvCell(e.description || '', sep),
      csvCell(e.merchant || '', sep),
      e.paymentMethod || 'Sonstige', '', '',
    ].join(sep);
  });
  return BOM + [header, ...rows].join('\r\n');
}

// ── Test Data ─────────────────────────────────────────────

const cats = new MockCategories({
  software: { id: 'software', name: 'Software & Lizenzen', taxRelevant: true },
  private:  { id: 'private',  name: 'Privat (nicht absetzbar)', taxRelevant: false },
});

const sampleExpenses = [
  { id: '1', amount: 49.99, date: '2026-01-15', categoryId: 'software', merchant: 'GitHub', description: 'Jahresabo', paymentMethod: 'card' },
  { id: '2', amount: 15.00, date: '2026-01-20', categoryId: 'private',  merchant: 'Netflix', description: null, paymentMethod: 'card' },
];

// ── Tests ─────────────────────────────────────────────────

console.log('\n📋 ExporterService Tests\n');

console.log('  CSV Format:');
test('starts with UTF-8 BOM', () => {
  const csv = generateCSV(sampleExpenses, cats);
  expect(csv.charCodeAt(0)).toBe(0xFEFF);
});

test('has correct header row', () => {
  const csv = generateCSV(sampleExpenses, cats);
  expect(csv).toContain('Datum;Betrag (EUR);Kategorie;Steuerrelevant');
});

test('German decimal format (comma)', () => {
  const csv = generateCSV(sampleExpenses, cats);
  expect(csv).toContain('49,99');
  expect(csv).not.toContain('49.99'); // no dot as decimal
});

test('German date format DD.MM.YYYY', () => {
  const csv = generateCSV(sampleExpenses, cats);
  expect(csv).toContain('15.01.2026');
});

test('tax relevant marked as Ja', () => {
  const csv = generateCSV(sampleExpenses, cats);
  expect(csv).toContain('Ja');
});

test('non-tax expense marked as Nein', () => {
  const csv = generateCSV(sampleExpenses, cats);
  expect(csv).toContain('Nein');
});

console.log('\n  CSV Injection Prevention (Security):');

const injectionCases = [
  { value: '=CMD|"/C calc"!A0', expected: "'=CMD|", desc: 'formula: = prefix' },
  { value: '+12345',            expected: "'+12345", desc: 'formula: + prefix' },
  { value: '-12345',            expected: "'-12345", desc: 'formula: - prefix' },
  { value: '@SUM(A1:A10)',      expected: "'@SUM",   desc: 'formula: @ prefix' },
];

for (const c of injectionCases) {
  test(`neutralize ${c.desc}`, () => {
    const result = csvCell(c.value, ';');
    // If the cell was also CSV-quoted (e.g. contains "), strip outer quotes first
    const inner = result.startsWith('"') ? result.slice(1, -1) : result;
    expect(inner.startsWith("'")).toBeTruthy();
  });
}

test('values with separator get quoted', () => {
  const result = csvCell('Müller; Partner', ';');
  expect(result).toContain('"');
});

test('double quotes in value are escaped', () => {
  const result = csvCell('She said "hello"', ';');
  expect(result).toContain('""');
});

test('newline in value gets quoted', () => {
  const result = csvCell('Line1\nLine2', ';');
  expect(result.startsWith('"')).toBeTruthy();
});

// Comma Separator Variant
test('comma separator works', () => {
  const csv = generateCSV(sampleExpenses, cats, ',');
  const lines = csv.split('\r\n');
  const header = lines[0].replace('\uFEFF', '');
  expect(header).toContain('Datum,Betrag (EUR),Kategorie');
});

// Edge Cases
test('empty expense list → only header', () => {
  const csv = generateCSV([], cats);
  const lines = csv.split('\r\n').filter(l => l.length > 0);
  expect(lines.length).toBe(1); // only header
});

test('null description handled gracefully', () => {
  const exp = [{ id: '3', amount: 10, date: '2026-01-01', categoryId: 'software', merchant: null, description: null, paymentMethod: 'cash' }];
  const csv = generateCSV(exp, cats);
  expect(csv).toBeTruthy();
});

test('unknown category shows Unbekannt', () => {
  const exp = [{ id: '4', amount: 10, date: '2026-01-01', categoryId: 'nonexistent', description: null, merchant: null, paymentMethod: 'other' }];
  const csv = generateCSV(exp, cats);
  expect(csv).toContain('Unbekannt');
});

// ── Run ───────────────────────────────────────────────────
(async () => {
  await runAll();
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Passed: ${passed}   ❌ Failed: ${failed}`);
  if (errors.length) errors.forEach(e => console.log(`  • ${e.name}: ${e.error}`));
  console.log(`${'─'.repeat(50)}\n`);
  if (failed > 0) process.exit(1);
})();
