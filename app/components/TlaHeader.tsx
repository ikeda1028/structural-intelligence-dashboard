import Link from "next/link";

const primaryLinks = [
  { href: "/", label: "ダッシュボード" },
  { href: "/co-creation", label: "自治体共創" },
  { href: "/sources", label: "情報源管理" },
  { href: "/research-history", label: "調査履歴" }
];

export function TlaHeader({ includeReports = false }: { includeReports?: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/" aria-label="TLA 牧山式インテリジェンスリサーチ トップ">
          <span className="tla-brand-logo">
            <img src="/co-creation-assets/brand/tla-logo-canonical.png" alt="TLA" width="368" height="198" />
          </span>
          <span className="tla-brand-product">
            牧山式インテリジェンスリサーチ
            <small>STRUCTURAL INTELLIGENCE PLATFORM</small>
          </span>
        </Link>
        <nav className="nav" aria-label="主要ナビゲーション">
          {primaryLinks.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
          {includeReports ? (
            <>
              <a href="/reports/michinoeki-20260927.html">道の駅レポート</a>
              <a href="/reports/michinoeki-visitors-20260927.html">集客50駅</a>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
