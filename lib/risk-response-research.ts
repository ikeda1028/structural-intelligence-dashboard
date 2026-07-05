import OpenAI from "openai";
import { z } from "zod";
import { getOpenAiApiKey, getOpenAiKeyStatus, getOpenAiModel } from "@/lib/openai-config";
import { saveRiskResponseResearchReport } from "@/lib/repository";

const sourceSchema = z.object({
  title: z.string().default("根拠ソース"),
  url: z.string().default(""),
  publisher: z.string().default(""),
  date: z.string().default("")
});

const riskItemSchema = z.object({
  risk: z.string(),
  riskCategory: z.string().default("未分類"),
  whyItMatters: z.string(),
  responseSummary: z.string(),
  responseScore: z.number().min(0).max(100),
  scoreReason: z.string(),
  status: z.enum(["高い", "中程度", "低い", "不明"]).default("不明"),
  evidence: z.array(sourceSchema).default([]),
  missingEvidence: z.string().default("")
});

const competitorSchema = z.object({
  name: z.string(),
  relationship: z.string().default("競合"),
  overallScore: z.number().min(0).max(100),
  relativePosition: z.enum(["上回る", "同程度", "下回る", "不明"]).default("不明"),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  riskScores: z.array(z.object({
    risk: z.string(),
    score: z.number().min(0).max(100),
    evidenceSummary: z.string(),
    evidence: z.array(sourceSchema).default([])
  })).default([])
});

const riskResearchSchema = z.object({
  target: z.string(),
  generatedAt: z.string(),
  analysisMode: z.string(),
  overallScore: z.number().min(0).max(100),
  overallAssessment: z.string(),
  risks: z.array(riskItemSchema).min(3),
  competitors: z.array(competitorSchema).default([]),
  nextResearchQuestions: z.array(z.string()).default([])
});

export type RiskResponseResearch = z.infer<typeof riskResearchSchema>;

export async function buildRiskResponseResearch(target: string): Promise<RiskResponseResearch> {
  const normalizedTarget = target.trim();
  if (!normalizedTarget) {
    const fallback = createFallbackRiskResearch("調査対象未指定", "調査対象が指定されていません。");
    await persistRiskResponseResearch(fallback);
    return fallback;
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    const fallback = createFallbackRiskResearch(normalizedTarget, "OPENAI_SI_API_KEY未設定のため、検索調査は未実行です。");
    await persistRiskResponseResearch(fallback);
    return fallback;
  }

  const model = getOpenAiModel();
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.responses.create({
      model,
      instructions: [
        "あなたは企業リスク、政策、技術、サステナビリティ、レピュテーション調査のリサーチャーです。",
        "Web検索を使い、対象企業・団体が主要リスクに対してどのような対策を打っているかを調べます。",
        "公式発表、統合報告書、サステナビリティ報告書、規制当局、主要メディア、研究機関を優先してください。",
        "対応度スコアは0-100。公表された具体策・投資・KPI・進捗・第三者評価があるほど高く、根拠不足や抽象論だけなら低くしてください。",
        "対象企業の主要競合も3〜5社抽出し、同じリスク軸で対応度を比較してください。",
        "出力はJSONのみ。キーは target, generatedAt, analysisMode, overallScore, overallAssessment, risks, competitors, nextResearchQuestions のみ。"
      ].join("\n"),
      input: [
        {
          role: "user",
          content: JSON.stringify({
            target: normalizedTarget,
            requiredOutput: {
              target: "string",
              generatedAt: "YYYY-MM-DD",
              analysisMode: "string",
              overallScore: "0-100 number",
              overallAssessment: "string",
              risks: [
                {
                  risk: "string",
                  riskCategory: "政治/経済/思想・社会/テクノロジー/環境/法務など",
                  whyItMatters: "string",
                  responseSummary: "string",
                  responseScore: "0-100 number",
                  scoreReason: "string",
                  status: "高い|中程度|低い|不明",
                  evidence: [{ title: "string", url: "string", publisher: "string", date: "string" }],
                  missingEvidence: "string"
                }
              ],
              competitors: [
                {
                  name: "string",
                  relationship: "string",
                  overallScore: "0-100 number",
                  relativePosition: "上回る|同程度|下回る|不明",
                  strengths: ["string"],
                  weaknesses: ["string"],
                  riskScores: [
                    {
                      risk: "string",
                      score: "0-100 number",
                      evidenceSummary: "string",
                      evidence: [{ title: "string", url: "string", publisher: "string", date: "string" }]
                    }
                  ]
                }
              ],
              nextResearchQuestions: ["string"]
            },
            likelyCompetitors: inferCompetitors(normalizedTarget),
            instructions: "Search the web and return valid json only. Include 5 to 8 important risks, 3 to 5 competitors, and at least one evidence URL when available."
          })
        }
      ],
      tools: [{ type: "web_search_preview" }],
      reasoning: {
        effort: "low"
      }
    });

    const parsed = riskResearchSchema.parse(JSON.parse(extractJson(response.output_text || "{}")));
    const research = {
      ...parsed,
      analysisMode: `ChatGPT検索調査 / ${model}`
    };
    await persistRiskResponseResearch(research);
    return research;
  } catch (error) {
    const fallback = createFallbackRiskResearch(normalizedTarget, getOpenAiKeyStatus() ? `検索調査に失敗: ${sanitizeError(error)}` : "OPENAI_SI_API_KEY未設定");
    await persistRiskResponseResearch(fallback);
    return fallback;
  }
}

