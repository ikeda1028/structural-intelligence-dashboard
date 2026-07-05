import OpenAI from "openai";
import { z } from "zod";
import { countryFocus } from "@/lib/country-layer";
import { baseMovements, quadrantTable } from "@/lib/era-map";
import { getOpenAiApiKey, getOpenAiKeyStatus, getOpenAiModel } from "@/lib/openai-config";
import { saveIntelligenceResearchReport } from "@/lib/repository";
import type { CrawledItem, Source } from "@/lib/types";

const fieldMap = [
  { label: "政治", category: "政治・国際機関", intent: "規制、政策、外交、安全保障、行政との接点" },
  { label: "経済", category: "経済・金融", intent: "資金調達、需要、価格、投資、産業構造との接点" },
  { label: "思想", category: "思想・社会", intent: "価値観、世論、人口、信頼、社会受容との接点" },
  { label: "テクノロジー", category: "テクノロジー", intent: "AI、データ、半導体、研究開発、実装速度との接点" }
] as const;

const queryHints = [
  { words: ["ai", "人工知能", "半導体", "software", "platform", "tech", "data", "データ"], category: "テクノロジー", boost: 24 },
  { words: ["bank", "fund", "capital", "finance", "投資", "金融", "市場", "経済", "資本"], category: "経済", boost: 22 },
  { words: ["government", "ministry", "un", "policy", "政治", "政府", "省", "自治体", "行政", "規制"], category: "政治", boost: 22 },
  { words: ["school", "education", "media", "ngo", "community", "教育", "学校", "思想", "社会", "文化", "若者"], category: "思想", boost: 20 }
];

const sectorProfiles = [
  {
    name: "自動車・モビリティ",
    words: ["honda", "ホンダ", "本田", "自動車", "automotive", "motor", "ev", "車", "mobility", "モビリティ"],
    operatingExposure: "EV・電池・半導体・ソフトウェア化・安全規制が同時に進むため、競争軸は車両性能だけでなく、供給網、データ、エネルギー、都市政策との接続へ広がります。",
    strategicQuestion: "内燃機関時代の強みを残しながら、電動化・知能化・地域別規制に合わせてどこまで事業モデルを組み替えるか。",
    watchPoints: ["EV補助金と排出規制", "電池・半導体サプライチェーン", "中国・ASEAN・北米市場の需要変化", "ソフトウェア定義車両とAI安全", "若年層の移動観・所有観"]
  },
  {
    name: "金融・投資",
    words: ["bank", "銀行", "証券", "投資", "fund", "capital", "finance", "金融"],
    operatingExposure: "金利、信用収縮、規制、デジタル通貨、AI与信が重なり、金融機関の優位性は資本量からリスク読解とデータ運用へ移ります。",
    strategicQuestion: "どの市場・顧客・技術に資本を配分し、信用をどう再設計するか。",
    watchPoints: ["中央銀行政策", "信用不安", "AI与信・不正検知", "規制強化", "産業投資テーマ"]
  },
  {
    name: "教育・人材",
    words: ["school", "大学", "教育", "人材", "研修", "learning", "academy", "学校"],
    operatingExposure: "AI、探究、リスキリング、地域連携が同時に進み、教育の価値は授業提供から能力証明と実装経験の設計へ移ります。",
    strategicQuestion: "学びをどのように成果物、認証、キャリア、地域課題解決へ接続するか。",
    watchPoints: ["AIリテラシー", "探究学習", "リスキリング投資", "学習履歴の証明", "地域連携"]
  }
];

type ReportQuadrant = {
  label: string;
  structure: string;
  watch: string;
  implication: string;
  relevance: number;
};

const flexibleString = z.union([z.string(), z.record(z.unknown())]).transform((value) => {
  if (typeof value === "string") return value;
  return Object.values(value)
    .filter((item) => typeof item === "string" || typeof item === "number")
    .join(" / ");
});

const flexibleText = z.union([z.string(), z.array(flexibleString), z.record(z.unknown())]).transform((value) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return Object.values(value)
    .flatMap((item) => Array.isArray(item) ? item : [item])
    .filter((item) => typeof item === "string" || typeof item === "number")
    .join(" ");
});

