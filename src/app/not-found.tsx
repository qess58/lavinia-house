import Link from "next/link";

export default function BulunamadiSayfasi() {
  return (
    <main className="wrap" style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16, padding: "48px 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={72} height={72} />
      <h1 style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>Aradığınız sayfa bulunamadı</h1>
      <p className="mut" style={{ maxWidth: 480 }}>Bağlantı değişmiş ya da sayfa kaldırılmış olabilir. Ürünlere göz atabilir ya da arama yapabilirsiniz.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link className="btn pri" href="/urunler">Ürünlere göz at</Link>
        <Link className="btn" href="/">Ana sayfa</Link>
      </div>
    </main>
  );
}
