import type { CrawledItem, Source } from "@/lib/types";

type Movement = {
  domain: string;
  direction: string;
  velocity: number;
  signal: string;
  structuralShift: string;
  near: string;
  mid: string;
  long: string;
  tlaAction: string;
};

export const baseMovements: Movement[] = [
  {
    domain: "政治・国際機関",
    direction: "国家間協調から、価値圏ごとの再編へ",
    velocity: 82,
    signal: "安全保障、産業政策、国際機関の発信が同時に増えている",
    structuralShift: "グローバル化の前提が、効率からレジリエンスへ移る",
    near: "外交・規制・産業支援の言葉が教育や地域政策へ流入する",
    mid: "企業と自治体が、国際情勢を前提に人材育成を組み直す",
    long: "国境を越える学習共同体と、地域単位の実装力が同時に重要になる",
    tlaAction: "探究テーマを国際情勢、産業政策、地域課題の三点で設計する"
  },
  {
    domain: "経済・金融",
    direction: "低コスト資本の時代から、選別投資の時代へ",
    velocity: 76,
    signal: "中央銀行、国際金融機関、産業投資の発信が連動している",
    structuralShift: "成長の評価軸が規模拡大から、生産性・信用・実装速度へ移る",
    near: "教育、人材、AI活用への投資効果がより厳しく問われる",
    mid: "地域企業は補助金依存よりも、収益化できる人材開発を求める",
    long: "学習成果の証明、実務接続、投資テーマ化が一体化する",
    tlaAction: "研修を単発講座ではなく、成果物・認証・事業提案まで含む商品にする"
  },
  {
    domain: "テクノロジー",
    direction: "AI利用から、AI前提の組織設計へ",
    velocity: 91,
    signal: "基盤モデル、半導体、研究機関の更新頻度が高い",
    structuralShift: "知識労働の価値が、答えを出す力から問いと検証を設計する力へ移る",
    near: "学校・企業でAIリテラシーの最低ラインが急速に上がる",
    mid: "AIを使える人材ではなく、AIで構造を変えられる人材が評価される",
    long: "教育コンテンツは個別最適化され、認証とポートフォリオが接続する",
    tlaAction: "AI時代の探究、事業構想、地域課題解決を横断する教材群を作る"
  },
  {
    domain: "安全保障・地政学",
    direction: "軍事安全保障から、社会全体の耐性設計へ",
    velocity: 79,
    signal: "シンクタンク発信でサプライチェーン、情報戦、技術覇権が重なる",
    structuralShift: "安全保障が企業経営、教育、地域インフラの前提条件になる",
    near: "情報の真偽判断、危機時の意思決定教育が必要になる",
    mid: "地域の産業・教育政策にも地政学リスクの読み込みが入る",
    long: "信頼できるコミュニティと分散型の学習・認証基盤が価値を持つ",
    tlaAction: "地政学を怖がらせる教材ではなく、構造読解と行動設計の教材にする"
  },
  {
    domain: "思想・社会",
    direction: "共通の物語から、分断を越える実践共同体へ",
    velocity: 68,
    signal: "価値観、人口、ウェルビーイング、格差の調査が政策議論と接続している",
    structuralShift: "社会の納得形成が、制度よりも参加経験と信頼関係に依存する",
    near: "若者、地域、企業の間で未来像のズレが可視化される",
    mid: "教育は知識伝達より、対話・合意形成・プロジェクト経験を重視する",
    long: "思想や価値観を翻訳できる人材が、地域と組織の中核になる",
    tlaAction: "対話型プログラムと地域プロジェクトを、価値観の翻訳装置として設計する"
  },
  {
    domain: "教育・人材",
    direction: "学校内教育から、生涯の能力証明インフラへ",
    velocity: 84,
    signal: "国際機関と国内省庁が、スキル・再教育・人材流動化を同時に語っている",
    structuralShift: "学歴中心から、学習履歴・実績・越境経験の組み合わせへ移る",
    near: "探究、AI、起業、地域連携の需要が教育現場で増える",
    mid: "企業研修と学校教育の境界が薄くなり、共同プログラムが増える",
    long: "DAO/NFT型の証明やポートフォリオが、学習と仕事の橋になる",
    tlaAction: "学校、企業、自治体をまたぐ認証付きプロジェクト型学習を設計する"
  }
];

export function getEraMovements(sources: Source[], items: CrawledItem[]) {
  return baseMovements.map((movement) => {
    const sourceCount = sources.filter((source) => source.category === movement.domain && source.is_active).length;
    const itemCount = items.filter((item) => item.category === movement.domain).length;
    const observedVelocity = Math.min(98, movement.velocity + Math.min(10, itemCount * 2));

    return {
      ...movement,
      sourceCount,
      itemCount,
      observedVelocity
    };
  }).sort((a, b) => b.observedVelocity - a.observedVelocity);
}

export function getEraThesis(items: CrawledItem[]) {
  if (items.length === 0) {
    return "いまは、AI・地政学・教育再編が同時に進み、社会の前提が「効率よく成長する」から「不確実性の中で学び直し続ける」へ移っています。";
  }

  const topCategories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).slice(0, 3);
  return `${topCategories.join("・")}のシグナルが重なっています。時代は、個別ニュースの積み重ねではなく、技術・制度・価値観・人材の再配置として動いています。`;
}

export const quadrantTable = [
  {
    quadrant: "政治",
    coreQuestion: "誰がルールを決めるのか",
    currentShift: "国際協調から、価値圏・安全保障・産業政策を軸にした再編へ",
    watchingSignals: "政府発表、国際機関、外交、安全保障、規制、補助金",
    futureHypothesis: "教育・地域・企業活動にも、地政学と政策読解が必須になる",
    tlaImplication: "国際情勢を探究テーマ化し、自治体・学校・企業向けの構造読解プログラムにする"
  },
  {
    quadrant: "経済",
    coreQuestion: "資本と機会はどこへ流れるのか",
    currentShift: "低金利・大量資本から、信用・生産性・実装力を問う選別投資へ",
    watchingSignals: "中央銀行、IMF、世界銀行、産業投資、物価、雇用、金融政策",
    futureHypothesis: "学習・人材・AI活用も、投資対効果と成果証明で評価される",
    tlaImplication: "研修や教育を、成果物・認証・提案書まで含む投資可能な商品にする"
  },
  {
    quadrant: "思想",
    coreQuestion: "人々は何を信じ、何に納得するのか",
    currentShift: "共通の物語が弱まり、価値観の分断を越える対話と実践共同体へ",
    watchingSignals: "価値観調査、世論、格差、若者意識、ウェルビーイング、文化摩擦",
    futureHypothesis: "知識よりも、意味づけ・合意形成・共同実践を設計できる人材が重要になる",
    tlaImplication: "対話型探究、地域プロジェクト、価値観の翻訳を教育コンテンツ化する"
  },
  {
    quadrant: "テクノロジー",
    coreQuestion: "何が人間の能力を拡張するのか",
    currentShift: "AIを使う段階から、AI前提で組織・学習・仕事を組み替える段階へ",
    watchingSignals: "AIモデル、半導体、研究論文、企業実装、教育AI、認証技術",
    futureHypothesis: "答えを知る力より、問い・検証・編集・実装を設計する力が評価される",
    tlaImplication: "AI時代の探究、事業構想、DAO/NFT認証を組み合わせた学習体験を作る"
  }
];
