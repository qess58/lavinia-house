import type { Metadata } from "next";
import Link from "next/link";
import { magazaAyarlari, studyoMalzemeleri } from "@/lib/veri";
import { Studyo } from "@/components/Studyo";

export const metadata: Metadata = {
  title: "Kendin tasarla",
  description: "Malzemeyi, ölçüyü ve yazıyı seçin; fiyatı anında görün. Lazerle keselim, onayınıza sunalım.",
};

export default async function KendinTasarla() {
  const [malzemeler, ayarlar] = await Promise.all([studyoMalzemeleri(), magazaAyarlari()]);
  return (
    <main className="wrap mainy">
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        <span>Kendin tasarla</span>
      </nav>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>Kendin tasarla</h1>
          <p className="mut" style={{ marginTop: 6, maxWidth: 640 }}>Malzemeyi, ölçüyü ve yazıyı seçin; fiyatı anında görün. Siparişten sonra ustalarımız tasarımı kontrol edip üretimden önce onayınıza sunar.</p>
        </div>
        <Link className="btn s" href="/teklif">Kendi dosyam var</Link>
      </div>
      <Studyo malzemeler={malzemeler} fontlar={ayarlar.fontlar} whatsapp={ayarlar.whatsapp} />
    </main>
  );
}