function createFallbackRiskResearch(target: string, reason: string): RiskResponseResearch {
  return {
    target,
    generatedAt: new Date().toISOString().slice(0, 10),
    analysisMode: "ローカル推定",
    overallScore: 0,
    overallAssessment: reason,
    risks: [
      {
        risk: "検索調査未実行",
        riskCategory: "不明",
        whyItMatters: "外部根拠に基づく確認がまだできていません。",
        responseSummary: "OPENAI_SI_API_KEYまたはWeb検索調査の実行状態を確認してください。",
        responseScore: 0,
        scoreReason: reason,
        status: "不明",
        evidence: [],
        missingEvidence: "公式発表、統合報告書、主要メディア記事などの確認が必要です。"
      },
      {
        risk: "公表対策の不足",
        riskCategory: "レピュテーション",
        whyItMatters: "対策が公表されていない場合、外部から対応度を判断できません。",
        responseSummary: "検索調査を実行すると、公開情報から対応度を評価します。",
        responseScore: 0,
        scoreReason: reason,
        status: "不明",
        evidence: [],
        missingEvidence: "公開資料の取得が必要です。"
      },
      {
        risk: "根拠ソース不足",
        riskCategory: "調査品質",
        whyItMatters: "スコアリングには複数ソースの照合が必要です。",
        responseSummary: "公式資料と第三者情報を照合できる状態にしてください。",
        responseScore: 0,
        scoreReason: reason,
        status: "不明",
        evidence: [],
        missingEvidence: "複数ソースの確認が必要です。"
      }
    ],
    competitors: inferCompetitors(target).slice(0, 3).map((name) => ({
      name,
      relationship: "競合候補",
      overallScore: 0,
      relativePosition: "不明" as const,
      strengths: [],
      weaknesses: ["検索調査未実行"],
      riskScores: []
    })),
    nextResearchQuestions: [`${target} 統合報告書 リスク 対策`, `${target} sustainability report risk management`, `${target} EV strategy supply chain risk`]
  };
}

function inferCompetitors(target: string) {
  const lower = target.toLowerCase();
  if (lower.includes("ホンダ") || lower.includes("honda") || lower.includes("自動車")) {
    return ["トヨタ自動車", "日産自動車", "現代自動車", "Volkswagen", "BYD"];
  }
  if (lower.includes("toyota") || lower.includes("トヨタ")) {
    return ["ホンダ", "日産自動車", "現代自動車", "Volkswagen", "BYD"];
  }
  if (lower.includes("openai")) {
    return ["Google DeepMind", "Anthropic", "Meta AI", "Microsoft AI"];
  }
  return [];
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 180);
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

async function persistRiskResponseResearch(research: RiskResponseResearch) {
  try {
    await saveRiskResponseResearchReport({
      target: research.target,
      generated_at: research.generatedAt,
      analysis_mode: research.analysisMode,
      overall_score: research.overallScore,
      overall_assessment: research.overallAssessment,
      risks: research.risks,
      competitors: research.competitors,
      next_research_questions: research.nextResearchQuestions,
      raw_result: research
    });
  } catch (error) {
    console.warn("Failed to save risk response research report", sanitizeError(error));
  }
}
