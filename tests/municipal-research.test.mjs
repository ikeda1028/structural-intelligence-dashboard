import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const dir = new URL('../public/co-creation-assets/', import.meta.url);
const data = JSON.parse(await readFile(new URL('major100-research.json', dir), 'utf8'));
const cohort = JSON.parse(await readFile(new URL('major-municipalities-100.json', dir), 'utf8'));
const script = await readFile(new URL('major100-research.js', dir), 'utf8');
const cities = Object.values(data.municipalities);

test('every reviewed document has bounded review scope, source locators and explicit limits', () => {
  assert.equal(data.schema_version, 2);
  assert.equal(cohort.municipalities.length, 100);
  const ids = new Set();
  for (const [code, city] of Object.entries(data.municipalities)) {
    assert.ok(cohort.municipalities.some(m => m.code === code));
    assert.equal(city.research_status, 'partial');
    assert.equal(city.dx_stage.overall, null);
    assert.ok(city.next_tasks.length);
    for (const doc of city.documents) {
      assert.ok(!ids.has(doc.id)); ids.add(doc.id);
      assert.equal(doc.review_status, 'body_reviewed');
      assert.ok(new URL(doc.source_url).hostname.startsWith('www.city.'));
      for (const key of ['title','source_period','checked_at','review_scope','summary']) assert.ok(doc[key]);
      assert.ok(doc.findings.length && doc.limits.length);
      if (doc.source_url.endsWith('.pdf')) assert.ok(doc.pdf_pages.length);
      for (const f of doc.findings) assert.ok(f.state && f.text && f.locator);
      for (const b of doc.budgets) {
        assert.ok(Number.isFinite(b.amount) && b.amount >= 0);
        assert.ok(['千円','万円','百万円'].includes(b.unit));
        assert.ok(b.stage && b.scope && b.locator && b.fiscal_year);
      }
    }
    for (const lead of city.source_leads) assert.equal(lead.review_status, 'index_only');
  }
});

test('Osaka corrected allocations sum to the total and remain mapped to the right category', () => {
  const doc = data.municipalities['27100'].documents.find(d => d.id === 'osaka-dx-budget-r8');
  const values = Object.fromEntries(doc.budgets.map(b => [b.label, b.amount]));
  assert.equal(values['サービスDX'], 362000);
  assert.equal(values['行政DX'], 635700);
  assert.equal(values['都市・まちDX'], 42500);
  assert.equal(values['DX推進事業総額'], values['サービスDX'] + values['行政DX'] + values['都市・まちDX']);
});

async function page(mode, {fail = false, research = data} = {}) {
  const filename = mode === 'reports' ? 'major100-research.html' : 'major-municipalities-100.html';
  const html = await readFile(new URL(filename, dir), 'utf8');
  const dom = new JSDOM(html, {runScripts: 'outside-only', url: 'https://example.test/co-creation-assets/' + filename});
  dom.window.fetch = async url => ({
    ok: !fail, status: fail ? 503 : 200,
    json: async () => String(url).endsWith('major100-research.json') ? research : cohort
  });
  dom.window.eval(script);
  await new Promise(resolve => setImmediate(resolve));
  return dom;
}

test('reports render all reviewed documents, source links and explicit partial status', async () => {
  const dom = await page('reports');
  try {
    const d = dom.window.document;
    assert.equal(d.querySelectorAll('.city').length, cities.length);
    assert.equal(d.querySelectorAll('.document').length, cities.reduce((n,c) => n + c.documents.length, 0));
    assert.match(d.getElementById('review-status').textContent, /100自治体中 5市/);
    for (const [code, city] of Object.entries(data.municipalities)) {
      const section = d.getElementById('city-' + code);
      assert.ok(section.textContent.includes(city.documents[0].summary));
      assert.ok(section.querySelector('a[href*="#page="]'));
    }
  } finally { dom.window.close(); }
});

test('all 100 city controls work and unreviewed cities never display reviewed status', async () => {
  const dom = await page('cohort');
  try {
    const d = dom.window.document, buttons = [...d.querySelectorAll('button')];
    assert.equal(buttons.length, 100);
    buttons.forEach((button, index) => {
      button.click();
      const city = data.municipalities[cohort.municipalities[index].code];
      const detail = d.getElementById('detail');
      assert.ok(detail.textContent.includes(cohort.municipalities[index].name));
      assert.equal(detail.querySelectorAll('.document').length, city ? city.documents.length : 0);
      if (!city) assert.match(detail.textContent, /未着手/);
    });
  } finally { dom.window.close(); }
});

test('HTTP failures do not produce a success or complete state', async () => {
  const dom = await page('reports', {fail: true});
  try { assert.match(dom.window.document.getElementById('app').textContent, /読み込めません/); }
  finally { dom.window.close(); }
});

test('untrusted source text and URLs cannot create markup or script links', async () => {
  const copy = structuredClone(data), doc = copy.municipalities['14100'].documents[0];
  doc.summary = '<img src=x onerror=alert(1)>';
  doc.source_url = 'javascript:alert(1)';
  const dom = await page('reports', {research: copy});
  try {
    assert.equal(dom.window.document.querySelectorAll('img, a[href^="javascript:"]').length, 0);
    assert.ok(dom.window.document.body.textContent.includes(doc.summary));
  } finally { dom.window.close(); }
});
