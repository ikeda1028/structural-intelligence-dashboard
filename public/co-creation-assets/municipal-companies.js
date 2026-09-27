/* Primary-source cases; rendering never turns a selected supplier into a contractor. */
(() => {
  'use strict';
  const base = '/co-creation-assets/';
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const link = (label, href) => {
    const n = el('a', label);
    try {
      const u = new URL(href, window.location.href);
      if (u.protocol === 'https:' || (u.protocol === window.location.protocol && u.origin === window.location.origin)) n.href = u.href;
    } catch { /* Untrusted data is text, never markup or executable URLs. */ }
    return n;
  };
  const validId = id => /^[a-z0-9-]+$/.test(id);
  const profileUrl = id => base + 'municipal-companies.html#company-' + (validId(id) ? id : '');
  const cityUrl = code => base + 'major100-research.html#city-' + (/^\d{5}$/.test(code) ? code : '');
  const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase('ja-JP');
  const unique = array => [...new Set(array)];
  let request;
  async function load() {
    if (!request) request = (async () => {
      const response = await fetch(base + 'municipal-companies.json');
      if (!response.ok) throw new Error('Company data unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.relations) || !Array.isArray(data.statuses) || !data.companies || !data.municipalities) throw new Error('Invalid company data');
      return data;
    })().catch(() => null);
    return request;
  }
  function status(data, code) {
    return data.statuses.find(s => s.code === code) || { label: '関係未確認', definition: '分類データを確認してください。' };
  }
  function caseCard(data, r, context) {
    const company = data.companies[r.company_id], city = data.municipalities[r.municipality_code];
    const card = el('section', undefined, 'company-case');
    card.dataset.relationStatus = r.status;
    card.id = 'case-' + r.id;
    const heading = el('h4');
    heading.append(context === 'municipality' ? link(company.name, profileUrl(company.id)) : link(city.name + 'の自治体レポート', cityUrl(r.municipality_code)));
    const st = status(data, r.status);
    card.append(heading, el('p', st.label, 'tag company-status'), el('p', r.business, 'company-business'));
    card.append(el('p', '対象時点・期間：' + r.period, 'small'));
    card.append(el('p', '強み・対応領域の読み取り：' + r.strength_note, 'company-strength'));
    card.append(el('p', '判断の限界：' + r.limitation, 'small'));
    const evidence = el('details');
    evidence.append(el('summary', '根拠資料・企業名の表記を見る'));
    evidence.append(el('p', '資料上の企業名：' + r.source_name, 'small'), el('p', st.definition, 'small'));
    r.evidence.forEach(ref => {
      const page = ref.locator.match(/PDF\s*(\d+)/)?.[1];
      evidence.append(el('p', ref.observation), link(ref.title + ' — ' + ref.locator, ref.url + (page ? '#page=' + page : '')), el('p', '確認日：' + ref.checked_at + (ref.document_id ? ' ／ 既存収録資料の該当箇所' : ' ／ 追加確認した公式資料'), 'small'));
    });
    card.append(evidence);
    if (context === 'municipality') {
      card.append(link('企業別の関連自治体・強みを見る →', profileUrl(company.id)));
      if (company.official_url) {
        card.append(document.createTextNode(' ／ '), link('企業公式情報', company.official_url));
      }
    }
    return card;
  }
  function section(code, data) {
    const section = el('section', undefined, 'municipality-companies');
    section.append(el('h3', '実際に関わる企業・団体と役割'));
    section.append(link('100自治体を企業別に横断して見る', base + 'municipal-companies.html'));
    if (!data || !data.municipalities[code]) {
      section.append(el('p', '企業データを読み込めませんでした。再読み込みするか企業別ページを開いてください。', 'note'));
      return section;
    }
    const city = data.municipalities[code];
    const cases = data.relations.filter(r => r.municipality_code === code);
    section.append(el('p', '受託・構築、候補者選定、サービス提供、実証・協定を区別しています。過去の実績を含み、現在も契約中とは限りません。', 'small'));
    if (!cases.length) {
      section.append(el('p', '今回の収録資料では企業名と関係を特定できていません。受託企業が存在しないという意味ではありません。', 'scope'));
      section.append(el('p', '次の確認先：業務名に対応する契約結果・落札結果、随意契約理由、指定管理者の選定結果。', 'small'));
    } else {
      const contractors = unique(cases.filter(r => r.status === 'contracted').map(r => r.company_id));
      section.append(el('p', unique(cases.map(r => r.company_id)).length + '企業・団体／' + cases.length + '件の関与。このうち委託先・構築実績確認は' + contractors.length + '社。', 'small'));
      cases.forEach(r => section.append(caseCard(data, r, 'municipality')));
    }
    section.append(el('p', city.review_note + ' 強みは事例に基づく分析で、企業の公式評価ではありません。', 'small'));
    return section;
  }
  async function startIndex() {
    const data = await load(), root = document.getElementById('companies-app');
    if (!data) {
      root.replaceChildren(el('p', '企業データを読み込めませんでした。再読み込みしてください。', 'note'));
      return;
    }
    root.replaceChildren();
    const cities = Object.entries(data.municipalities);
    const companies = Object.values(data.companies);
    const actual = data.relations.filter(r => r.status === 'contracted');
    const covered = cities.filter(([, c]) => c.relation_ids.length);
    const summary = document.getElementById('companies-summary');
    summary.append(el('p', data.scope_note, 'scope'), el('p', data.strength_note, 'small'));
    const counts = el('div', undefined, 'company-counts');
    for (const [value, label] of [
      [cities.length, '自治体を抽出対象に'],
      [covered.length, '自治体で企業等を特定'],
      [companies.filter(c => c.kind === 'company').length, '企業（関係段階の合計）'],
      [companies.filter(c => c.kind !== 'company').length, '企業以外の団体'],
      [unique(actual.map(r => r.company_id)).length, '委託先・構築実績確認の企業'],
      [actual.length, '委託先・構築実績の関与記録']
    ]) {
      const item = el('div'); item.append(el('strong', String(value)), el('span', label)); counts.append(item);
    }
    summary.append(counts, el('p', '更新：' + data.updated_at + ' ／ 関与未特定 ' + (cities.length - covered.length) + '自治体。全自治体で受託者を特定済み、という意味ではありません。件数はこの収録範囲のみで、全国シェアではありません。', 'small'));
    const definitions = el('details');
    definitions.append(el('summary', '関係区分の意味'));
    data.statuses.forEach(s => definitions.append(el('h3', s.label), el('p', s.definition)));
    summary.append(definitions);
    const controls = el('div', undefined, 'company-filters');
    const search = el('input'); search.type = 'search'; search.id = 'company-search'; search.placeholder = '例：つくば、窓口、NTT';
    const label = el('label', '企業名・自治体名・業務から探す'); label.htmlFor = search.id;
    const select = el('select'); select.id = 'company-status-filter';
    const all = el('option', 'すべての関係区分'); all.value = ''; select.append(all);
    data.statuses.forEach(s => { const opt = el('option', s.label); opt.value = s.code; select.append(opt); });
    const sl = el('label', '確認できた関係'); sl.htmlFor = select.id;
    const reset = el('button', '条件をクリア'); reset.type = 'button';
    const count = el('p', undefined, 'small'); count.id = 'company-result-count'; count.setAttribute('aria-live', 'polite');
    controls.append(label, search, sl, select, reset); root.append(controls, count);
    const results = el('div'); results.id = 'company-results'; root.append(results);
    const profile = el('article', undefined, 'company-profile'); profile.id = 'company-profile'; root.append(profile);
    const coverage = el('details', undefined, 'company-coverage'); coverage.id = 'company-coverage';
    coverage.append(el('summary', '100自治体それぞれの抽出状況を見る'));
    const ul = el('ul');
    cities.sort((a, b) => a[1].name.localeCompare(b[1].name, 'ja')).forEach(([code, c]) => {
      const li = el('li'); li.append(link(c.name, cityUrl(code)), document.createTextNode(c.relation_ids.length ? ' — ' + c.relation_ids.length + '件の関与を掲載' : ' — 今回の資料では企業・関係を未特定'));
      ul.append(li);
    });
    coverage.append(ul); root.append(coverage);
    function showProfile() {
      let hash;
      try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!hash.startsWith('company-') || hash === 'company-coverage') return;
      const id = hash.slice(8), company = data.companies[id];
      profile.replaceChildren();
      if (!company) {
        profile.append(el('p', '該当する企業の収録がありません。企業一覧から選び直してください。', 'note'));
        return;
      }
      profile.dataset.companyId = id;
      const cases = data.relations.filter(r => r.company_id === id);
      const h = el('h2', company.name); h.id = hash; h.tabIndex = -1;
      profile.append(h, el('p', company.kind === 'company' ? '企業' : '企業以外の団体', 'tag'));
      const ownActual = cases.filter(r => r.status === 'contracted');
      profile.append(el('p', '関係自治体 ' + unique(cases.map(r => r.municipality_code)).length + ' ／ 委託先・構築実績を確認した自治体 ' + unique(ownActual.map(r => r.municipality_code)).length + '。以下は当該企業の掲載案件をすべて表示しています。', 'small'));
      if (company.official_url) profile.append(link('企業の公式情報を開く ↗', company.official_url));
      else profile.append(el('p', '企業公式サイトの同定は未掲載。下記の自治体公式資料で法人名と役割を確認できます。', 'small'));
      profile.append(el('h3', '強み・対応領域と、その根拠となる自治体案件'), el('p', data.strength_note, 'small'));
      profile.append(el('p', '掲載事例の領域：' + unique(cases.map(r => r.capability)).join(' ／ '), 'company-capabilities'));
      cases.forEach(r => profile.append(caseCard(data, r, 'company')));
      profile.append(link('企業一覧へ戻る', '#company-results'));
      h.focus({ preventScroll: true }); h.scrollIntoView?.({ block: 'start' });
    }
    function renderResults() {
      results.replaceChildren();
      const terms = normalize(search.value).split(/\s+/).filter(Boolean);
      const matches = data.relations.filter(r => {
        if (select.value && r.status !== select.value) return false;
        const c = data.companies[r.company_id];
        const text = normalize([c.name, ...c.aliases, data.municipalities[r.municipality_code].name, r.business, r.capability].join(' '));
        return terms.every(t => text.includes(t));
      });
      const ids = unique(matches.map(r => r.company_id));
      ids.sort((a, b) => {
        const n = id => unique(matches.filter(r => r.company_id === id).map(r => r.municipality_code)).length;
        return n(b) - n(a) || data.companies[a].name.localeCompare(data.companies[b].name, 'ja');
      });
      count.textContent = ids.length + '企業・団体／' + unique(matches.map(r => r.municipality_code)).length + '自治体／' + matches.length + '件の関与を表示';
      if (!ids.length) { results.append(el('p', '条件に一致する掲載事例はありません。未収録の案件・企業がないという意味ではありません。', 'note')); return; }
      const wrapper = el('div', undefined, 'table-scroll'), table = el('table');
      table.append(el('caption', '企業名を選ぶと、案件別の強み・期間・出典を表示します。自治体数は検索条件に一致する範囲です。'));
      const head = el('thead'), hr = el('tr');
      ['企業・団体', '対応領域', '関係自治体・段階'].forEach(t => hr.append(el('th', t))); head.append(hr); table.append(head);
      const body = el('tbody');
      ids.forEach(id => {
        const c = data.companies[id], rows = matches.filter(r => r.company_id === id);
        const tr = el('tr'); tr.dataset.companyId = id;
        const name = el('th'), a = link(c.name, '#company-' + id); name.scope = 'row'; name.append(a);
        a.addEventListener('click', () => { if (window.location.hash === '#company-' + id) showProfile(); });
        if (c.kind !== 'company') name.append(el('p', '企業以外の団体', 'small'));
        const fields = el('td', unique(rows.map(r => r.capability)).join(' ／ '));
        const municipalities = el('td');
        unique(rows.map(r => r.municipality_code)).forEach(code => {
          const p = el('p'); p.append(link(data.municipalities[code].name, cityUrl(code)), document.createTextNode(' — ' + unique(rows.filter(r => r.municipality_code === code).map(r => status(data, r.status).label)).join('・'))); municipalities.append(p);
        });
        tr.append(name, fields, municipalities); body.append(tr);
      });
      table.append(body); wrapper.append(table); results.append(wrapper);
    }
    search.addEventListener('input', renderResults); select.addEventListener('change', renderResults);
    reset.addEventListener('click', () => { search.value = ''; select.value = ''; renderResults(); });
    window.addEventListener('hashchange', showProfile);
    renderResults(); showProfile();
  }
  window.MunicipalCompanies = Object.freeze({ load, section, profileUrl });
  if (document.body.dataset.mode === 'companies') startIndex().catch(() => {
    document.getElementById('companies-app').replaceChildren(el('p', '企業データの表示に失敗しました。再読み込みしてください。', 'note'));
  });
})();
