/* Shared, text-only renderer for both the cohort and source-reviewed reports. */
(() => {
  'use strict';
  const base = '/co-creation-assets/';
  let dxMethod;
  let valueRubric;
  let companyData;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const list = (items) => {
    const ul = el('ul');
    items.forEach(item => ul.append(el('li', item)));
    return ul;
  };
  const link = (label, href) => {
    const a = el('a', label);
    try {
      const url = new URL(href, window.location.href);
      if (url.protocol === 'https:' || url.origin === window.location.origin) a.href = url.href;
    } catch { /* Invalid sources are rendered as text, never executable links. */ }
    return a;
  };
  async function json(path) {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }
  function citation(doc, locator) {
    const page = locator.match(/PDF\s*(\d+)/)?.[1];
    const p = el('p', undefined, 'small');
    p.append(link('該当箇所：' + locator, doc.source_url + (page ? '#page=' + page : '')));
    return p;
  }
  function sourceReport(doc) {
    const section = el('section', undefined, 'document');
    section.append(el('h3', doc.title));
    section.append(el('p', '原資料本文・対象箇所確認', 'tag'));
    section.append(el('p', doc.summary));
    section.append(el('p', '対象：' + doc.source_period + ' ／ 確認日：' + doc.checked_at, 'small'));
    section.append(el('p', '確認範囲：' + doc.review_scope, 'scope'));
    const url = doc.source_url + (doc.pdf_pages.length ? '#page=' + doc.pdf_pages[0] : '');
    section.append(link('公式原資料を開く', url));
    const detail = el('details');
    detail.append(el('summary', '根拠・予算・確認できない点を見る'));
    const facts = el('ul');
    doc.findings.forEach(f => {
      const li = el('li');
      li.append(el('strong', '【' + f.state + '】'), el('span', f.text), citation(doc, f.locator));
      facts.append(li);
    });
    detail.append(facts);
    if (doc.budgets.length) {
      detail.append(el('h4', '資料に記載された金額（単位・対象範囲・予算段階を併記）'));
      const wrapper = el('div', undefined, 'table-scroll');
      const table = el('table');
      const head = el('thead');
      const hr = el('tr');
      ['事業・範囲', '金額', '段階・該当箇所'].forEach(t => hr.append(el('th', t)));
      head.append(hr); table.append(head);
      const tbody = el('tbody');
      doc.budgets.forEach(b => {
        const row = el('tr');
        const name = el('td');
        name.append(el('strong', b.label), el('p', b.scope, 'small'));
        const amount = el('td', b.amount.toLocaleString('ja-JP') + b.unit, 'num');
        const provenance = el('td', b.fiscal_year + '年度・' + b.stage);
        provenance.append(citation(doc, b.locator));
        row.append(name, amount, provenance); tbody.append(row);
      });
      table.append(tbody); wrapper.append(table); detail.append(wrapper);
      detail.append(el('p', '総額と内訳、異なる資料間の重複を単純に合算しません。予算額は未契約残額・現在の募集額ではありません。', 'small'));
    }
    detail.append(el('h4', 'この資料からは判断できないこと'), list(doc.limits));
    section.append(detail);
    return section;
  }
  function nonFinancialIndicators(city) {
    const section = el('section', undefined, 'indicators');
    section.append(el('h3', '金額以外で見る成果・評価指標'));
    const indicators = city.non_financial_indicators || [];
    if (!indicators.length) {
      section.append(el('p', '今回の確認範囲では、自治体が設定した金額以外の指標を数値・年度付きで整理できていません。指標が存在しないという意味ではありません。', 'small'));
      return section;
    }
    section.append(el('p', '自治体の原資料にある指標です。基準値・目標・実績を分け、利用量と効果、主観評価と実測を区別します。下の企業提案の仮説とは別です。', 'small'));
    indicators.forEach(indicator => {
      const item = el('section', undefined, 'indicator');
      item.append(el('h4', indicator.name), el('p', indicator.definition));
      if (indicator.measurement_status === 'definition_only') {
        item.append(el('p', '測定項目の指定のみ確認：数値目標・実績は未確認。効果が確認された指標ではありません。', 'tag'));
      }
      const values = el('dl', undefined, 'indicator-values');
      [['baseline', '基準値'], ['target', '目標値'], ['actual', '実績値']].forEach(([key, label]) => {
        const group = el('div');
        const value = indicator[key];
        group.append(el('dt', value?.label || label));
        if (value && value.value !== null && value.value !== undefined) {
          const formatted = typeof value.value === 'number' ? value.value.toLocaleString('ja-JP') : String(value.value);
          const dd = el('dd', (value.approximate ? '約' : '') + formatted + ' ' + indicator.unit + (value.bound || ''));
          dd.append(el('span', value.period, 'small'));
          group.append(dd);
        } else group.append(el('dd', '未確認', 'small'));
        values.append(group);
      });
      item.append(values);
      const source = city.documents.find(doc => doc.id === indicator.source_document_id);
      if (source) item.append(el('p', '出典：' + source.title, 'small'), citation(source, indicator.locator));
      if (indicator.limitations?.length) item.append(list(indicator.limitations));
      section.append(item);
    });
    return section;
  }
  function dxReport(city) {
    const section = el('section', undefined, 'dx-classification');
    section.append(el('h3', 'DXの確認段階：対象業務に限定した分類'));
    const result = city.dx_evidence;
    const stage = dxMethod?.stages.find(s => s.code === result?.stage);
    if (!result || !stage) {
      section.append(el('p', '分類は未確認です。未導入という意味ではありません。', 'small'));
      return section;
    }
    section.append(el('p', stage.label, 'tag'), el('p', '対象業務・範囲：' + result.scope), el('p', result.reason));
    section.append(el('p', '収録資料からの分析であり、自治体全体の成熟度・最新状態・公式格付けではありません。', 'small'));
    const evidence = el('details');
    evidence.append(el('summary', '分類の根拠・確認時点を見る'));
    result.evidence.forEach(ref => {
      const doc = city.documents.find(d => d.id === ref.document_id);
      const finding = doc?.findings[ref.finding_index];
      if (!finding) return;
      const item = el('div', undefined, 'dx-evidence');
      item.append(el('strong', ref.role === 'stage' ? '判定根拠：' : '補足・別段階：'), el('span', finding.text));
      item.append(el('p', doc.title + ' ／ 対象：' + doc.source_period + ' ／ 資料確認日：' + doc.checked_at, 'small'), citation(doc, finding.locator));
      evidence.append(item);
    });
    section.append(evidence, el('h4', 'この分類で断定しないこと'), list(result.limitations));
    section.append(el('p', '企業の検討課題（一般的な仮説）：' + stage.business_hint, 'small'));
    return section;
  }
  function dxOverview(research, total) {
    const section = el('section', undefined, 'dx-overview');
    section.append(el('h2', '100自治体のDX確認段階'));
    section.append(el('p', dxMethod.scope_note, 'note'));
    const table = el('table');
    table.append(el('caption', '収録資料で裏付けられた到達点。自治体の優劣ランキングではありません。'));
    const head = el('thead'), row = el('tr');
    ['確認段階', '自治体数', '判定に必要な証拠'].forEach(t => row.append(el('th', t)));
    head.append(row); table.append(head);
    const body = el('tbody');
    dxMethod.stages.forEach(stage => {
      const n = Object.values(research.municipalities).filter(c => c.dx_evidence?.stage === stage.code).length;
      const tr = el('tr'); tr.dataset.stage = stage.code;
      tr.append(el('th', stage.label), el('td', n + '自治体', 'num'), el('td', stage.definition));
      body.append(tr);
    });
    table.append(body);
    const wrapper = el('div', undefined, 'table-scroll'); wrapper.append(table); section.append(wrapper);
    section.append(el('p', '分類対象：' + total + '自治体 ／ 分類日：' + dxMethod.classified_at + ' ／ 収録資料の対象年度・確認日は各根拠を参照。0件は、この調査で確認できた例がないという意味です。', 'small'));
    return section;
  }
  function valueEvidence(city, refs, summary) {
    const detail = el('details', undefined, 'value-evidence');
    detail.append(el('summary', summary));
    refs.forEach(ref => {
      const doc = city.documents.find(d => d.id === ref.document_id);
      const finding = doc?.findings[ref.finding_index];
      if (!finding) return;
      detail.append(el('p', '【' + finding.state + '】' + finding.text));
      detail.append(el('p', doc.title + ' ／ 対象：' + doc.source_period + ' ／ 資料確認日：' + doc.checked_at, 'small'), citation(doc, finding.locator));
    });
    return detail;
  }
  function valueOverview(research) {
    const section = el('section', undefined, 'value-overview'); section.id = 'value-rubric';
    section.append(el('h2', '行政価値を7軸で見る'), el('p', valueRubric.scope_note, 'note'));
    const cards = Object.values(research.municipalities).filter(c => c.public_value);
    const known = cards.flatMap(c => c.public_value.assessments).filter(a => a.current.level !== null).length;
    section.append(el('p', '未来提案 ' + cards.length + '自治体 ／ 現在レベルを記録できた範囲 ' + known + '軸分（' + cards.length * valueRubric.axes.length + '軸分中）。未確認の多さは自治体の低評価を意味しません。', 'small'));
    const details = el('details');
    details.append(el('summary', '7軸・L1〜L4の判定基準を開く'), list(valueRubric.rules));
    valueRubric.axes.forEach(axis => {
      const group = el('section', undefined, 'rubric-axis');
      group.append(el('h3', axis.name), list(axis.levels.map(l => 'L' + l.level + '：' + l.criterion)));
      details.append(group);
    });
    details.append(el('h3', '参考にした枠組み（この評価はTLA独自案）'));
    valueRubric.sources.forEach(source => { const p = el('p'); p.append(link(source.title, source.url)); details.append(p); });
    const download = el('p'); download.append(link('ルーブリック定義JSON', base + 'public-value-rubric.json')); details.append(download);
    section.append(details); return section;
  }
  function publicValueReport(city) {
    const section = el('section', undefined, 'public-value');
    section.append(el('h3', '行政価値：現在の確認と未来の提案'));
    const value = city.public_value;
    if (!value || !valueRubric) {
      section.append(el('p', '行政価値の個別分析は未収録です。未達成という意味ではありません。', 'small')); return section;
    }
    section.append(el('p', 'TLA独自の分析・構想。現在レベルは対象業務・資料の期間内だけの判定です。未来目標は自治体の公式目標ではなく、実現・採択を保証しません。', 'note'));
    section.append(link('7軸の判定基準を見る', '#value-rubric'));
    const wrapper = el('div', undefined, 'table-scroll');
    const table = el('table', undefined, 'value-matrix');
    table.append(el('caption', '未確認は0点ではありません。総合点・順位・レベル差は算出しません。'));
    const head = el('thead'), tr = el('tr');
    ['価値の軸', '現在：証拠がある範囲', '未来：TLAの提案目標'].forEach(t => tr.append(el('th', t))); head.append(tr); table.append(head);
    const body = el('tbody');
    valueRubric.axes.forEach(axis => {
      const current = value.assessments.find(a => a.axis_id === axis.id)?.current;
      const target = value.future.targets.find(t => t.axis_id === axis.id);
      const row = el('tr'); row.dataset.valueAxis = axis.id;
      const now = el('td', undefined, 'value-current');
      if (current?.level !== null && current?.level !== undefined) {
        now.append(el('strong', 'L' + current.level), el('p', valueRubric.evidence_types[current.evidence_type], 'small'), el('p', current.scope, 'small'));
        const reasons = valueEvidence(city, current.evidence, '現在レベルの理由・出典');
        reasons.prepend(el('p', current.basis));
        // Keep the summary first so native details remains keyboard-accessible.
        reasons.prepend(reasons.querySelector('summary'));
        now.append(reasons);
      } else now.append(el('span', '未確認'), el('p', current?.basis || 'この軸の判定根拠は未収録です。', 'small'));
      const future = el('td', undefined, 'value-target');
      if (target) {
        future.append(el('strong', '提案 L' + target.level), el('p', axis.levels.find(l => l.level === target.level)?.criterion || '', 'small'));
        const why = el('details'); why.append(el('summary', '目標の理由（仮説）'), el('p', target.rationale)); future.append(why);
      } else future.append(el('span', '未設定'), el('p', '今回の重点提案の対象外。価値がないという意味ではありません。', 'small'));
      row.append(el('th', axis.name), now, future); body.append(row);
    });
    table.append(body); wrapper.append(table); section.append(wrapper);
    const f = value.future, card = el('section', undefined, 'future-value-card');
    card.append(el('p', 'TLA未来提案・未実証の仮説', 'tag'), el('h4', f.title), el('p', f.hypothesis));
    card.append(valueEvidence(city, f.evidence, '構想の出発点となった資料（実現の証明ではありません）'));
    card.append(el('h4', '実現に必要な条件（充足状況は未確認）'), list(f.conditions));
    card.append(el('h4', '企業・NPO等が担える役割の仮説'), list(f.partners));
    card.append(el('p', '既存調査の参入情報（この未来提案そのものの募集情報ではありません）：' + city.opportunity.status, 'small'), el('p', '参入前の確認：' + city.opportunity.next_check, 'small'));
    const measurement = el('details', undefined, 'future-measurement');
    measurement.append(el('summary', '検証指標・小さな実証・停止条件を見る'));
    f.metrics.forEach(m => {
      measurement.append(el('h4', m.name), el('p', '対象・定義：' + m.definition), el('p', '測定案：' + m.method, 'small'));
    });
    measurement.append(el('h4', '小さく検証する範囲'), el('p', f.pilot), el('h4', '停止・見直し条件'), el('p', f.stop_rule));
    card.append(measurement);
    const gates = el('details', undefined, 'value-safeguards');
    gates.append(el('summary', '必須の安全・権利保護条件（充足未確認）'), list(valueRubric.gates));
    card.append(gates, el('p', '指標は測定方法の提案です。未実測の数値・削減額は補っていません。自治体公表の目標・実績は、別欄の「金額以外で見る成果・評価指標」を参照してください。', 'small'));
    section.append(card); return section;
  }
  function cityReport(code, city) {
    const article = el('article', undefined, 'city');
    article.id = 'city-' + code;
    article.append(el('h2', city.name + 'の資料レビュー'));
    if (document.body.dataset.mode === 'cohort' && dxMethod) article.append(link('段階別一覧・絞り込みに戻る', '#dx-filter'));
    article.append(el('p', '一部確認：本文レビュー ' + city.documents.length + '資料 ／ DX総合評価は保留', 'tag'));
    article.append(el('p', city.summary));
    article.append(el('p', city.dx_stage.basis, 'small'));
    article.append(link('この自治体のレポートURL', base + 'major100-research.html#city-' + code));
    const statistics = el('p');
    statistics.append(link('人口・産業・財政などの基礎統計と比較を見る', '/co-creation?municipality=' + code));
    article.append(statistics);
    article.append(dxReport(city));
    if (window.MunicipalCompanies) article.append(window.MunicipalCompanies.section(code, companyData));
    article.append(publicValueReport(city));
    article.append(nonFinancialIndicators(city));
    city.documents.forEach(doc => article.append(sourceReport(doc)));
    const opportunity = el('section', undefined, 'hypothesis');
    opportunity.append(el('h3', '民間企業が関われる可能性：仮説'));
    opportunity.append(el('p', city.opportunity.status, 'tag'), el('p', city.opportunity.hypothesis));
    opportunity.append(el('p', '根拠：' + city.opportunity.basis), el('p', '参入判断の前に：' + city.opportunity.next_check));
    article.append(opportunity);
    if (city.source_leads.length) {
      const leads = el('details');
      leads.append(el('summary', '資料の所在のみ確認／本文レビューに数えない資料'));
      const ul = el('ul');
      city.source_leads.forEach(source => {
        const li = el('li');
        li.append(link(source.title, source.source_url), el('p', source.note, 'small'));
        ul.append(li);
      });
      leads.append(ul); article.append(leads);
    }
    if (city.corrections.length) {
      const corrections = el('details');
      corrections.append(el('summary', '以前の掲載からの訂正'), list(city.corrections));
      article.append(corrections);
    }
    article.append(el('h3', '未確認・次に読む資料'), list(city.next_tasks));
    return article;
  }
  function stats(research, total) {
    const cities = Object.values(research.municipalities);
    const docs = cities.reduce((count, city) => count + city.documents.length, 0);
    const withIndicators = cities.filter(city => city.non_financial_indicators?.length);
    const indicatorCount = withIndicators.reduce((count, city) => count + city.non_financial_indicators.length, 0);
    const definitionOnly = withIndicators.reduce((count, city) => count + city.non_financial_indicators.filter(i => i.measurement_status === 'definition_only').length, 0);
    const container = document.getElementById('review-status');
    container.append(el('p', total + '自治体中 ' + cities.length + '自治体を一部確認・' + docs + '資料を本文レビュー。調査完了ではありません。', 'tag'));
    if (indicatorCount) container.append(el('p', '金額以外の評価指標：' + withIndicators.length + '自治体・' + indicatorCount + '指標。数値の年度・定義が異なるため、単純な自治体ランキングには使いません。', 'tag'));
    if (definitionOnly) container.append(el('p', 'うち ' + definitionOnly + '項目は測定項目の指定のみを確認。数値付き指標とは区別しています。', 'small'));
    container.append(el('p', research.scope_note), el('p', research.corrections_note, 'note'));
    container.append(el('p', '更新：' + research.updated_at + ' ／ ' + research.method, 'small'));
  }
  function focusHash() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!/^city-\d{5}$/.test(id) && !['value-rubric', 'dx-filter'].includes(id)) return;
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView?.();
      const heading = section.querySelector('h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }
  async function start() {
    const mode = document.body.dataset.mode;
    const [research, cohort] = await Promise.all([json('major100-research.json'), json('major-municipalities-100.json')]);
    companyData = await window.MunicipalCompanies?.load();
    dxMethod = research.dx_classification;
    valueRubric = research.public_value_rubric;
    stats(research, cohort.municipalities.length);
    if (dxMethod) document.getElementById('review-status').append(dxOverview(research, cohort.municipalities.length));
    if (valueRubric) document.getElementById('review-status').append(valueOverview(research));
    const root = document.getElementById('app');
    root.replaceChildren();
    if (mode === 'reports') {
      const nav = el('nav');
      nav.setAttribute('aria-label', '自治体別レポート');
      cohort.municipalities.forEach(m => {
        const city = research.municipalities[m.code];
        if (!city) return;
        nav.append(link(city.name, '#city-' + m.code), document.createTextNode('　'));
        root.append(cityReport(m.code, city));
      });
      root.prepend(nav);
      focusHash();
      window.addEventListener('hashchange', focusHash);
      return;
    }
    const detail = document.getElementById('detail');
    const table = el('table');
    const caption = el('caption', '自治体名を選ぶと資料別の要約を表示します');
    table.append(caption);
    const head = el('thead'), hr = el('tr');
    ['人口順', '自治体', 'コード', '人口', '調査状況', 'DX確認段階・対象業務', '金額以外の指標'].forEach(text => hr.append(el('th', text)));
    head.append(hr); table.append(head);
    const tbody = el('tbody');
    cohort.municipalities.forEach(m => {
      const city = research.municipalities[m.code];
      const row = el('tr'), name = el('td');
      row.dataset.dxStage = city?.dx_evidence?.stage || 'U';
      row.dataset.valueAxes = (city?.public_value?.future.targets || []).map(t => t.axis_id).join(' ');
      const button = el('button', m.name);
      button.type = 'button';
      button.setAttribute('aria-controls', 'detail');
      button.addEventListener('click', () => {
        if (city) detail.replaceChildren(cityReport(m.code, city));
        else {
          const panel = el('article', undefined, 'city');
          panel.append(el('h2', m.name), el('p', '対象に登録済みですが、詳細資料の本文調査は未着手です。'));
          detail.replaceChildren(panel);
        }
        const heading = detail.querySelector('h2');
        heading.tabIndex = -1; heading.focus(); heading.scrollIntoView?.({ behavior: 'smooth' });
      });
      name.append(button);
      if (city?.public_value) name.append(el('p', '未来提案：' + city.public_value.future.title, 'small future-title'));
      row.append(el('td', String(m.rank)), name, el('td', m.code), el('td', m.population.toLocaleString('ja-JP') + '人', 'num'), el('td', city ? '一部確認・' + city.documents.length + '資料' : '未着手'));
      const stage = dxMethod?.stages.find(s => s.code === city?.dx_evidence?.stage);
      const dx = el('td', undefined, 'dx-cell');
      dx.append(el('strong', stage?.label || '判定保留'), el('p', city?.dx_evidence?.scope || '分類未確認', 'small'));
      row.append(dx);
      const indicators = city?.non_financial_indicators || [];
      row.append(el('td', indicators.length ? indicators.map(i => i.name).join(' ／ ') : '未確認', 'small'));
      tbody.append(row);
    });
    table.append(tbody);
    if (dxMethod) {
      const filters = el('div', undefined, 'dx-filter');
      const label = el('label', 'DX確認段階で絞り込む'); label.htmlFor = 'dx-filter';
      const select = el('select'); select.id = 'dx-filter';
      const all = el('option', 'すべての自治体'); all.value = ''; select.append(all);
      dxMethod.stages.forEach(stage => { const option = el('option', stage.label); option.value = stage.code; select.append(option); });
      const count = el('p', cohort.municipalities.length + '自治体を表示', 'small'); count.id = 'dx-filter-count'; count.setAttribute('aria-live', 'polite');
      const valueSelect = el('select'); valueSelect.id = 'value-filter';
      const valueAll = el('option', 'すべての行政価値'); valueAll.value = ''; valueSelect.append(valueAll);
      (valueRubric?.axes || []).forEach(axis => { const option = el('option', axis.name); option.value = axis.id; valueSelect.append(option); });
      const applyFilters = () => {
        let visible = 0;
        [...tbody.children].forEach(row => {
          row.hidden = Boolean((select.value && row.dataset.dxStage !== select.value) || (valueSelect.value && !row.dataset.valueAxes.split(' ').includes(valueSelect.value)));
          if (!row.hidden) visible++;
        });
        count.textContent = visible + '自治体を表示';
        detail.replaceChildren();
      };
      select.addEventListener('change', applyFilters);
      valueSelect.addEventListener('change', applyFilters);
      filters.append(label, select);
      if (valueRubric) {
        const valueLabel = el('label', '未来提案の重点価値で絞り込む'); valueLabel.htmlFor = 'value-filter';
        filters.append(valueLabel, valueSelect, el('p', '現在の到達度ではなく、TLAが提案した重点軸で絞り込みます。DX確認段階と組み合わせて検索できます。', 'small'));
      }
      filters.append(count); root.append(filters);
    }
    const wrapper = el('div', undefined, 'table-scroll');
    wrapper.append(table); root.append(wrapper);
    focusHash();
  }
  start().catch(() => {
    document.getElementById('app').replaceChildren(el('p', '調査データを読み込めませんでした。再読み込みしてください。', 'note'));
  });
})();
