import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dir = new URL('../public/co-creation-assets/', import.meta.url);
const data = JSON.parse(await readFile(new URL('major100-research.json', dir), 'utf8'));
const cohort = JSON.parse(await readFile(new URL('major-municipalities-100.json', dir), 'utf8'));
const rubric = JSON.parse(await readFile(new URL('public-value-rubric.json', dir), 'utf8'));
const script = await readFile(new URL('major100-research.js', dir), 'utf8');
const cities = Object.values(data.municipalities);
async function page(mode='cohort', research=data) {
  const filename = mode==='reports' ? 'major100-research.html' : 'major-municipalities-100.html';
  const dom = new JSDOM(await readFile(new URL(filename, dir),'utf8'),{runScripts:'outside-only',url:'https://example.test/co-creation-assets/'+filename});
  dom.window.fetch = async url => ({ok:true,json:async()=>String(url).endsWith('major100-research.json')?research:cohort});
  dom.window.eval(script);
  await new Promise(resolve=>setImmediate(resolve)); return dom;
}
function reference(ref,city) {
  const doc=city.documents.find(d=>d.id===ref.document_id);
  assert.equal(doc?.review_status,'body_reviewed');
  assert.ok(Number.isInteger(ref.finding_index)&&ref.finding_index>=0&&doc.findings[ref.finding_index]);
}
test('value rubric is versioned, seven independent axes and four explicit criteria',()=>{
  assert.equal(rubric.version,1);
  assert.equal(rubric.axes.length,7);
  assert.equal(new Set(rubric.axes.map(a=>a.id)).size,7);
  assert.deepEqual(data.public_value_rubric,rubric);
  for(const axis of rubric.axes) {
    assert.deepEqual(axis.levels.map(l=>l.level),[1,2,3,4]);
    assert.ok(axis.levels.every(l=>l.criterion.length>5));
  }
  assert.ok(rubric.gates.length>=4);
});
test('all 100 municipalities have 700 honest assessment slots and 100 scoped future cards',()=>{
  assert.equal(cities.length,100);
  for(const city of cities) {
    const v=city.public_value;
    assert.equal(v.assessments.length,7);
    assert.deepEqual(v.assessments.map(a=>a.axis_id),rubric.axes.map(a=>a.id));
    assert.equal(city.dx_stage.overall,null);
    for(const a of v.assessments) {
      const c=a.current;
      assert.ok(c.scope&&c.basis);
      if(c.level===null){assert.equal(c.evidence.length,0);assert.equal(c.evidence_type,null);}
      else {
        assert.ok(Number.isInteger(c.level)&&c.level>=1&&c.level<=4);
        assert.ok(c.evidence.length&&rubric.evidence_types[c.evidence_type]);
        c.evidence.forEach(ref=>reference(ref,city));
      }
    }
    const f=v.future;
    assert.equal(f.author,'TLA');
    assert.equal(f.status,'hypothesis');
    assert.equal(f.official_target,false);
    assert.equal(f.targets.length,2);
    assert.equal(new Set(f.targets.map(t=>t.axis_id)).size,2);
    assert.ok(f.title&&f.hypothesis&&f.pilot&&f.stop_rule);
    assert.ok(f.evidence.length);f.evidence.forEach(ref=>reference(ref,city));
    for(const t of f.targets) {
      assert.ok(rubric.axes.some(a=>a.id===t.axis_id));
      assert.ok(Number.isInteger(t.level)&&t.level>=1&&t.level<=4&&t.rationale);
    }
    assert.ok(f.conditions.length>=2&&f.partners.length>=2);
    assert.ok(f.metrics.length>=2);
    assert.ok(f.metrics.every(m=>m.name&&m.definition&&m.method));
  }
});
test('future proposals are individually authored, not one common generic card',()=>{
  assert.equal(new Set(cities.map(c=>c.public_value.future.title)).size,100);
  assert.equal(new Set(cities.map(c=>c.public_value.future.hypothesis)).size,100);
});
test('all 100 selectable cities render seven axes and one explicitly hypothetical card',async()=>{
  const dom=await page();
  try{
    const d=dom.window.document;
    for(const button of [...d.querySelectorAll('#app button')]){
      button.click();
      assert.equal(d.querySelectorAll('#detail .value-matrix tr[data-value-axis]').length,7);
      assert.equal(d.querySelectorAll('#detail .future-value-card').length,1);
      assert.match(d.querySelector('#detail .future-value-card').textContent,/未実証の仮説/);
      assert.match(d.querySelector('#detail .public-value').textContent,/自治体の公式目標ではなく/);
      assert.ok(d.querySelector('#detail .value-evidence a[href^="https:"]'));
      assert.match(d.querySelector('#detail .value-safeguards').textContent,/充足未確認/);
    }
  }finally{dom.window.close();}
});
test('DX and future-value filters combine by intersection and reset correctly',async()=>{
  const dom=await page();
  try{
    const d=dom.window.document, dx=d.getElementById('dx-filter'), value=d.getElementById('value-filter');
    assert.ok(value);
    for(const axis of ['',...rubric.axes.map(a=>a.id)])for(const stage of ['',...data.dx_classification.stages.map(s=>s.code)]){
      dx.value=stage;value.value=axis;value.dispatchEvent(new dom.window.Event('change'));
      const expected=cities.filter(c=>(!stage||c.dx_evidence.stage===stage)&&(!axis||c.public_value.future.targets.some(t=>t.axis_id===axis))).length;
      assert.equal(d.querySelectorAll('#app tr[data-dx-stage]:not([hidden])').length,expected,axis+'/'+stage);
      assert.equal(d.getElementById('dx-filter-count').textContent,expected+'自治体を表示');
    }
    dx.value='';value.value='';dx.dispatchEvent(new dom.window.Event('change'));
    assert.equal(d.querySelectorAll('#app tr[data-dx-stage]:not([hidden])').length,100);
  }finally{dom.window.close();}
});
test('report mode exposes criteria, current evidence and future measurement plans',async()=>{
  const dom=await page('reports');
  try{
    const d=dom.window.document;
    assert.equal(d.querySelectorAll('.rubric-axis').length,7);
    assert.equal(d.querySelectorAll('.value-matrix tr[data-value-axis]').length,700);
    assert.equal(d.querySelectorAll('.future-value-card').length,100);
    assert.equal(d.querySelectorAll('.future-measurement').length,100);
    assert.match(d.querySelector('.value-overview').textContent,/低評価を意味しません/);
    assert.ok(d.querySelectorAll('.value-current').length===700);
  }finally{dom.window.close();}
});
test('missing value analysis remains unknown and hostile proposal text stays inert',async()=>{
  const copy=structuredClone(data);delete copy.municipalities['14100'].public_value;
  copy.municipalities['29201'].public_value.future.title='<img src=x onerror=alert(1)>';
  const dom=await page('reports',copy);
  try{
    const d=dom.window.document;
    assert.match(d.querySelector('#city-14100 .public-value').textContent,/未収録/);
    assert.equal(d.querySelector('#city-14100 .future-value-card'),null);
    assert.equal(d.querySelectorAll('img').length,0);
    assert.ok(d.querySelector('#city-29201 .future-value-card').textContent.includes('<img'));
  }finally{dom.window.close();}
});
