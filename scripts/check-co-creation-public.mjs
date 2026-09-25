import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {lookup,match} from '../public/co-creation-assets/core.mjs';
const base='https://structural-intelligence-dashboard.vercel.app';
let last='not started';
for(let attempt=1;attempt<=24;attempt++){
  try{
    const page=await fetch(base+'/co-creation',{redirect:'manual',signal:AbortSignal.timeout(12000)});
    assert.equal(page.status,200,'public HTML must be accessible without authentication');
    assert.ok(page.headers.get('content-type')?.includes('text/html'));
    assert.ok(page.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
    const html=await page.text();assert.ok(html.includes('TLA 共創OS'));assert.ok(html.includes('company-name'));
    const response=await fetch(base+'/api/co-creation',{redirect:'manual',signal:AbortSignal.timeout(12000)});
    assert.equal(response.status,200);const data=await response.json();
    assert.equal(data.release,'2026-09-26-v0.2');
    assert.equal(data.municipalities.length,1741);assert.equal(new Set(data.municipalities.map(m=>m.pref_code)).size,47);
    assert.equal(data.companies.length,6);assert.equal(data.evidence.length,9);
    const forval=lookup(data,'フォーバル')[0];assert.ok(forval);const matches=match(data,forval,data.municipalities);assert.ok(matches.length>0);assert.ok(matches.every(m=>m.evidence.status!=='closed'));
    for(const path of ['/co-creation-assets/app.mjs','/co-creation-assets/core.mjs']){
      const asset=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(12000)});assert.equal(asset.status,200);assert.match(asset.headers.get('content-type')||'',/javascript/);
    }
    const css=await fetch(base+'/co-creation-assets/style.css',{redirect:'manual',signal:AbortSignal.timeout(12000)});assert.equal(css.status,200);assert.match(css.headers.get('content-type')||'',/text\/css/);
    console.log(JSON.stringify({status:'PUBLIC_HTTP_SMOKE_PASSED',url:base+'/co-creation',municipalities:data.municipalities.length,prefectures:47,companies:data.companies.length,evidence:data.evidence.length,forvalMatches:matches.length,researchConfigured:data.researchConfigured,release:data.release,checkedAt:new Date().toISOString()}));
    process.exit(0);
  }catch(e){last=e.message;console.log('Attempt '+attempt+': '+last);if(attempt<24)await sleep(5000);}
}
throw Error('Public smoke failed: '+last);
