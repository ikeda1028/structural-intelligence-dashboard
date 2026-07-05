import OpenAI from "openai";
import { z } from "zod";
import { getOpenAiApiKey, getOpenAiModel } from "@/lib/openai-config";
import type { Analysis, CrawledItem } from "@/lib/types";

const analysisSchema = z.object({
  what_happened: z.string(),
  why_important: z.string(),
  underlying_structure: z.string(),
  strengthening_forces: z.array(z.string()),
  weakening_forces: z.array(z.string()),
  stakeholders: z.array(z.string()),
  medium_term_meaning: z.string(),
  future_hypotheses: z.array(z.object({
    title: z.string(),
    description: z.string(),
    time_horizon: z.enum(["3_months", "1_year", "3_years"]),
    confidence_level: z.enum(["low", "medium", "high"]),
    evidence: z.string()
  })),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  tla_implications: z.object({
    education: z.string(),
    human_resource_development: z.string(),
    regional_revitalization: z.string(),
    content_business: z.string(),
    dao_nft_certification: z.string(),
    investment_theme: z.string(),
    proposal_targets: z.array(z.string())
  }),
  summary_ja: z.string(),
  category: z.string(),
  importance_score: z.number().min(0).max(100)
});

export async function analyzeItem(item: CrawledItem) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return createFallbackAnalysis(item);
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: getOpenAiModel(),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "あなたは地政学、経済、技術、教育事業の構造分析者です。出力は必ずJSONのみ。本文の再配布ではなく、要約と分析を日本語で生成してください。"
      },
      {
        role: "user",
        content: JSON.stringify({
          title: item.title,
          url: item.url,
          category: item.category,
          text: (item.extracted_text || item.raw_text || "").slice(0, 12000),
          requiredKeys: Object.keys(analysisSchema.shape)
        })
      }
    ]
  });

  const parsed = analysisSchema.parse(JSON.parse(completion.choices[0]?.message.content || "{}"));
  return {
    id: crypto.randomUUID(),
    crawled_item_id: item.id,
    ...parsed,
    created_at: new Date().toISOString()
  } satisfies Analysis & { summary_ja: string; category: string; importance_score: number };
}

function createFallbackAnalysis(item: CrawledItem) {
  return {
    id: crypto.randomUUID(),
    crawled_item_id: item.id,
    what_happened: `${item.title} に関する新しい公開情報が検出されました。`,
    why_important: "信頼度の高い情報源からの更新であり、政策・市場・教育領域の変化兆候として継続観測する価値があります。",
    underlying_structure: "制度、資本、技術、世論、国際関係の相互作用が意思決定の速度と方向を左右しています。",
    strengthening_forces: ["政策支援", "技術投資", "国際連携"],
    weakening_forces: ["規制摩擦", "社会的受容の遅れ", "財政制約"],
    stakeholders: ["政府", "企業", "教育機関", "地域コミュニティ"],
    medium_term_meaning: "今後1年程度で、教育・人材・地域実装に関する実験機会が増える可能性があります。",
    future_hypotheses: [
      {
        title: "制度実装の加速",
        description: "関連する政策や投資が試行段階から実装段階へ進む。",
        time_horizon: "1_year",
        confidence_level: "medium",
        evidence: item.url
      }
    ],
    risks: ["情報の一次性不足", "地域差の過小評価"],
    opportunities: ["教育プログラム化", "企業研修化", "自治体提案化"],
    tla_implications: {
      education: "構造理解を促す探究教材のテーマ候補になります。",
      human_resource_development: "変化対応力、政策読解力、技術リテラシー研修に接続できます。",
      regional_revitalization: "地域課題との接点を抽出し、自治体向け仮説提案に展開できます。",
      content_business: "解説記事、講座、レポート商品の素材になります。",
      dao_nft_certification: "学習履歴やプロジェクト成果の認証テーマとして検討できます。",
      investment_theme: "政策・技術・教育の交差領域を投資テーマとして観測できます。",
      proposal_targets: ["自治体", "教育機関", "企業人材開発部門"]
    },
    summary_ja: item.extracted_text?.slice(0, 180) || "本文抽出前のため、詳細要約は未生成です。",
    category: item.category || "未分類",
    importance_score: item.importance_score || 60,
    created_at: new Date().toISOString()
  } satisfies Analysis & { summary_ja: string; category: string; importance_score: number };
}