const researchReportSchema = z.object({
  title: flexibleText,
  executiveSummary: flexibleText,
  structuralPosition: flexibleText,
  impactAssessment: z.array(flexibleString).min(3),
  opportunity: flexibleText,
  risk: flexibleText,
  watchPoints: z.array(flexibleString).min(4),
  recommendation: z.array(flexibleString).min(3)
});

type ResearchReport = z.infer<typeof researchReportSchema>;
type IntelligenceResearchResult = {
  target: string;
  headline: string;
  report: ResearchReport;
  analysisMode: { label: string; detail: string };
  quadrants: Array<ReportQuadrant & {
    category: string;
    intent: string;
    matchedSourceCount: number;
    matchedSignalCount: number;
    sourceCount: number;
    signalCount: number;
  }>;
  countries: typeof countryFocus;
  relatedSources: Array<{ source: Source; score: number }>;
  relatedItems: Array<{ item: CrawledItem; score: number }>;
  impactPaths: string[];
  recommendedNextSearches: string[];
};

export async function buildIntelligenceResearch(query: string, sources: Source[], items: CrawledItem[]) {
  const target = query.trim();
  if (!target) return null;

  const normalized = target.toLowerCase();
  const relatedSources = sources
    .map((source) => ({ source, score: scoreTextMatch(normalized, source.name, source.country, source.region, source.category, source.source_type) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const relatedItems = items
    .map((item) => ({ item, score: scoreTextMatch(normalized, item.title, item.summary_ja, item.extracted_text, item.category, item.region, ...(item.tags ?? [])) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const countries = detectCountries(normalized, relatedSources.map((entry) => entry.source));
  const quadrants = fieldMap.map((field) => {
    const matchedSourceCount = relatedSources.filter((entry) => entry.source.category === field.category).length;
    const matchedSignalCount = relatedItems.filter((entry) => entry.item.category === field.category).length;
    const sourceCount = sources.filter((source) => source.category === field.category && source.is_active).length;
    const signalCount = items.filter((item) => item.category === field.category).length;
    const hintBoost = queryHints
      .filter((hint) => hint.category === field.label && hint.words.some((word) => normalized.includes(word)))
      .reduce((sum, hint) => sum + hint.boost, 0);
    const relevance = Math.min(99, 22 + matchedSourceCount * 16 + matchedSignalCount * 18 + Math.min(18, sourceCount) + hintBoost);
    const row = quadrantTable.find((entry) => entry.quadrant === field.label);
    const movement = baseMovements.find((entry) => entry.domain === field.category);

    return {
      ...field,
      relevance,
      matchedSourceCount,
      matchedSignalCount,
      sourceCount,
      signalCount,
      structure: row?.currentShift ?? movement?.structuralShift ?? field.intent,
      watch: row?.watchingSignals ?? field.intent,
      implication: row?.tlaImplication ?? movement?.tlaAction ?? "対象の意思決定に接続する変化を継続監視する"
    };
  }).sort((a, b) => b.relevance - a.relevance);

  const primary = quadrants[0];
  const secondary = quadrants[1];
  const strongestCountries = countries.length > 0 ? countries : inferCountriesFromSources(sources).slice(0, 4);
  const sector = detectSector(normalized);
  const impactPaths = [
    `${primary.label}の変化が、${target}の意思決定条件を変える`,
    `${secondary.label}の圧力が、資源配分・採用・提携先の優先順位を動かす`,
    `${strongestCountries.map((country) => country.name).join("・") || "主要国"}の動きが、外部環境の制約条件になる`
  ];
  const localReport = buildReport(target, primary, secondary, quadrants, strongestCountries, sector);
  const chatGptResult = await buildChatGptReport({
    target,
    localReport,
    quadrants,
    countries: strongestCountries,
    sectorName: sector?.name,
    sectorWatchPoints: sector?.watchPoints ?? [],
    relatedSources: relatedSources.map((entry) => ({
      name: entry.source.name,
      category: entry.source.category,
      country: entry.source.country,
      region: entry.source.region,
      url: entry.source.url
    })),
    relatedSignals: relatedItems.map((entry) => ({
      title: entry.item.title,
      category: entry.item.category,
      region: entry.item.region,
      summary: entry.item.summary_ja || entry.item.extracted_text?.slice(0, 240)
    }))
  }).then((result) => ({ result, error: "" })).catch((error: unknown) => ({
    result: null,
    error: error instanceof Error ? error.message : "unknown error"
  }));
  const report = chatGptResult.result?.report ?? localReport;

  const research: IntelligenceResearchResult = {
    target,
    headline: `${target}は「${primary.structure}」という構造の中で、${primary.label}と${secondary.label}の影響を強く受けます。`,
    report,
    analysisMode: chatGptResult.result
      ? { label: "ChatGPT生成", detail: chatGptResult.result.model }
      : { label: "ローカル推定", detail: getOpenAiKeyStatus() ? `ChatGPT生成に失敗: ${sanitizeError(chatGptResult.error)}` : "OPENAI_SI_API_KEY未設定" },
    quadrants,
    countries: strongestCountries,
    relatedSources,
    relatedItems,
    impactPaths,
    recommendedNextSearches: [
      `${target} 規制 政策 リスク`,
      `${target} 投資 市場 競合`,
      `${target} AI データ 人材`,
      `${target} 世論 価値観 信頼`
    ]
  };
  await persistIntelligenceResearch(research);
  return research;
}

async function buildChatGptReport(input: {
  target: string;
  localReport: ResearchReport;
  quadrants: ReportQuadrant[];
  countries: typeof countryFocus;
  sectorName?: string;
  sectorWatchPoints: string[];
  relatedSources: Array<{ name: string; category: string; country: string; region: string; url: string }>;
  relatedSignals: Array<{ title: string; category?: string; region?: string; summary?: string }>;
}) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const model = getOpenAiModel();
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model,
    instructions: [
      "あなたは企業・政策・地政学・技術を横断する日本語のインテリジェンスリサーチャーです。",
      "入力された組織・個人にとって、政治・経済・思想/社会・テクノロジーの変化がどのような影響を持つかを、読みやすいレポートとして書いてください。",
      "事実として断定できないことは仮説として表現し、根拠ソースが不足している場合は監視すべき論点として書いてください。",
      "出力はJSONのみ。キーは title, executiveSummary, structuralPosition, impactAssessment, opportunity, risk, watchPoints, recommendation のみ。"
    ].join("\n"),
    input: [
      {
        role: "user",
        content: JSON.stringify({
          target: input.target,
          sectorName: input.sectorName,
          quadrants: input.quadrants,
          countries: input.countries,
          sectorWatchPoints: input.sectorWatchPoints,
          relatedSources: input.relatedSources,
          relatedSignals: input.relatedSignals,
          draftReport: input.localReport,
          instructions: {
            language: "Japanese",
            tone: "経営者や企画責任者が読める、簡潔だが中身の濃いレポート",
            avoid: "一般論だけ、過度な煽り、根拠のない断定",
            prefer: "影響の経路、短期/中期/長期、機会、リスク、次に見るデータ",
            output: "Return valid json only."
          }
        })
      }
    ],
    text: {
      format: {
        type: "json_object"
      }
    },
    reasoning: {
      effort: "low"
    }
  });

  const raw = response.output_text || "{}";
  return {
    report: researchReportSchema.parse(JSON.parse(raw)),
    model
  };
}

function buildReport(
  target: string,
  primary: ReportQuadrant,
  secondary: ReportQuadrant,
  quadrants: ReportQuadrant[],
  countries: typeof countryFocus,
  sector?: (typeof sectorProfiles)[number]
) {
  const countryNames = countries.map((country) => country.name).join("・") || "米国・中国・EU・日本";
  const sectorSentence = sector
    ? `${target}は${sector.name}の文脈で見ると、${sector.operatingExposure}`
    : `${target}は単独の主体ではなく、政策、資本、社会の納得、技術実装の四つの圧力が重なる場所に置かれています。`;
  const strategicQuestion = sector?.strategicQuestion ?? `${target}にとって重要なのは、どの変化を脅威として避け、どの変化を事業・提携・人材の機会へ変えるかです。`;
  const leadingQuadrants = quadrants.slice(0, 2).map((quadrant) => quadrant.label).join("と");
  const opportunityAction = categoryAction(primary.label, target);

  return {
    title: `${target} 影響構造レポート`,
    executiveSummary: `${sectorSentence} 現時点では、${primary.label}の「${primary.structure}」と、${secondary.label}の「${secondary.structure}」が特に強く効きます。つまり、${target}への影響は一つのニュースではなく、${leadingQuadrants}が連動して意思決定環境を変える動きとして読む必要があります。`,
    structuralPosition: `${target}は、${countryNames}を中心とする国・地域の制度変更、資本配分、技術標準、社会受容の間にあります。特に国ごとの規制や補助金、産業政策の違いは、どこで投資し、どこで提携し、どこで人材を育てるかを左右します。`,
    impactAssessment: [
      `短期的には、${primary.watch}の変化がリスク管理と対外説明の優先順位を押し上げます。`,
      `中期的には、${secondary.watch}が収益性、採用、研究開発、提携先選定に影響します。`,
      `長期的には、${quadrants[2].watch}と${quadrants[3].watch}が重なり、組織の存在意義や競争優位の定義そのものを変えます。`
    ],
    opportunity: `${target}が取りに行ける機会は、変化を受け身で処理することではなく、${opportunityAction}ことです。${strategicQuestion}`,
    risk: `${target}にとってのリスクは、個別領域ごとの対応が分断されることです。政治対応、投資判断、社会的信頼、技術実装が別々に動くと、外部環境の変化に対して説明と実行の速度が落ちます。`,
    watchPoints: sector?.watchPoints ?? quadrants.map((quadrant) => quadrant.watch).slice(0, 5),
    recommendation: [
      `${primary.label}と${secondary.label}を経営会議・企画会議の共通アジェンダにする`,
      `関係国・地域ごとに規制、需要、提携候補、人材要件を並べて比較する`,
      `ニュースではなく、政策文書・統計・研究機関・国際機関の根拠ソースを継続監視する`
    ]
  };
}

function scoreTextMatch(query: string, ...values: Array<string | undefined>) {
  const tokens = query.split(/[\s\u3000,、。・/]+/).filter(Boolean);
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (!text) return 0;
  let score = text.includes(query) ? 30 : 0;
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (text.includes(token)) score += token.length > 4 ? 12 : 8;
  }
  return score;
}

function detectCountries(query: string, sources: Source[]) {
  const fromQuery = countryFocus.filter((country) => {
    const haystack = `${country.code.toLowerCase()} ${country.name.toLowerCase()} ${country.thesis.toLowerCase()}`;
    return haystack.includes(query) || query.includes(country.code.toLowerCase()) || query.includes(country.name.toLowerCase());
  });
  const fromSources = inferCountriesFromSources(sources);
  return dedupeCountries([...fromQuery, ...fromSources]).slice(0, 5);
}

function inferCountriesFromSources(sources: Source[]) {
  const counts = new Map<string, number>();
  for (const source of sources) counts.set(source.country, (counts.get(source.country) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => countryFocus.find((country) => country.code === code))
    .filter((country): country is (typeof countryFocus)[number] => Boolean(country));
}

function dedupeCountries(countries: typeof countryFocus) {
  const seen = new Set<string>();
  return countries.filter((country) => {
    if (seen.has(country.code)) return false;
    seen.add(country.code);
    return true;
  });
}

function detectSector(query: string) {
  return sectorProfiles.find((sector) => sector.words.some((word) => query.includes(word)));
}

function sanitizeError(message: string) {
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 140);
}

function categoryAction(category: string, target: string) {
  if (category === "政治") {
    return `${target}に関わる規制、補助金、通商、安全保障、産業政策を先読みし、国・地域ごとの事業判断に組み込む`;
  }
  if (category === "経済") {
    return `${target}の投資配分、価格戦略、調達、提携、採用を資本コストと需要変化に合わせて組み替える`;
  }
  if (category === "思想") {
    return `${target}への信頼、ブランド、雇用観、消費者の価値観変化を読み、社会的な納得を設計する`;
  }
  return `${target}の技術ロードマップ、データ活用、AI実装、研究開発体制を競争優位に直結させる`;
}

async function persistIntelligenceResearch(research: IntelligenceResearchResult) {
  try {
    await saveIntelligenceResearchReport({
      target: research.target,
      query: research.target,
      headline: research.headline,
      report: research.report,
      analysis_mode: research.analysisMode,
      quadrants: research.quadrants,
      countries: research.countries,
      related_sources: research.relatedSources,
      related_items: research.relatedItems,
      impact_paths: research.impactPaths,
      recommended_next_searches: research.recommendedNextSearches
    });
  } catch (error) {
    console.warn("Failed to save intelligence research report", sanitizeError(error instanceof Error ? error.message : String(error)));
  }
}
