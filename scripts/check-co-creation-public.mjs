import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {lookup,match} from '../lib/co-creation/core.mjs';
const base='https://structural-intelligence-dashboard.vercel.app';
let last='not started';
for(let attempt=1;attempt<=24;attempt++){
  try{
    const page=await fetch(base+'/co-creation',{redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert.equal(page.status,200,'public HTML must be accessible without authentication');
    assert.ok(page.headers.get('content-type')?.includes('text/html'));
    const html=await page.text();assert.ok(html.includes('共創OS'));
    const response=await fetch(base+'/api/co-creation',{redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200);const data=await response.json();
    assert.equal(data.release,'2026-09-26-v0.2-bundled');
    assert.equal(data.municipalities.length,1741);assert.equal(new Set(data.municipalities.map(m=>m.pref_code)).size,47);
    assert.equal(data.companies.length,6);assert.equal(data.evidence.length,9);
    const company=lookup(data,'フォーバル')[0];assert.ok(company);const matches=match(data,company,data.municipalities);assert.ok(matches.length>0);assert.ok(matches.every(m=>m.evidence.status!=='closed'));
    const paths=[...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m=>m[1]);
    assert.ok(paths.some(p=>p.includes('.js')),'Next.js script must be present');
    for(const path of [...new Set(paths)].slice(0,8)){const url=new URL(path,base);assert.equal(url.origin,base);const asset=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(asset.status,200,'static asset');}
    console.log(JSON.stringify({status:'PUBLIC_HTTP_SMOKE_PASSED',url:base+'/co-creation',htmlStatus:200,apiStatus:200,municipalities:data.municipalities.length,prefectures:47,companies:data.companies.length,evidence:data.evidence.length,forvalMatches:matches.length,researchConfigured:data.researchConfigured,release:data.release,checkedAt:new Date().toISOString()}));
    process.exit(0);
  }catch(e){last=e.message;console.log('Attempt '+attempt+': '+last);if(attempt<24)await sleep(5000);}
}
throw Error('Public smoke failed: '+last);
