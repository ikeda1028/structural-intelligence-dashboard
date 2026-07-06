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

type PowerField = {
  key: "ideology" | "economic" | "political" | "technology";
  label: string;
  sourceQuadrant: string;
  score: number;
  pressure: string;
  organizationEffect: string;
  individualEffect: string;
  degradation: string;
};

type RelationNode = {
  id: string;
  label: string;
  kind: string;
  score: number;
  role: string;
};

type RelationLink = {
  from: string;
  to: string;
  score: number;
  label: string;
};

type RelationLayer = {
  quadrant: string;
  title: string;
  summary: string;
  nodes: RelationNode[];
  links: RelationLink[];
  watchQuestions: string[];
};

type InternalPowerCenter = {
  department: string;
  dominantField: string;
  power: number;
  influence: string;
  risk: string;
};

type PowerMap = {
  title: string;
  degradationFirst: string;
  organizationPower: number;
  organizationPowerLabel: string;
  individualExposure: number;
  individualExposureLabel: string;
  collectiveWill: string;
  coercivePressure: string;
  fields: PowerField[];
  relationLayers: RelationLayer[];
  internalPowerCenters: InternalPowerCenter[];
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
  powerMap: PowerMap;
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
  const powerMap = buildPowerMap(target, quadrants, strongestCountries, sector);
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
    powerMap,
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

function buildPowerMap(
  target: string,
  quadrants: ReportQuadrant[],
  countries: typeof countryFocus,
  sector?: (typeof sectorProfiles)[number]
): PowerMap {
  const byLabel = new Map(quadrants.map((quadrant) => [quadrant.label, quadrant]));
  const getQuadrant = (label: string) => byLabel.get(label) ?? quadrants[0];
  const sortedQuadrants = [...quadrants].sort((a, b) => b.relevance - a.relevance);
  const topPressure = sortedQuadrants[0];
  const secondPressure = sortedQuadrants[1] ?? topPressure;
  const organizationPower = clampScore(Math.round(
    quadrants.reduce((sum, quadrant) => sum + quadrant.relevance, 0) / Math.max(1, quadrants.length) + (sector ? 6 : 0)
  ));
  const individualExposure = clampScore(Math.round((getQuadrant("思想").relevance + getQuadrant("政治").relevance + organizationPower) / 3));

  const fields: PowerField[] = [
    {
      key: "ideology",
      label: "イデオロギーパワー",
      sourceQuadrant: "思想",
      score: getQuadrant("思想").relevance,
      pressure: `${target}が社会から何を正当と見なされるかを決める圧力`,
      organizationEffect: "ブランド、採用、信頼、世論、説明責任に作用する",
      individualEffect: "所属する個人の誇り、不安、発言しやすさ、離職意向に影響する",
      degradation: "共通の物語が弱まると、現場の納得感と心理的安全性が劣化する"
    },
    {
      key: "economic",
      label: "エコノミックパワー",
      sourceQuadrant: "経済",
      score: getQuadrant("経済").relevance,
      pressure: `${target}の資金、価格、需要、投資余力を左右する圧力`,
      organizationEffect: "収益性、調達、設備投資、提携、雇用計画に作用する",
      individualEffect: "賃金、評価、配置転換、学び直しの必要性として個人に届く",
      degradation: "資本効率だけが強まると、長期投資と人材育成が細る"
    },
    {
      key: "political",
      label: "ポリティカルパワー",
      sourceQuadrant: "政治",
      score: getQuadrant("政治").relevance,
      pressure: `${target}の許認可、規制、補助金、安全保障、行政関係を動かす圧力`,
      organizationEffect: "参入条件、国別戦略、調達先、対外説明、危機管理に作用する",
      individualEffect: "働き方のルール、コンプライアンス、発言制約、責任範囲に影響する",
      degradation: "ルール対応が後手に回ると、意思決定が萎縮し現場裁量が劣化する"
    },
    {
      key: "technology",
      label: "サイエンス & テクノロジーパワー",
      sourceQuadrant: "テクノロジー",
      score: getQuadrant("テクノロジー").relevance,
      pressure: `${target}の実装速度、AI活用、データ、研究開発を変える圧力`,
      organizationEffect: "競争優位、業務プロセス、製品設計、知識生産の速度に作用する",
      individualEffect: "必要スキル、学習負荷、生産性格差、役割の再定義として現れる",
      degradation: "技術更新に学習が追いつかないと、専門性と自己効力感が劣化する"
    }
  ];
  const strongestField = [...fields].sort((a, b) => b.score - a.score)[0];

  return {
    title: `${target} 牧山版四象限パワーマップ`,
    degradationFirst: `最初に見る劣化: ${strongestField.degradation}。特に${topPressure.label}と${secondPressure.label}の圧力が同時に強まると、団体の意思決定と個人の任意・強制の感覚がずれやすくなります。`,
    organizationPower,
    organizationPowerLabel: scoreLabel(organizationPower),
    individualExposure,
    individualExposureLabel: scoreLabel(individualExposure),
    collectiveWill: `${target}の団体としての力は、${topPressure.label}の外圧を戦略へ翻訳し、${secondPressure.label}の制約を現場の実行に落とせるかで決まります。`,
    coercivePressure: "個人には、任意の挑戦として届く力と、規制・評価・市場変化による強制として届く力が混在します。",
    fields,
    relationLayers: buildRelationLayers(target, fields, countries, sector),
    internalPowerCenters: buildInternalPowerCenters(target, fields, sector)
  };
}

function buildRelationLayers(
  target: string,
  fields: PowerField[],
  countries: typeof countryFocus,
  sector?: (typeof sectorProfiles)[number]
): RelationLayer[] {
  const field = (sourceQuadrant: string) => fields.find((item) => item.sourceQuadrant === sourceQuadrant) ?? fields[0];
  const countryNodes = normalizeRelationCountries(countries).slice(0, 4);
  const politicalBase = field("政治").score;
  const economicBase = field("経済").score;
  const ideologyBase = field("思想").score;
  const technologyBase = field("テクノロジー").score;

  return [
    {
      quadrant: "政治",
      title: "政治の詳細関係図",
      summary: `${target}に対する政治圧力は、国・政党/権力ブロック・規制機関の三層で見る。どの国が強いか、どの政策勢力が意思決定に近いかを追加調査する。`,
      nodes: [
        relationNode("target", target, "対象", 99, "政治圧力を受ける中心主体"),
        ...countryNodes.map((country, index) => relationNode(
          `country-${country.code}`,
          country.name,
          "国・地域",
          clampScore(politicalBase - index * 7 + (country.code === "US" ? 12 : 0)),
          country.thesis
        )),
        ...countryNodes.flatMap((country, countryIndex) => partyNodesForCountry(country.code, politicalBase - countryIndex * 5)),
        relationNode("regulators", "規制・監督機関", "制度", clampScore(politicalBase + 8), "許認可、輸出管理、調達、補助金、競争政策を動かす"),
        relationNode("security", "安全保障コミュニティ", "政策圏", clampScore(politicalBase + 6), "地政学・産業政策・重要インフラの判断に作用する")
      ],
      links: [
        ...countryNodes.map((country, index) => relationLink(`country-${country.code}`, "target", clampScore(politicalBase - index * 5 + 8), "市場アクセス / 規制")),
        relationLink("regulators", "target", clampScore(politicalBase + 10), "許認可・基準"),
        relationLink("security", "target", clampScore(politicalBase + 6), "安全保障評価"),
        ...countryNodes.flatMap((country) => partyNodesForCountry(country.code, politicalBase).map((node) => relationLink(node.id, `country-${country.code}`, node.score, "政策形成")))
      ],
      watchQuestions: [
        `${target}に強く影響する国はどこか`,
        "どの政党・政策集団が規制、補助金、輸出管理、公共調達に近いか",
        "政権交代や選挙で変わる政策リスクは何か"
      ]
    },
    {
      quadrant: "経済",
      title: "経済の詳細関係図",
      summary: `${target}の経済圧力は、資本市場、主要顧客、供給網、競合の間で決まる。どの相手が価格・投資・調達に強く作用するかを見る。`,
      nodes: [
        relationNode("target", target, "対象", 99, "資本配分と収益責任を持つ主体"),
        relationNode("capital-market", "資本市場・投資家", "資本", clampScore(economicBase + 9), "株価、資金調達、投資判断、成長期待を左右する"),
        relationNode("major-customers", "主要顧客・取引先", "需要", clampScore(economicBase + 7), "売上、解約、採用速度、価格交渉力に作用する"),
        relationNode("suppliers", "供給網・外部パートナー", "供給", clampScore(economicBase + 5), "部材、クラウド、物流、人材、外注能力を左右する"),
        relationNode("competitors", "競合・代替プレイヤー", "競争", clampScore(economicBase + 4), "価格、技術標準、顧客獲得の条件を変える")
      ],
      links: [
        relationLink("capital-market", "target", clampScore(economicBase + 10), "資本コスト"),
        relationLink("major-customers", "target", clampScore(economicBase + 9), "需要・売上"),
        relationLink("suppliers", "target", clampScore(economicBase + 7), "調達・供給制約"),
        relationLink("competitors", "target", clampScore(economicBase + 6), "価格・差別化")
      ],
      watchQuestions: [
        "最大顧客、最大取引先、最大供給制約はどこか",
        "競合の対応度数は対象を上回っているか",
        "資本市場は成長投資と短期利益のどちらを要求しているか"
      ]
    },
    {
      quadrant: "思想",
      title: "思想・社会の詳細関係図",
      summary: `${target}の社会的正当性は、顧客、従業員、メディア、市民社会、教育/専門家コミュニティの納得で変わる。`,
      nodes: [
        relationNode("target", target, "対象", 99, "社会的意味を問われる主体"),
        relationNode("employees", "従業員・候補者", "個人", clampScore(ideologyBase + 7), "採用、離職、誇り、心理的安全性を左右する"),
        relationNode("media-public", "メディア・世論", "世論", clampScore(ideologyBase + 6), "評判、炎上、信頼、説明責任に作用する"),
        relationNode("civil-society", "市民社会・利用者", "社会", clampScore(ideologyBase + 5), "倫理、格差、環境、プライバシーへの納得を形成する"),
        relationNode("experts", "教育・専門家コミュニティ", "知識圏", clampScore(ideologyBase + 4), "標準的な語り方、人材育成、専門性の評価を作る")
      ],
      links: [
        relationLink("employees", "target", clampScore(ideologyBase + 8), "採用・組織文化"),
        relationLink("media-public", "target", clampScore(ideologyBase + 8), "評判・信頼"),
        relationLink("civil-society", "target", clampScore(ideologyBase + 6), "社会受容"),
        relationLink("experts", "target", clampScore(ideologyBase + 5), "正当化の言語")
      ],
      watchQuestions: [
        "誰が対象の社会的正当性を支えているか",
        "誰が反発・批判の中心になり得るか",
        "個人の誇りと強制感はどこでずれているか"
      ]
    },
    {
      quadrant: "テクノロジー",
      title: "技術の詳細関係図",
      summary: `${target}の技術圧力は、研究開発、データ、標準、プラットフォーム、実装部門の関係で決まる。`,
      nodes: [
        relationNode("target", target, "対象", 99, "技術実装を選択する主体"),
        relationNode("rnd", "研究開発・技術部門", "社内", clampScore(technologyBase + 10), "新技術の採用、内製/外部連携、技術負債を左右する"),
        relationNode("data-ai", "データ・AI基盤", "基盤", clampScore(technologyBase + 8), "分析、モデル、業務自動化、意思決定速度を支える"),
        relationNode("standards", "標準化・開発者エコシステム", "外部技術圏", clampScore(technologyBase + 6), "互換性、移行コスト、技術人材の流動性を決める"),
        relationNode("product-ops", "プロダクト・現場実装", "社内", clampScore(technologyBase + 5), "顧客価値、品質、運用速度に変換する")
      ],
      links: [
        relationLink("rnd", "target", clampScore(technologyBase + 10), "技術選択"),
        relationLink("data-ai", "target", clampScore(technologyBase + 8), "データ活用"),
        relationLink("standards", "target", clampScore(technologyBase + 7), "標準・互換性"),
        relationLink("product-ops", "target", clampScore(technologyBase + 6), "実装速度")
      ],
      watchQuestions: [
        "社内のどの部門が技術選択権を持っているか",
        "外部プラットフォームへの依存はどこにあるか",
        "学習が追いつかず劣化している専門性は何か"
      ]
    }
  ];
}

function buildInternalPowerCenters(
  target: string,
  fields: PowerField[],
  sector?: (typeof sectorProfiles)[number]
): InternalPowerCenter[] {
  const score = (quadrant: string, boost = 0) => clampScore((fields.find((field) => field.sourceQuadrant === quadrant)?.score ?? 40) + boost);
  return [
    {
      department: "経営会議・CEO室",
      dominantField: "統合",
      power: clampScore(Math.round(fields.reduce((sum, field) => sum + field.score, 0) / fields.length) + 10),
      influence: `${target}の任意と強制の境界を決め、外圧を戦略・投資・撤退判断に翻訳する`,
      risk: "現場情報が届かないと、外圧の理解が抽象化しすぎる"
    },
    {
      department: "法務・渉外・公共政策",
      dominantField: "政治",
      power: score("政治", 9),
      influence: "規制、政府、業界団体、許認可、危機対応の入口を握る",
      risk: "守りに偏ると、事業機会まで過剰に止める"
    },
    {
      department: "財務・IR・経営企画",
      dominantField: "経済",
      power: score("経済", 8),
      influence: "資本配分、投資優先順位、撤退基準、外部説明を設計する",
      risk: "短期指標に寄りすぎると、人材と技術への長期投資が細る"
    },
    {
      department: sector?.name === "教育・人材" ? "教材開発・学習設計" : "研究開発・プロダクト",
      dominantField: "テクノロジー",
      power: score("テクノロジー", 10),
      influence: "技術選択、品質、実装速度、競争優位の源泉を持つ",
      risk: "専門語化しすぎると、経営・営業・顧客との翻訳が切れる"
    },
    {
      department: "人事・組織文化",
      dominantField: "思想",
      power: score("思想", 7),
      influence: "個人への作用、採用、評価、学習、心理的安全性を左右する",
      risk: "制度だけ整っても、現場の納得がなければ強制感が増える"
    },
    {
      department: "営業・顧客接点",
      dominantField: "経済/思想",
      power: clampScore(Math.round((score("経済") + score("思想")) / 2) + 4),
      influence: "市場の圧力、顧客の不満、社会的な受容を最初に受け取る",
      risk: "短期受注に寄ると、構造変化の兆候を見落とす"
    }
  ];
}

function normalizeRelationCountries(countries: typeof countryFocus) {
  const fallback = ["US", "JP", "EU", "CN"]
    .map((code) => countryFocus.find((country) => country.code === code))
    .filter((country): country is (typeof countryFocus)[number] => Boolean(country));
  return dedupeCountries([...countries, ...fallback]);
}

function partyNodesForCountry(countryCode: string, baseScore: number): RelationNode[] {
  const parties: Record<string, Array<[string, string, number]>> = {
    US: [
      ["民主党", "規制、産業政策、労働、環境、AI安全の論点に影響", 8],
      ["共和党", "安全保障、対中政策、減税、規制緩和、産業保護の論点に影響", 7]
    ],
    JP: [
      ["自民党", "産業政策、補助金、規制、外交安全保障に近い与党軸", 8],
      ["公明党", "生活者、福祉、教育、連立与党内調整に影響", 5],
      ["主要野党", "監視、批判、世論争点化、制度修正に影響", 4]
    ],
    EU: [
      ["欧州委員会", "規制案、競争政策、AI/データ政策を主導", 8],
      ["欧州議会主要会派", "人権、競争、産業政策、環境基準を調整", 6]
    ],
    CN: [["中国共産党", "国家産業政策、データ、規制、安全保障を一体で動かす", 9]],
    UK: [
      ["労働党", "産業政策、労働、公共投資、規制の方向に影響", 6],
      ["保守党", "市場、規制、外交安全保障、競争政策に影響", 5]
    ],
    IN: [["BJP", "デジタル公共基盤、産業政策、国家戦略に影響", 7]]
  };
  return (parties[countryCode] ?? [["主要政党・政策集団", "選挙、規制、補助金、世論形成に影響", 4]]).map(([label, role, boost]) =>
    relationNode(`party-${countryCode}-${label}`, label, "政党/権力ブロック", clampScore(baseScore + boost), role)
  );
}

function relationNode(id: string, label: string, kind: string, score: number, role: string): RelationNode {
  return { id, label, kind, score: clampScore(Math.round(score)), role };
}

function relationLink(from: string, to: string, score: number, label: string): RelationLink {
  return { from, to, score: clampScore(Math.round(score)), label };
}

function clampScore(score: number) {
  return Math.max(0, Math.min(99, score));
}

function scoreLabel(score: number) {
  if (score >= 75) return "非常に強い";
  if (score >= 55) return "強い";
  if (score >= 35) return "中程度";
  return "まだ弱い";
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
      report: { ...research.report, powerMap: research.powerMap },
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
