// Merge manually reviewed value cards. No keyword-based or DX-stage-based scoring.
import {readFileSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir = new URL('../public/co-creation-assets/', import.meta.url);
const path = new URL('major100-research.json', dir);
const data = JSON.parse(readFileSync(path, 'utf8'));
const rubric = JSON.parse(readFileSync(new URL('public-value-rubric.json', dir), 'utf8'));
const cohort = JSON.parse(readFileSync(new URL('major-municipalities-100.json', dir), 'utf8'));
const values = {};
const axisIds = rubric.axes.map(a => a.id);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const refsValid = (refs, city) => {
  assert.ok(Array.isArray(refs) && refs.length);
  for (const ref of refs) {
    const doc = city.documents.find(d => d.id === ref.document_id);
    assert.ok(doc?.review_status === 'body_reviewed');
    assert.ok(Number.isInteger(ref.finding_index) && ref.finding_index >= 0 && doc.findings[ref.finding_index]);
  }
};
const files = process.argv.slice(2); assert.ok(files.length);
for (const file of files) for (const [code, card] of Object.entries(JSON.parse(readFileSync(file, 'utf8')))) {
  assert.ok(!values[code], 'Duplicate: ' + code);
  const city = data.municipalities[code]; assert.ok(city, code);
  for (const [id, current] of Object.entries(card.current)) {
    assert.ok(axisIds.includes(id), id);
    assert.ok(Number.isInteger(current.level) && current.level >= 1 && current.level <= 4);
    assert.ok(nonempty(current.scope) && nonempty(current.basis));
    assert.ok(rubric.evidence_types[current.evidence_type]);
    refsValid(current.evidence, city);
  }
  const future = card.future;
  for (const key of ['title','hypothesis','pilot','stop_rule']) assert.ok(nonempty(future[key]), code + ':' + key);
  assert.equal(future.targets.length, 2, code);
  assert.equal(new Set(future.targets.map(t => t.axis_id)).size, future.targets.length);
  for (const t of future.targets) {
    assert.ok(axisIds.includes(t.axis_id) && Number.isInteger(t.level) && t.level >= 1 && t.level <= 4 && nonempty(t.rationale));
    assert.ok(!card.current[t.axis_id] || t.level >= card.current[t.axis_id].level, code + ': target below observed');
  }
  refsValid(future.evidence, city);
  for (const key of ['conditions','partners']) assert.ok(future[key].length >= 2 && future[key].every(nonempty));
  assert.ok(future.metrics.length >= 2 && future.metrics.every(m => ['name','definition','method'].every(k => nonempty(m[k]))));
  values[code] = {
    analyzed_at: rubric.analyzed_at,
    assessments: rubric.axes.map(axis => ({
      axis_id: axis.id,
      current: card.current[axis.id] || {level:null,scope:'今回収録した資料の確認範囲',basis:'この軸の到達条件を満たす根拠の確認が不足しています。未達成・未導入という意味ではありません。',evidence_type:null,evidence:[]}
    })),
    future: {...future, author:'TLA', status:'hypothesis', official_target:false}
  };
}
assert.deepEqual(Object.keys(values).sort(),cohort.municipalities.map(m=>m.code).sort());
for (const [code, value] of Object.entries(values)) data.municipalities[code].public_value = value;
data.public_value_rubric = rubric;
data.revision = '2026-09-27-public-value-rubric-v1';
writeFileSync(path, JSON.stringify(data,null,2)+'\n');
const assessed = Object.values(values).flatMap(v=>v.assessments).filter(v=>v.current.level!==null);
console.log(JSON.stringify({cities:Object.keys(values).length,currentAssessments:assessed.length,unknown:700-assessed.length,futureCards:Object.keys(values).length,axes:Object.fromEntries(axisIds.map(id=>[id,assessed.filter(a=>a.axis_id===id).length]))},null,2));
