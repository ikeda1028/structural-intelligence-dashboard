import seed from './seed.mjs';
import registry from './registry.mjs';
/** Public, bundled data only; never read internal intelligence or contact tables. */
export function getBundledPublicData({env=process.env}={}) {
  const researchConfigured=Boolean(env.TLA_PUBLIC_RESEARCH_ENABLED==='1' && (env.OPENAI_SI_API_KEY || env.OPENAI_API_KEY) && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  return Response.json({...seed,municipalities:registry,registryAvailable:true,registryError:'',registryMode:'bundled-snapshot',release:'2026-09-26-v0.2-bundled',masterSource:'https://raw.githubusercontent.com/gsi-cyberjapan/gsimaps/gh-pages/js/muni.js',masterFetchedAt:'2026-09-25T17:52:25Z',researchConfigured,notice:'名称・コード台帳は全国1,741件の収録時点スナップショットです。詳細資料は3自治体9件。数値統計・全国の議事録分析は未取得。参画・紹介承諾ではありません。'}, {headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
