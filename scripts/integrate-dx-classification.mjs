// Mechanical integration of manually reviewed, disjoint classification batches.
// Usage: node scripts/integrate-dx-classification.mjs batch1.json ... batchN.json
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir = new URL('../public/co-creation-assets/', import.meta.url);
const path = new URL('major100-research.json', dir);
const data = JSON.parse(readFileSync(path, 'utf8'));
const cohort = JSON.parse(readFileSync(new URL('major-municipalities-100.json', dir), 'utf8'));
const batches = process.argv.slice(2);
assert.ok(batches.length, 'Provide reviewed classification batch JSON files');
const stages = [
  { code: 'P', label: '計画・予算・調達', definition: '計画、予算、公募・選定までを確認。実証開始・本番稼働は未確認。', business_hint: '現行業務・仕様・評価方法の設計支援。ただし選定済み案件の新規参入は別途確認。' },
  { code: 'T', label: '実証・試行', definition: '実施済み・開始済みの試行を確認。本番稼働は未確認。', business_hint: '精度・安全性・現場負担の検証、本番移行条件の整理。' },
  { code: 'O', label: '本番運用', definition: 'サービス提供・業務利用を確認。利用件数だけでは効果測定としない。', business_hint: '利用定着、業務連携、品質評価。既存製品・契約との整合を先に確認。' },
  { code: 'M', label: '本番運用＋効果測定', definition: '本番業務の時間短縮・満足度等の結果を確認。推計・自己申告を含む場合は明記。', business_hint: '測定方法の検証、改善対象の特定、効果を検証したうえでの横展開。' },
  { code: 'I', label: '効果に基づく継続改善', definition: '測定結果に基づく改善の実施と、その後の再測定までを確認。', business_hint: '継続評価や他業務への展開支援。個別の調達入口は別途確認。' },
  { code: 'U', label: '判定保留', definition: '収録資料では段階の根拠が足りない。未導入・低成熟度という意味ではない。', business_hint: 'まず稼働報告・評価資料を追加確認し、課題と既存導入を把握する。' }
];
const values = {};
for (const file of batches) for (const [code, value] of Object.entries(JSON.parse(readFileSync(file, 'utf8')))) {
  assert.ok(!values[code], 'Duplicate code: ' + code);
  assert.ok(stages.some(s => s.code === value.stage), code);
  assert.ok(value.scope && value.reason && value.limitations?.length && value.evidence?.length, code);
  const city = data.municipalities[code]; assert.ok(city, code);
  assert.ok(value.evidence.some(ref => ref.role === 'stage'), code);
  for (const ref of value.evidence) {
    const doc = city.documents.find(d => d.id === ref.document_id);
    assert.ok(doc?.review_status === 'body_reviewed', code);
    assert.ok(Number.isInteger(ref.finding_index) && ref.finding_index >= 0 && doc.findings[ref.finding_index], code);
    assert.ok(['stage', 'context'].includes(ref.role), code);
  }
  values[code] = value;
}
assert.deepEqual(Object.keys(values).sort(), cohort.municipalities.map(m => m.code).sort());
for (const [code, value] of Object.entries(values)) data.municipalities[code].dx_evidence = value;
data.dx_classification = {
  version: 1, classified_at: '2026-09-27', evidence_revision: '2026-09-27-final35-primary-review-kpi-1',
  scope_note: '既存214資料の部分レビューから、特定業務で確認できた最も先の段階を分類しました。自治体全体の成熟度・優劣・最新状態ではありません。計画段階と表示された自治体も、未収録分野で運用している可能性があります。全庁展開の広さと個別業務の効果測定は別軸です。',
  stages
};
data.revision = '2026-09-27-major100-dx-evidence-classification-1';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(stages.map(s => [s.label, Object.values(values).filter(v => v.stage === s.code).length])), null, 2));
