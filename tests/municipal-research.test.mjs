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
        assert.ok(['円','千円','万円','百万円'].includes(b.unit));
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

test('next ten population-ranked municipalities have 20 bounded primary reviews', () => {
  const next = cohort.municipalities.slice(5, 15);
  assert.deepEqual(next.map(m => m.code), ['14130','28100','26100','11100','34100','04100','12100','13112','40100','27140']);
  assert.equal(next.reduce((n,m) => n + data.municipalities[m.code].documents.length, 0), 20);
  for (const m of next) {
    const city = data.municipalities[m.code];
    assert.equal(city.name, m.name);
    assert.equal(m.research_status, 'partial');
    assert.ok(city.documents.every(d => d.checked_at === '2026-09-27'));
    assert.ok(m.tasks.filter(t => ['council','ordinance'].includes(t.domain)).every(t => t.status === 'not_started'));
  }
});

test('budget scopes, units and selected procurements cannot be conflated', () => {
  const docs = cities.flatMap(c => c.documents);
  const doc = id => docs.find(d => d.id === id);
  const amount = (id,label) => doc(id).budgets.find(b => b.label === label).amount;
  assert.equal(amount('saitama-dx-budget-r8','デジタル人材の育成'), 522);
  assert.equal(127263 + 52056 + 522 + 4680, amount('saitama-dx-budget-r8','DX推進事業'));
  assert.equal(amount('hiroshima-budget-r8-dx','生成AIの利活用促進'),1596);
  assert.equal(amount('setagaya-budget-r8-overview','一般会計当初予算・全体'),431353);
  const sakai = doc('sakai-budget-r8-reform');
  assert.equal(amount(sakai.id,'定型業務の集約化・単年度予算'),127507);
  assert.ok(sakai.budgets.every(b => b.amount !== 864507));
  assert.match(sakai.findings.find(f => f.state === '予算期間の違い').text,/737,000/);
  for (const code of ['04100','12100']) assert.match(data.municipalities[code].opportunity.status,/^E：/);
  assert.match(data.municipalities['14130'].opportunity.status,/締切済み/);
  assert.equal(doc('sendai-ai-proposal-result-r8').budgets[0].unit,'円');
  assert.equal(doc('sendai-ai-proposal-result-r8').budgets[0].amount,5896000);
  assert.match(doc('setagaya-dx-roadmap-r8').findings[0].text,/実際にオンラインで申請された割合でも/);
  assert.match(doc('hiroshima-dx-progress-r6').findings[1].text,/削減時間ではありません/);
});

test('cohort status agrees with published partial reviews without marking remaining cities complete', () => {
  for (const m of cohort.municipalities) {
    assert.equal(m.research_status, data.municipalities[m.code] ? 'partial' : 'not_started');
    assert.ok(m.tasks.every(t => t.status !== 'verified'));
  }
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
    assert.ok(d.getElementById('review-status').textContent.includes('100自治体中 ' + cities.length + '自治体'));
    for (const [code, city] of Object.entries(data.municipalities)) {
      const section = d.getElementById('city-' + code);
      assert.ok(section.textContent.includes(city.documents[0].summary));
      assert.ok(section.querySelector('a[href*="#page="]'));
      assert.ok(section.querySelector('a[href$="/co-creation?municipality=' + code + '"]'));
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
