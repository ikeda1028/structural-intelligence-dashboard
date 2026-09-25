/** Pure, testable functions. No scores, inferred budgets, or hidden contacts. */
export function normalize(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/株式会社|有限会社|合同会社|特定非営利活動法人|一般社団法人|\s+/g, '');
}
export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || !h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(h)) return null;
    u.hash = ''; return u.href;
  } catch { return null; }
}
export function lookup(seed, name) {
  const n = normalize(name);
  return n ? seed.companies.filter(c => [c.name, ...c.aliases].some(x => normalize(x) === n)) : [];
}
export function parseGsi(text) {
  // Parse literal records; never eval remote JavaScript.
  const rows = new Map();
  const re = /GSI\.MUNI_ARRAY\["\d+"\]\s*=\s*'(\d+),([^,']+),(\d+),([^']+)'/g;
  for (const m of text.matchAll(re)) {
    const code = m[3].padStart(5, '0'), name = m[4].trim();
    if (/[\s\u3000]/.test(name) || code === '04423' || (code >= '01695' && code <= '01700')) continue;
    if (!/^\d{5}$/.test(code)) continue;
    rows.set(code, {code, name, prefecture: m[2], pref_code: m[1].padStart(2, '0')});
  }
  const result = [...rows.values()].sort((a,b) => a.code.localeCompare(b.code));
  if (result.length < 1700 || result.length > 1900 || new Set(result.map(r => r.pref_code)).size !== 47) throw Error('全国台帳の件数・形式を検証できません');
  return result;
}
export function match(seed, company, municipalities) {
  const tags = new Set(company.resources.map(r => r.tag));
  const ms = new Map(municipalities.map(m => [m.code, m]));
  const ss = new Map(seed.sources.map(s => [s.id, s]));
  return seed.evidence.filter(e => e.status !== 'closed' && ms.has(e.municipality_code) && ss.has(e.source_id) && e.tags.some(t => tags.has(t))).map(e => {
    const uncovered = e.tags.filter(t => !tags.has(t));
    return {
      id: `${company.id}:${e.id}`, municipality: ms.get(e.municipality_code), evidence: e, source: ss.get(e.source_id),
      shared: e.tags.filter(t => tags.has(t)), uncovered,
      partners: seed.companies.filter(c => c.id !== company.id && normalize(c.name) !== normalize(company.name) && c.resources.some(r => uncovered.includes(r.tag))).map(c => ({id:c.id,name:c.name,tags:c.resources.map(r=>r.tag).filter(t=>uncovered.includes(t)),source_ids:c.source_ids})).slice(0,3),
      roles: [...new Set(e.tags.flatMap(t => seed.tags[t]?.roles || []))],
      next: '原資料と担当部署に現在の状況を確認し、新しい協力余地と条件を照会する。紹介・応募は自動送信しません。'
    };
  }).sort((a,b) => a.municipality.code.localeCompare(b.municipality.code) || a.id.localeCompare(b.id));
}
export function validateInput(body) {
  if (!body || typeof body !== 'object' || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120 || /[\r\n<>\u0000-\u001f]/.test(body.name)) throw Error('企業・団体名を2〜120文字で入力してください');
  const officialUrl = body.officialUrl ? safeUrl(body.officialUrl) : '';
  if (body.officialUrl && !officialUrl) throw Error('公式URLには公開HTTPSサイトを指定してください');
  if (body.consent !== true) throw Error('企業名・URLの外部AI送信への同意が必要です');
  return {name: body.name.trim(), officialUrl};
}
export function parseResearch(response, seed, input) {
  if (response.status !== 'completed') throw Error('調査が完了していません');
  const allowed = new Set();
  for (const item of response.output || []) {
    for (const source of item.action?.sources || []) { const u = safeUrl(source.url); if (u) allowed.add(u); }
    for (const content of item.content || []) for (const a of content.annotations || []) {
      const u = safeUrl(a.url || a.url_citation?.url); if (u) allowed.add(u);
    }
  }
  const text = (response.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
  let data; try {data = JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));} catch {throw Error('調査結果の形式を確認できません');}
  if(!data || typeof data !== 'object' || data.ambiguous !== false) throw Error('法人の特定結果を確認できません。公式URLを指定してください');
  const official = safeUrl(data.official_url);
  if (!official || !allowed.has(official)) throw Error('公式サイトを特定できません。公式URLを指定して再調査してください');
  if (input.officialUrl && new URL(input.officialUrl).hostname.replace(/^www\./,'') !== new URL(official).hostname.replace(/^www\./,'')) throw Error('入力した公式URLと調査結果が一致しません');
  const sources=[], resources=[];
  for (const r of (Array.isArray(data.resources) ? data.resources : []).slice(0,8)) {
    if(!r || typeof r !== 'object') continue;
    const url=safeUrl(r.source_url);
    if (!Object.hasOwn(seed.tags,r.tag) || !url || !allowed.has(url) || typeof r.description !== 'string' || !r.description.trim()) continue;
    const source_id=`live-${sources.length}`;
    sources.push({id:source_id,url,title:'AI調査の参照元（原資料の確認が必要）',retrieved_at:new Date().toISOString().slice(0,10)});
    resources.push({tag:r.tag,description:r.description.slice(0,350),source_id,availability:'提供条件・参加意思は未確認'});
  }
  if (!resources.length) throw Error('出典と照合できる公開リソースがありません');
  return {company:{id:`live-${normalize(input.name)}`,name:String(data.name || input.name).slice(0,120),aliases:[],official_url:official,summary:'Web検索から抽出した暫定プロフィール。法人番号・提供条件は未確認です。',resources,source_ids:sources.map(s=>s.id),notes:[],mode:'ai-unverified'},sources};
