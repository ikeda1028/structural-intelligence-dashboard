import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeMunicipality,buildPeerIndex,benchmarkFor,readingPoints,unitLabel,tableUrl,isBaselineStat} from '../lib/co-creation/statistics.mjs';
const dataset=JSON.parse(readFileSync(new URL('../public/co-creation-assets/municipality-stats.json',import.meta.url)));
const sapporo=dataset.municipalities['01100'];
const metric=(m,id)=>analyzeMunicipality(m).metrics.find(s=>s.id===id);
function change(code,props) {
  const m=structuredClone(sapporo);
  Object.assign(m.stats.find(s=>s.code===code),props); return m;
}
test('Sapporo meaningful ratios use the intended denominator, not the first 18 rows',()=>{
  assert.equal(metric(sapporo,'older').value,541242/(215366+1185724+541242)*100);
  assert.equal(metric(sapporo,'single').value,422160/967372*100);
  assert.equal(metric(sapporo,'olderSingle').value,121789/967372*100);
  assert.equal(metric(sapporo,'tax').value,347606/1227840*100);
  assert.equal(metric(sapporo,'school').value,87431/5341);
  assert.equal(metric(sapporo,'workplace').value,872779/72730);
});
test('age chart includes unknown age rather than silently normalizing it away',()=>{
  const age=analyzeMunicipality(sapporo).ageStructure;
  assert.equal(age.segments[3].value,31063);
  assert.equal(age.segments.reduce((n,s)=>n+s.value,0),1973395);
  assert.ok(Math.abs(age.segments.reduce((n,s)=>n+s.share,0)-100)<1e-10);
});
test('different flow years stay separate and never become total population change',()=>{
  const a=analyzeMunicipality(sapporo);
  assert.equal(a.balances[0].value,-13491); assert.equal(a.balances[0].year,'2023');
  assert.equal(a.balances[1].value,10830); assert.equal(a.balances[1].year,'2024');
  assert.equal(a.totalPopulationChange,undefined);
});
test('missing, redacted, blank and malformed values are not zeros',()=>{
  for(const props of [{state:'missing',value:'0'},{state:'suppressed',value:'0'},{value:''},{value:null},{value:'NaN'},{value:false}]) {
    assert.equal(metric(change('A810105',props),'single').value,null);
  }
  assert.equal(metric(change('A810105',{value:'0'}),'single').value,0);
  assert.equal(metric(change('A710101',{value:'0'}),'single').value,null);
});
test('mismatched years/units and impossible totals are rejected',()=>{
  assert.equal(metric(change('A710101',{year:'2024'}),'single').value,null);
  assert.equal(metric(change('D3201',{unit:'千円'}),'tax').value,null);
  assert.equal(metric(change('A810105',{value:'2000000'}),'single').value,null);
  assert.equal(metric(change('A1303',{value:'3000000'}),'older').value,null);
  assert.equal(analyzeMunicipality(change('A1303',{value:'3000000'})).ageStructure,null);
  assert.equal(analyzeMunicipality(change('A4200',{year:'2024'})).balances[0].value,null);
});
test('benchmark is an auditable peer median, same year, excludes own city and insufficient groups',()=>{
  const index=buildPeerIndex(dataset), selected=metric(sapporo,'older');
  const b=benchmarkFor(index,'01100',selected);
  assert.equal(b.count,10); assert.equal(b.members.length,10);
  assert.ok(b.members.every(m=>m.code!=='01100'));
  assert.equal(b.median,(b.members[4].value+b.members[5].value)/2);
  assert.ok(b.group.includes('100万人以上'));
  assert.equal(benchmarkFor(index,'01100',{...selected,year:'2099'}),null);
  assert.equal(benchmarkFor(index.slice(0,2),'01100',selected),null);
});
test('all municipalities produce finite or explicitly unavailable metrics',()=>{
  assert.equal(Object.keys(dataset.municipalities).length,1741);
  for(const m of Object.values(dataset.municipalities)) {
    const a=analyzeMunicipality(m);
    for(const s of a.metrics) {
      assert.ok(s.value===null || Number.isFinite(s.value));
      if(s.value===null) assert.ok(s.reason);
      else {
        assert.ok(s.formula && s.inputs.length && s.meaning);
        if(s.unit==='%') assert.ok(s.value>=0 && s.value<=100);
        assert.equal(new Set(s.inputs.map(r=>r.year)).size,1);
      }
    }
  }
});
test('user-facing units and source table IDs are meaningful',()=>{
  assert.equal(unitLabel('人:person'),'人');
  assert.equal(unitLabel('百万円:million yen'),'百万円');
  assert.equal(unitLabel('(－)'),'指数');
  assert.ok(tableUrl('A1101').endsWith('000040463584'));
  assert.ok(tableUrl('J4101').endsWith('000040463593'));
  assert.equal(tableUrl('BUD-GEN'),null);
  for(const m of Object.values(dataset.municipalities)) assert.equal(m.stats.filter(isBaselineStat).length,89);
});
test('cross-indicator reading distinguishes single households from older people living alone',()=>{
  const points=readingPoints(analyzeMunicipality(sapporo),buildPeerIndex(dataset),'01100');
  assert.ok(points[0].text.includes('低い一方'));
  assert.ok(points[0].text.includes('43.6%')&&points[0].text.includes('12.6%'));
  const empty=analyzeMunicipality({stats:[]});
  assert.deepEqual(readingPoints(empty,[],'99999'),[]);
});
