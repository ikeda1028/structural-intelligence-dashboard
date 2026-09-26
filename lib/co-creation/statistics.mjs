// Interpret the stored SSDS data, never fabricate a trend, budget or demand estimate.
export const DEFINITION_URL = 'https://www.stat.go.jp/data/s-sugata/pdf/kisodata.pdf';
export const GROUPS = [
  ['A','人口・世帯',5],['B','土地・自然環境',6],['C','産業・経済',6],
  ['D','財政・決算',7],['E','教育',7],['F','就業・通勤',8],
  ['G','文化施設',8],['H','住まい・生活環境',9],['I','医療',9],['J','福祉・社会保障',10]
];
export const num = (n, digits = 0) => Number(n).toLocaleString('ja-JP', {minimumFractionDigits:digits,maximumFractionDigits:digits});
export function isBaselineStat(row) { return /^[A-J]\d+$/.test(row?.code || ''); }
export function unitLabel(unit = '') {
  const label = unit.split(':')[0].replace(/[()（）]/g,'').trim();
  return label === '－' ? '指数' : label === 'k㎡' ? 'km²' : label;
}
export function tableUrl(code) {
  if (!isBaselineStat({code})) return null;
  const index = GROUPS.findIndex(g => g[0] === code[0]);
  return index < 0 ? null : 'https://www.e-stat.go.jp/stat-search/file-download?fileKind=0&statInfId=' + (40463584 + index).toString().padStart(12,'0');
}
export function definitionUrl(code) {
  const group = isBaselineStat({code}) && GROUPS.find(g => g[0] === code[0]);
  return DEFINITION_URL + (group ? '#page=' + group[2] : '');
}
function indexStats(m) { return new Map((m?.stats || []).map(s => [s.code,s])); }
function numeric(s) {
  return s?.state === 'value' && typeof s.value !== 'boolean' && String(s.value ?? '').trim() !== '' && Number.isFinite(Number(s.value)) && Number(s.value) >= 0;
}
function inputs(map, codes, expectedUnits) {
  const rows = codes.map(code => map.get(code));
  if (!rows.every(numeric)) return {ok:false,rows,reason:'計算に必要な数値が欠測・秘匿、または未収録です。'};
  if (new Set(rows.map(s => s.year)).size !== 1 || !rows[0].year) return {ok:false,rows,reason:'計算に使う項目の対象年が揃わないため算出しません。'};
  if (expectedUnits ? rows.some((s,i)=>unitLabel(s.unit)!==expectedUnits[i]) : new Set(rows.map(s => s.unit)).size !== 1) return {ok:false,rows,reason:'計算式で想定した原単位と一致しないため算出しません。'};
  return {ok:true,rows,values:rows.map(s => Number(s.value)),year:rows[0].year};
}
const specs = [
  {id:'older',title:'高齢者の割合',codes:['A1303','A1301','A1302'],denom:v=>v.reduce((a,b)=>a+b,0),factor:100,unit:'%',digits:1,
    formula:'65歳以上 ÷（15歳未満 ＋ 15〜64歳 ＋ 65歳以上）× 100',
    meaning:(v)=>'年齢が分かる住民100人のうち約' + num(v) + '人が65歳以上です。',
    question:'高齢者向けサービスは、どれくらいの対象規模か？',
    action:'訪問・相談、移動支援、対面とデジタルを併用する窓口の設計を検討する入口です。',
    check:'介護認定率、地区別人口、利用意向、既存の地域包括支援事業と契約を確認する。',
    caveat:'年齢不詳を分母から除外。総人口を分母にする構成比とは異なります。高齢者数は要介護者数ではありません。'},
  {id:'single',title:'単独世帯の割合',codes:['A810105','A710101'],denom:v=>v[1],factor:100,unit:'%',digits:1,
    formula:'単独世帯数 ÷ 一般世帯数 × 100',
    meaning:v=>'一般世帯100世帯のうち約' + num(v) + '世帯が一人暮らしです。',
    question:'同居家族を前提にできない暮らしは、どれくらいあるか？',
    action:'一人でも利用しやすい生活支援、住まい、宅配、緊急連絡の仕組みを検討できます。',
    check:'年齢・所得・地区ごとの内訳、既存支援の利用状況、相談窓口の業務量を確認する。',
    caveat:'一般世帯を分母とし、施設等の世帯を含む総世帯数では割りません。一人暮らしを孤立や困窮と同一視しません。'},
  {id:'olderSingle',title:'高齢単独世帯の割合',codes:['A8301','A710101'],denom:v=>v[1],factor:100,unit:'%',digits:1,
    formula:'65歳以上の単独世帯数 ÷ 一般世帯数 × 100',
    meaning:v=>'一般世帯100世帯のうち約' + num(v) + '世帯が65歳以上の一人暮らしです。',
    question:'見守り・訪問支援の検討対象をどう捉えるか？',
    action:'訪問先の把握や相談のつなぎ先など、見守り・地域支援の業務設計を検討する基礎です。',
    check:'支援希望者の数、同意取得、既存見守り制度、要員・費用・委託状況を確認する。',
    caveat:'単独世帯の内数です。全単独世帯と足し合わせません。この全世帯が支援を必要とするわけではありません。'},
  {id:'concentration',title:'人口集中地区に住む割合',codes:['A1801','A1101'],denom:v=>v[1],factor:100,unit:'%',digits:1,
    formula:'人口集中地区人口 ÷ 国勢調査の総人口 × 100',
    meaning:v=>'総人口の' + num(v,1) + '%が、統計上の人口集中地区に住んでいます。',
    question:'サービス拠点や移動ルートをどこに置くか？',
    action:'拠点集約型のサービスと、地区外への訪問・移動支援を分けて検討する材料です。',
    check:'地区別地図、移動時間、交通供給、施設配置、利用者数を重ねて確認する。',
    caveat:'人口集中地区の割合は、実際の交通利便性や行政サービスの充足率ではありません。'},
  {id:'tax',title:'歳入に占める地方税',codes:['D320101','D3201'],denom:v=>v[1],factor:100,unit:'%',digits:1,
    formula:'地方税決算額 ÷ 歳入決算総額 × 100',
    meaning:v=>'歳入決算のうち地方税が' + num(v,1) + '%を占めます。残りをすべて補助金や借金とみなすことはできません。',
    question:'継続事業の財源を、どう確認すべきか？',
    action:'新規事業は地方税だけでなく、国・県支出金、交付税、地方債等の財源構成と継続費用を照合します。',
    check:'現行予算の款別歳入、該当事業の財源内訳、維持運営費、補助終了後の負担を確認する。',
    caveat:'過去の決算構成です。財政の自由度、財政力指数、自主財源比率、現在の予算余力とは別物です。'},
  {id:'school',title:'小学校の本務教員1人当たり児童',codes:['E2501','E2401'],denom:v=>v[1],factor:1,unit:'人',digits:1,
    formula:'小学校児童数 ÷ 小学校の本務教員数',
    meaning:v=>'小学校全体を集計すると、本務教員1人に対して児童' + num(v,1) + '人です。',
    question:'教育現場の業務量を何から確認するか？',
    action:'校務支援・学習支援の検討に使う規模指標です。学校単位の業務と利用環境の確認につなげます。',
    check:'設置者別・学校別人数、学級編制、勤務時間、端末・校務システムと契約を確認する。',
    caveat:'学級人数・教員不足率ではありません。自治体内の学校の統計であり、市立だけの値とは限りません。'},
  {id:'workplace',title:'民営事業所1か所当たり従業者',codes:['C2208','C2108'],units:['人','事業所'],denom:v=>v[1],factor:1,unit:'人',digits:1,
    formula:'民営事業所の従業者数 ÷ 民営事業所数',
    meaning:v=>'民営事業所の平均規模は従業者' + num(v,1) + '人です。',
    question:'地域企業へのDX支援は、どの単位で設計するか？',
    action:'事業所向けの相談・導入支援を設計する基礎です。業種と規模で分け、共通業務を探します。',
    check:'業種別・従業者規模別の分布、既存相談制度、対象企業数、補助・委託の募集条件を確認する。',
    caveat:'平均は大規模事業所の影響を受けます。企業数や中小企業比率、DX未導入率ではありません。'}
];
function metric(map,spec) {
  const pair = inputs(map,spec.codes,spec.units);
  const out = {...spec,inputs:pair.rows.filter(Boolean),year:pair.year || null,value:null,reason:pair.reason || ''};
  delete out.denom; delete out.meaning;
  if (!pair.ok) return out;
  if (spec.id === 'older') {
    const total=map.get('A1101');
    if (!numeric(total) || total.year!==pair.year || pair.values.reduce((a,b)=>a+b,0)>Number(total.value)) return {...out,reason:'同年の総人口と年齢内訳の整合性を確認できないため算出しません。'};
  }
  const denominator = spec.denom(pair.values);
  if (denominator <= 0 || (spec.unit === '%' && pair.values[0] > denominator)) return {...out,reason:'分母が0、または内訳の整合性を確認できないため算出しません。'};
  const value = pair.values[0] / denominator * spec.factor;
  return {...out,value,meaning:spec.meaning(value)};
}
function balance(map,id,title,codes,formula) {
  const pair=inputs(map,codes);
  return {id,title,formula,inputs:pair.rows.filter(Boolean),year:pair.year || null,
    value:pair.ok ? pair.values[0]-pair.values[1] : null,reason:pair.reason || ''};
}
export function analyzeMunicipality(m) {
  const map=indexStats(m);
  const metrics=specs.map(s=>metric(map,s));
  const age = inputs(map,['A1101','A1301','A1302','A1303']);
  let ageStructure = null;
  if (age.ok && age.values[0] > 0) {
    const [total,child,working,older]=age.values, unknown=total-child-working-older;
    if (unknown >= 0) ageStructure={year:age.year,total,inputs:age.rows,segments:[
      ['15歳未満',child],['15〜64歳',working],['65歳以上',older],['年齢不詳相当',unknown]
    ].map(([label,value])=>({label,value,share:value/total*100}))};
  }
  return {metrics,ageStructure,balances:[
    balance(map,'natural','出生数 − 死亡数',['A4101','A4200'],'出生数 − 死亡数'),
    balance(map,'migration','転入者数 − 転出者数',['A5103','A5104'],'転入者数 − 転出者数')
  ]};
}
function peerGroup(m) {
  const population=indexStats(m).get('A1101');
  if (!numeric(population)) return null;
  const type=m.name?.endsWith('市')?'市':m.name?.endsWith('区')?'特別区':/[町村]$/.test(m.name||'')?'町村':null;
  if (!type) return null;
  const bounds=[0,10000,50000,100000,300000,1000000,Infinity];
  const labels=['1万人未満','1万〜5万人未満','5万〜10万人未満','10万〜30万人未満','30万〜100万人未満','100万人以上'];
  const band=bounds.findIndex((lower,i)=>Number(population.value)>=lower&&Number(population.value)<bounds[i+1]);
  return {key:type+':'+band+':'+population.year,label:population.year+'年国勢調査人口が'+labels[band]+'の'+type};
}
export function buildPeerIndex(dataset) {
  return Object.entries(dataset?.municipalities||{}).map(([code,m])=>({code,name:m.name,group:peerGroup(m),metrics:analyzeMunicipality(m).metrics}));
}
export function benchmarkFor(index,code,selectedMetric) {
  const selected=index.find(m=>m.code===code);
  if (!selected?.group || selectedMetric.value === null) return null;
  const members=index.filter(m=>m.code!==code && m.group?.key===selected.group.key).flatMap(m=>{
    const v=m.metrics.find(s=>s.id===selectedMetric.id);
    return v?.value != null && v.year===selectedMetric.year ? [{code:m.code,name:m.name,value:v.value}] : [];
  }).sort((a,b)=>a.value-b.value);
  if (members.length<3) return null;
  const middle=Math.floor(members.length/2);
  const median=members.length%2 ? members[middle].value : (members[middle-1].value+members[middle].value)/2;
  return {median,count:members.length,members,group:selected.group.label,delta:selectedMetric.value-median};
}
export function readingPoints(analysis,index,code) {
  const points=[], get=id=>analysis.metrics.find(m=>m.id===id);
  const single=get('single'), olderSingle=get('olderSingle'), tax=get('tax');
  const a=benchmarkFor(index,code,single), b=benchmarkFor(index,code,olderSingle);
  if(a&&b&&single.year===olderSingle.year) {
    const low=a.delta<0, high=b.delta>0;
    points.push({
      title:'一人暮らしは、年齢を分けて考える',
      text:single.year+'年の単独世帯割合は'+num(single.value,1)+'%（比較対象中央値'+num(a.median,1)+'%）、高齢単独世帯割合は'+num(olderSingle.value,1)+'%（同'+num(b.median,1)+'%）。'+
        (low&&high?'一人暮らし全体の割合は比較対象より低い一方、高齢者の一人暮らしの割合は高いという違いがあります。':'全単独世帯と、その内数である高齢単独世帯を分けると、同じ「一人暮らし」でも支援対象を絞れます。'),
      implication:'生活支援の検討では、全世帯向けのサービスと、高齢単独世帯の見守り・訪問支援を分けて利用意向を調べます。実際の支援不足を示すものではありません。'
    });
  }
  if(tax?.value!=null) points.push({
    title:'税収構成と、提案に使える予算は別',
    text:tax.year+'年度決算では、地方税が歳入の'+num(tax.value,1)+'%。この値だけで「財源がない／ある」とは言えません。',
    implication:'継続的なサービスを提案するなら、当年度の事業費だけでなく、補助終了後の運営費を誰が負担するかまで財源内訳と照合します。'
  });
  return points;
}
