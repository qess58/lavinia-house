import type { Metadata } from "next";
import Link from "next/link";
import { hazirlikDurumu, type Durum } from "@/lib/hazirlik";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { ornekleriTemizle } from "./eylemler";

export const metadata: Metadata = { title: "Yayına hazırlık" };

const ROZET: Record<Durum, [string, string, string]> = {
  tamam: ["✓", "Tamam", "y-b-yesil"],
  eksik: ["!", "Eksik", "y-b-kirmizi"],
  uyari: ["•", "Önerilir", "y-b-sari"],
  bilgi: ["i", "Bilgi", "y-b-gri"],
};

export default async function Hazirlik({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const { gruplar, eksik, uyari, ornekTemizlenebilir: ornekVar } = await hazirlikDurumu();
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Yayına hazırlık</h1>
          <p className="y-sub">Siteyi yayına almadan önce tamamlanması gerekenler. Her madde tamamlandıkça kendiliğinden yeşile döner.</p>
        </div>
      </div>
      <Mesaj sp={sp} basari={{ temizlendi: "Örnek yorumlar ve örnek sipariş silindi." }} />
      <div className="y-kpi">
        <div className="y-card"><span className="y-sm y-mut">Eksik</span><span className="y-deg-v" style={{ color: eksik ? "#B91C1C" : "#166534" }}>{eksik}</span><span className="y-sm y-mut">yayından önce şart</span></div>
        <div className="y-card"><span className="y-sm y-mut">Önerilen</span><span className="y-deg-v">{uyari}</span><span className="y-sm y-mut">güven ve satış için</span></div>
      </div>
      {gruplar.map((g) => (
        <section key={g.baslik} className="y-card" aria-labelledby={`h-${g.baslik}`}>
          <div>
            <h2 id={`h-${g.baslik}`}>{g.baslik}</h2>
            {g.not && <p className="y-sm y-mut" style={{ marginTop: 4 }}>{g.not}</p>}
          </div>
          <ul className="y-list">
            {g.maddeler.map((m) => {
              const [isaret, ad, sinif] = ROZET[m.durum];
              return (
                <li key={m.ad} style={{ alignItems: "flex-start" }}>
                  <span className={`y-b ${sinif}`} style={{ minWidth: 92, justifyContent: "center" }} aria-label={ad}>{isaret} {ad}</span>
                  <span style={{ flex: "1 1 280px", minWidth: 0 }}>
                    <b>{m.ad}</b>
                    <span className="y-sm" style={{ display: "block", color: m.durum === "tamam" ? "#5B635E" : "#3D4541" }}>{m.aciklama}</span>
                  </span>
                  {m.link && <Link className="y-btn y-s" href={m.link}>{m.linkAd ?? "Düzelt"}</Link>}
                </li>
              );
            })}
          </ul>
          {g.baslik === "Ürünler" && ornekVar && (
            <form action={ornekleriTemizle}>
              <button className="y-btn y-s">Örnek yorumları ve örnek siparişi sil</button>
            </form>
          )}
        </section>
      ))}
    </>
  );
}
