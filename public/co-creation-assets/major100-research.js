/* Shared, text-only renderer for both the cohort and source-reviewed reports. */
(() => {
  'use strict';
  const base = '/co-creation-assets/';
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
    const page = locator.match(/PDF(\d+)/)?.[1];
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
      detail.append(el('h4', '資料に記載された予算（原表の単位）'));
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
  function cityReport(code, city) {
    const article = el('article', undefined, 'city');
    article.id = 'city-' + code;
    article.append(el('h2', city.name + 'の資料レビュー'));
    article.append(el('p', '一部確認：本文レビュー ' + city.documents.length + '資料 ／ DX総合評価は保留', 'tag'));
    article.append(el('p', city.summary));
    article.append(el('p', city.dx_stage.basis, 'small'));
    article.append(link('この自治体のレポートURL', base + 'major100-research.html#city-' + code));
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
    const corrections = el('details');
    corrections.append(el('summary', '以前の掲載からの訂正'), list(city.corrections));
    article.append(corrections, el('h3', '未確認・次に読む資料'), list(city.next_tasks));
    return article;
  }
  function stats(research, total) {
    const cities = Object.values(research.municipalities);
    const docs = cities.reduce((count, city) => count + city.documents.length, 0);
    const container = document.getElementById('review-status');
    container.append(el('p', total + '自治体中 ' + cities.length + '市を一部確認・' + docs + '資料を本文レビュー。調査完了ではありません。', 'tag'));
    container.append(el('p', research.scope_note), el('p', research.corrections_note, 'note'));
    container.append(el('p', '更新：' + research.updated_at + ' ／ ' + research.method, 'small'));
  }
  function focusHash() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!/^city-\d{5}$/.test(id)) return;
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView?.();
      const heading = section.querySelector('h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  async function start() {
    const mode = document.body.dataset.mode;
    const [research, cohort] = await Promise.all([json('major100-research.json'), json('major-municipalities-100.json')]);
    stats(research, cohort.municipalities.length);
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
    ['順位', '自治体', 'コード', '人口', '調査状況'].forEach(text => hr.append(el('th', text)));
    head.append(hr); table.append(head);
    const tbody = el('tbody');
    cohort.municipalities.forEach(m => {
      const city = research.municipalities[m.code];
      const row = el('tr'), name = el('td');
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
      row.append(el('td', String(m.rank)), name, el('td', m.code), el('td', m.population.toLocaleString('ja-JP') + '人', 'num'), el('td', city ? '一部確認・' + city.documents.length + '資料' : '未着手'));
      tbody.append(row);
    });
    table.append(tbody);
    const wrapper = el('div', undefined, 'table-scroll');
    wrapper.append(table); root.append(wrapper);
  }
  start().catch(() => {
    document.getElementById('app').replaceChildren(el('p', '調査データを読み込めませんでした。再読み込みしてください。', 'note'));
  });
})();
