import type { CrawledItem, Source } from "@/lib/types";

export const countryFocus = [
  { code: "US", name: "米国", thesis: "AI・金融・安全保障を同時に使い、世界標準を再設計する中心国" },
  { code: "CN", name: "中国", thesis: "国家主導の産業政策と技術内製化で、別系統の秩序を作る国" },
  { code: "EU", name: "EU", thesis: "規制・人権・市場統合を通じて、技術と社会のルールを作る圏域" },
  { code: "JP", name: "日本", thesis: "人口減少と技術実装を同時に抱え、教育・地域・産業再編が交差する国" },
  { code: "IN", name: "インド", thesis: "人口、デジタル公共基盤、成長市場を背景に影響力を拡大する国" },
  { code: "UK", name: "英国", thesis: "金融・思想・安全保障・AI研究を横断して国際ルール形成に関わる国" },
  { code: "DE", name: "ドイツ", thesis: "製造業、エネルギー転換、欧州規制の間で再産業化を進める国" },
  { code: "FR", name: "フランス", thesis: "国家戦略、欧州統合、文化政策、AI主権を結びつける国" },
  { code: "KR", name: "韓国", thesis: "半導体・教育・文化産業を軸に、国際競争力を再設計する国" },
  { code: "TW", name: "台湾", thesis: "半導体と民主主義、安全保障が世界構造の焦点になる地域" },
  { code: "SG", name: "シンガポール", thesis: "小国型の規制設計、金融、教育、AI実装を高速に接続する国" },
  { code: "ID", name: "インドネシア", thesis: "人口、資源、イスラム圏、ASEANの重心として制度と市場が動く国" },
  { code: "VN", name: "ベトナム", thesis: "製造業移転、若年人口、デジタル化で供給網の再編を受ける国" },
  { code: "TH", name: "タイ", thesis: "観光、製造、政治安定性、高齢化が交差するASEAN中核国" },
  { code: "MY", name: "マレーシア", thesis: "半導体、イスラム金融、多民族社会、教育改革が重なる国" },
  { code: "PH", name: "フィリピン", thesis: "若年人口、海外労働、英語圏、地政学が重なる成長国" },
  { code: "NG", name: "ナイジェリア", thesis: "人口爆発、金融包摂、資源、文化産業がアフリカの未来を映す国" },
  { code: "ZA", name: "南アフリカ", thesis: "資源、金融、格差、民主主義、エネルギー転換が交差する国" },
  { code: "KE", name: "ケニア", thesis: "モバイル金融、スタートアップ、東アフリカ外交の結節点になる国" },
  { code: "EG", name: "エジプト", thesis: "人口、教育、地政学、スエズを通じて中東アフリカをつなぐ国" },
  { code: "BR", name: "ブラジル", thesis: "資源、民主主義、南米経済、気候政策の結節点になる国" },
  { code: "MX", name: "メキシコ", thesis: "米国近接、製造業移転、移民、治安、民主主義が交差する国" },
  { code: "AR", name: "アルゼンチン", thesis: "金融不安、資源、改革政治、南米思想潮流が見える国" },
  { code: "CL", name: "チリ", thesis: "銅・リチウム、制度改革、教育、気候政策が重なる国" },
  { code: "CO", name: "コロンビア", thesis: "和平、資源、都市化、デジタル化が中南米の変化を映す国" }
];

const categoryLabels = [
  { key: "politics", label: "政治", category: "政治・国際機関" },
  { key: "economy", label: "経済", category: "経済・金融" },
  { key: "thought", label: "思想", category: "思想・社会" },
  { key: "technology", label: "技術", category: "テクノロジー" }
] as const;

export function buildCountryLayer(sources: Source[], items: CrawledItem[]) {
  return countryFocus.map((country) => {
    const quadrants = categoryLabels.map((quadrant) => {
      const sourceCount = sources.filter((source) => source.country === country.code && source.category === quadrant.category).length;
      const signalCount = items.filter((item) => {
        const itemSource = sources.find((source) => source.id === item.source_id);
        return item.category === quadrant.category && itemSource?.country === country.code;
      }).length;

      return {
        ...quadrant,
        sourceCount,
        signalCount,
        strength: Math.min(99, sourceCount * 12 + signalCount * 8)
      };
    });

    const totalSources = quadrants.reduce((sum, quadrant) => sum + quadrant.sourceCount, 0);
    const totalSignals = quadrants.reduce((sum, quadrant) => sum + quadrant.signalCount, 0);

    return {
      ...country,
      quadrants,
      totalSources,
      totalSignals,
      coverageScore: Math.min(100, totalSources * 8 + totalSignals * 4)
    };
  }).sort((a, b) => b.coverageScore - a.coverageScore);
}
