import json
from pathlib import Path

stats_path = Path('public/co-creation-assets/municipality-stats.json')
out_path = Path('public/co-creation-assets/major-municipalities-100.json')
data = json.loads(stats_path.read_text(encoding='utf-8'))

def metric(item, code):
    for row in item.get('stats', []):
        if row.get('code') == code and row.get('state') == 'value':
            try:
                return float(row['value'])
            except (TypeError, ValueError):
                return None
    return None

rows = []
for code, item in data['municipalities'].items():
    population = metric(item, 'A2301') or metric(item, 'A1101')
    if population is not None:
        rows.append({'code': code, 'name': item['name'], 'population': int(population)})
rows.sort(key=lambda row: (-row['population'], row['code']))
selected = rows[:100]
for index, row in enumerate(selected, 1):
    row['rank'] = index
    row['research_status'] = 'not_started'
    row['tasks'] = [
        {'domain': domain, 'status': 'not_started'}
        for domain in ['budget', 'council', 'ordinance', 'dx', 'procurement', 'infrastructure']
    ]

out_path.write_text(json.dumps({
    'title': '主要100自治体・自治体インテリジェンス調査対象',
    'selection_rule': '統計でみる市区町村のすがた2026の住民基本台帳人口（総数）2024を優先し、欠測時は国勢調査人口2020を使用して人口上位100自治体を選定',
    'source': data['source'],
    'source_date': data['area_reference_date'],
    'research_domains': ['budget', 'council', 'ordinance', 'dx', 'procurement', 'infrastructure'],
    'status_definition': {
        'not_started': '未着手',
        'partial': '一部資料を確認',
        'verified': '主要資料を出典付きで確認',
    },
    'municipalities': selected,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('selected', len(selected), 'output', out_path)
