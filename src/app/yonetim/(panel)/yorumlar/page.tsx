import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { siparisler, urunler, yorumlar } from "@/db/schema";
import { tarihSaat } from "@/lib/bicim";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { yorumDurum, yorumSil, yorumYanitla } from "./eylemler";

export const metadata: Metadata = { title: "Yorumlar" };

const SEKMELER = [["bekliyor", "Onay bekleyen"], ["yayinda", "Yayında"], ["gizli", "Gizli"], ["tumu", "Tümü"]] as const;

export default async function YorumlarSayfasi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const sekme = ((Array.isArray(sp.durum) ? sp.durum[0] : sp.durum) ?? "bekliyor") as (typeof SEKMELER)[number][0];
  const tum = await (await db())
    .select({ y: yorumlar, urun: urunler.ad, slug: urunler.slug, siparisNo: siparisler.no })
    .from(yorumlar)
    .leftJoin(urunler, eq(yorumlar.urunId, urunler.id))
    .leftJoin(siparisler, eq(yorumlar.siparisId, siparisler.id))
    .orderBy(desc(yorumlar.olusturma));
  const liste = tum.filter((r) => sekme === "tumu" || r.y.durum === sekme);
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Yorumlar</h1>
          <p className="y-sub">Teslim edilen siparişlerin sahipleri ürünü değerlendirebilir. Yorumlar siz onaylayınca ürün sayfasında görünür.</p>
        </div>
      </div>
      <Mesaj sp={sp} basari={{ yayinda: "Yorum yayına alındı.", gizli: "Yorum gizlendi.", yanit: "Yanıtınız kaydedildi.", silindi: "Yorum silindi." }} />
      <nav className="y-tab-row" aria-label="Durum">
        {SEKMELER.map(([k, ad]) => (
          <Link key={k} className={sekme === k ? "y-on" : ""} href={`/yonetim/yorumlar?durum=${k}`}>
            {ad} <small>{k === "tumu" ? tum.length : tum.filter((r) => r.y.durum === k).length}</small>
          </Link>
        ))}
      </nav>
      {liste.length === 0 && <p className="y-card y-mut">Bu bölümde yorum yok.</p>}
      {liste.map(({ y, urun, slug, siparisNo }) => (
        <article key={y.id} className="y-card">
          <div className="y-row y-sp">
            <div>
              <span style={{ color: "#B7791F", letterSpacing: 2 }} aria-label={`${y.puan} yıldız`}>{"★".repeat(y.puan)}<span style={{ color: "#CFD3CC" }}>{"★".repeat(5 - y.puan)}</span></span>
              <b style={{ marginLeft: 8 }}>{y.ad}</b>
              <span className="y-sm y-mut" style={{ marginLeft: 8 }}>{tarihSaat(y.olusturma)}</span>
            </div>
            <span className="y-row" style={{ gap: 6 }}>
              {y.ornek && <span className="y-b y-b-sari">Örnek veri</span>}
              {siparisNo && <Link className="y-b y-b-gri" href={`/yonetim/siparisler/${siparisNo}`}>Sipariş #{siparisNo}</Link>}
              <span className={`y-b ${y.durum === "yayinda" ? "y-b-yesil" : y.durum === "bekliyor" ? "y-b-mor" : "y-b-gri"}`}>{{ yayinda: "Yayında", bekliyor: "Onay bekliyor", gizli: "Gizli" }[y.durum]}</span>
            </span>
          </div>
          {urun && <p className="y-sm">Ürün: {slug ? <Link href={`/urun/${slug}`} target="_blank">{urun} ↗</Link> : urun}</p>}
          <p style={{ whiteSpace: "pre-line" }}>{y.metin}</p>
          <div className="y-kbtn">
            <form action={yorumDurum}>
              <input type="hidden" name="id" value={y.id} />
              <input type="hidden" name="sekme" value={sekme} />
              <input type="hidden" name="durum" value={y.durum === "yayinda" ? "gizli" : "yayinda"} />
              <button className={`y-btn y-s ${y.durum === "yayinda" ? "" : "y-pri"}`}>{y.durum === "yayinda" ? "Gizle" : "Yayınla"}</button>
            </form>
            <details className="y-ac" open={!!y.yanit}>
              <summary>{y.yanit ? "Yanıtınız" : "Yanıt yaz"}</summary>
              <div>
                <form action={yorumYanitla} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="hidden" name="id" value={y.id} />
                  <input type="hidden" name="sekme" value={sekme} />
                  <textarea className="y-inp" name="yanit" aria-label="Yanıt" defaultValue={y.yanit ?? ""} placeholder="Teşekkür ederiz! …" style={{ minHeight: 70 }} />
                  <div><button className="y-btn y-s">Yanıtı kaydet</button></div>
                </form>
              </div>
            </details>
            <details className="y-ac y-sil">
              <summary>Sil</summary>
              <div>
                <form action={yorumSil}>
                  <input type="hidden" name="id" value={y.id} />
                  <input type="hidden" name="sekme" value={sekme} />
                  <button className="y-btn y-s y-redf">Yorumu kalıcı olarak sil</button>
                </form>
              </div>
            </details>
          </div>
        </article>
      ))}
    </>
  );
}
