import csv
import json
from pathlib import Path

src = Path('work/ssds-csv')
out = Path('public/co-creation-assets/municipality-stats.json')
merged = {}
catalog = []
registry_text = Path('lib/co-creation/registry.mjs').read_text(encoding='utf-8')
registry = json.loads(registry_text[registry_text.index('['):registry_text.rindex(']') + 1])
allowed = {row['code'] for row in registry}

for path in sorted(src.glob('ssds2026-*.csv')):
    rows = list(csv.reader(path.open(encoding='utf-8-sig', newline='')))
    header = next((i for i, row in enumerate(rows) if '市区町村' in row), None)
    if header is None:
        raise RuntimeError(f'header not found: {path}')
    names = rows[header]
    codes = rows[header + 2]
    units = rows[header + 3]
    years = rows[header + 4]
    category = rows[header - 2][10] if len(rows[header - 2]) > 10 else path.stem
    catalog.append({'file': path.name, 'category': category})
    for row in rows[header + 5:]:
        if len(row) <= 10:
            continue
        code = row[1].strip()
        name = row[8].strip()
        if not (len(code) == 5 and code.isdigit() and name and code in allowed):
            continue
        item = merged.setdefault(code, {'name': name, 'stats': []})
        for col in range(10, min(len(row), len(names), len(codes), len(units), len(years))):
            label = names[col].replace('\n', ' ').strip()
            metric = codes[col].strip()
            value = row[col].strip()
            if not label or not metric:
                continue
            state = 'suppressed' if value in {'秘匿', '***', '…', '...'} else 'missing' if value in {'', '-', '－'} else 'value'
            item['stats'].append({'code': metric, 'label': label, 'year': years[col].strip(), 'unit': units[col].strip(), 'value': value if state == 'value' else None, 'state': state})

budget_stats = [
    ('BUD-GEN', '予算・一般会計', '2026', '千円', '90467610'),
    ('BUD-GEN-PC', '予算・一般会計・住民1人あたり', '2026', '円/人', '712635'),
    ('BUD-GEN-HH', '予算・一般会計・1世帯あたり', '2026', '円/世帯', '1878363'),
    ('BUD-WATER', '予算・水道事業会計', '2026', '千円', '5501925'),
    ('BUD-WATER-HH', '水道事業会計・1世帯あたり', '2026', '円/世帯', '114225'),
    ('BUD-SEWER', '予算・下水道事業会計', '2026', '千円', '4300128'),
    ('BUD-SEWER-HH', '下水道事業会計・1世帯あたり', '2026', '円/世帯', '89293'),
    ('ROAD-MAINT', '道路関連・維持管理等（掲載主要事業合計）', '2026', '千円', '439933'),
    ('ROAD-MAINT-PC', '道路関連・住民1人あたり（掲載主要事業合計）', '2026', '円/人', '3465'),
    ('ROAD-MAINT-HH', '道路関連・1世帯あたり（掲載主要事業合計）', '2026', '円/世帯', '9134'),
    ('ROAD-COMP', '道路・公園包括管理事業', '2026', '千円', '91183'),
    ('ROAD-OLD', '道路施設老朽化対策事業', '2026', '千円', '124600'),
    ('ROAD-YONASHIRO', '与那城18号線道路整備事業', '2026', '千円', '102510'),
    ('ROAD-ISHIKAWA', '石川IC線道路整備事業', '2026', '千円', '121640'),
    ('BUD-REV-TAX', '歳入・市税', '2026', '千円', '14402529'),
    ('BUD-REV-LOCAL', '歳入・地方交付税', '2026', '千円', '16510057'),
    ('BUD-REV-NATIONAL', '歳入・国庫支出金', '2026', '千円', '26386062'),
    ('BUD-REV-PREF', '歳入・県支出金', '2026', '千円', '10720628'),
    ('BUD-REV-BOND', '歳入・市債', '2026', '千円', '9764800'),
    ('BUD-PUR-GENERAL', '歳出・総務費', '2026', '千円', '6937804'),
    ('BUD-PUR-WELFARE', '歳出・民生費', '2026', '千円', '41939948'),
    ('BUD-WEL-SOCIAL', '民生費・社会福祉費', '2026', '千円', '16364029'),
    ('BUD-WEL-CHILD', '民生費・児童福祉費', '2026', '千円', '19077283'),
    ('BUD-WEL-CHILD-ORDERS', '児童福祉費・児童措置費', '2026', '千円', '15430157'),
    ('BUD-WEL-CHILD-FACILITIES', '児童福祉費・児童福祉施設費', '2026', '千円', '1560480'),
    ('BUD-WEL-CHILD-CONSULT', '児童福祉費・家庭児童相談室費', '2026', '千円', '74245'),
    ('BUD-WEL-CHILD-MATERNITY', '児童福祉費・助産施設措置費', '2026', '千円', '601'),
    ('BUD-WEL-CHILD-MOTHER', '児童福祉費・母子福祉費', '2026', '千円', '145873'),
    ('BUD-WEL-LIVELIHOOD', '民生費・生活保護費', '2026', '千円', '6498636'),
    ('BUD-SUPP2', '令和8年度一般会計・補正予算第2号', '2026', '千円', '3735571'),
    ('BUD-SUPP2-CHILD', '補正第2号・児童福祉費補正額', '2026', '千円', '223075'),
    ('BUD-PUR-HEALTH', '歳出・衛生費', '2026', '千円', '6138742'),
    ('BUD-PUR-AGRI', '歳出・農林水産業費', '2026', '千円', '1473935'),
    ('BUD-PUR-COMMERCE', '歳出・商工費', '2026', '千円', '1580173'),
    ('BUD-PUR-CIVIL', '歳出・土木費', '2026', '千円', '6798239'),
    ('BUD-PUR-EDU', '歳出・教育費', '2026', '千円', '17871516'),
    ('BUD-PUR-DEBT', '歳出・公債費', '2026', '千円', '5389849'),
    ('BUD-NAT-PERSONNEL', '性質別・人件費', '2026', '千円', '10509117'),
    ('BUD-NAT-AID', '性質別・扶助費', '2026', '千円', '30695361'),
    ('BUD-NAT-MATERIAL', '性質別・物件費', '2026', '千円', '18147915'),
    ('BUD-NAT-CONSTRUCTION', '性質別・普通建設事業費', '2026', '千円', '18147924'),
    ('BUD-NAT-SUBSIDY', '性質別・補助費等', '2026', '千円', '11824001'),
]
merged['47213']['stats'] = [{'code': c, 'label': label, 'year': year, 'unit': unit, 'value': value, 'state': 'value'} for c, label, year, unit, value in budget_stats] + merged['47213']['stats']

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({'source': '総務省統計局 統計でみる市区町村のすがた2026', 'publication_date': '2026-06-19', 'area_reference_date': '2025-03-31', 'budget_sources': [{'municipality_code': '47213', 'title': '令和8年度うるま市当初予算説明資料', 'url': 'https://www.city.uruma.lg.jp/documents/9893/r8tousyosetuemi.pdf'}], 'catalog': catalog, 'municipalities': merged}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('municipalities', len(merged), 'bytes', out.stat().st_size)
