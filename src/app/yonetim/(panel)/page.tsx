import Link from "next/link";
import { and, count, eq, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { siparisler, teklifler, urunler, yorumlar, ziyaretOzet } from "@/db/schema";
import { gunAnahtari, para } from "@/lib/bicim";
import { aylikRapor } from "@/lib/rapor";
import { hazirlikDurumu } from "@/lib/hazirlik";
import { yoneticiGerekli } from "@/lib/yetki";

const sayi = new Intl.NumberFormat("tr-TR");

export default async function GenelBakis() {
  const y = await yoneticiGerekli();
  const d = await db();
  const say = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const bugun = gunAnahtari();
  const [hazirlik, rapor, odeme, tasarim, duzeltme, kargo, teklif, yorum, azStok, [ziyaretBugun], kategorisiz] = await Promise.all([
    hazirlikDurumu(),
    aylikRapor(bugun.slice(0, 7)),
    say(d.select({ n: count() }).from(siparisler).where(eq(siparisler.durum, "odeme"))),
    say(d.select({ n: count() }).from(siparisler).where(and(eq(siparisler.durum, "yeni"), eq(siparisler.onayDurumu, "hazirlaniyor")))),
    say(d.select({ n: count() }).from(siparisler).where(and(inArray(siparisler.durum, ["yeni", "onay"]), eq(siparisler.onayDurumu, "duzeltme")))),
    say(d.select({ n: count() }).from(siparisler).where(eq(siparisler.durum, "uretim"))),
    say(d.select({ n: count() }).from(teklifler).where(eq(teklifler.durum, "yeni"))),
    say(d.select({ n: count() }).from(yorumlar).where(eq(yorumlar.durum, "bekliyor"))),
    d.select({ id: urunler.id, ad: urunler.ad, stok: urunler.stok }).from(urunler).where(and(eq(urunler.durum, "yayinda"), eq(urunler.stokTipi, "adet"), lte(urunler.stok, 3), isNull(urunler.silinme))),
    d.select().from(ziyaretOzet).where(eq(ziyaretOzet.gun, bugun)),
    say(d.select({ n: count() }).from(urunler).where(and(isNull(urunler.kategoriId), isNull(urunler.silinme)))),
  ]);
  const isler = [
    { n: hazirlik.eksik, ad: "madde yayından önce tamamlanmalı (Yayına hazırlık)", href: "/yonetim/hazirlik" },
    { n: odeme, ad: "havale ödemesi kontrol bekliyor", href: "/yonetim/siparisler?durum=odeme" },
    { n: duzeltme, ad: "siparişte müşteri tasarım düzeltmesi istedi", href: "/yonetim/siparisler?durum=onay" },
    { n: tasarim, ad: "siparişin tasarımı hazırlanıp onaya gönderilecek", href: "/yonetim/siparisler?durum=yeni" },
    { n: kargo, ad: "sipariş üretimde, kargoya verilecek", href: "/yonetim/siparisler?durum=uretim" },
    { n: teklif, ad: "yeni teklif talebi", href: "/yonetim/teklifler?durum=yeni" },
    { n: yorum, ad: "yorum onay bekliyor", href: "/yonetim/yorumlar" },
    { n: kategorisiz, ad: "ürün hiçbir kategoride değil", href: "/yonetim/urunler?kategori=yok" },
  ].filter((i) => i.n > 0);
  const o = rapor.ozet;

  return (
    <>
      <div className="y-top">
        <div>
          <h1>Hoş geldiniz, {y.ad.split(" ")[0]}</h1>
          <p className="y-sub">Bugünün ve bu ayın özeti.</p>
        </div>
        <Link className="y-btn" href="/yonetim/raporlar">Tüm raporlar →</Link>
      </div>
      <div className="y-kpi">
        <div className="y-card"><span className="y-sm y-mut">Bu ay ciro</span><span className="y-deg-v">{para(o.ciro)}</span><span className="y-sm y-mut">{o.siparis} sipariş · {o.adet} ürün</span></div>
        <div className="y-card"><span className="y-sm y-mut">Bugün ziyaretçi</span><span className="y-deg-v">{sayi.format(ziyaretBugun?.ziyaretci ?? 0)}</span><span className="y-sm y-mut">{sayi.format(ziyaretBugun?.goruntuleme ?? 0)} sayfa görüntüleme</span></div>
        <div className="y-card"><span className="y-sm y-mut">Bu ay ziyaretçi</span><span className="y-deg-v">{sayi.format(o.ziyaretci)}</span><span className="y-sm y-mut">{o.donusum === null ? "—" : `%${o.donusum.toFixed(1).replace(".", ",")} satışa döndü`}</span></div>
      </div>
      <div className="y-split">
        <section className="y-card y-wide" aria-labelledby="h-is">
          <h2 id="h-is">Yapılacaklar</h2>
          {isler.length === 0 ? (
            <p className="y-mut">Bekleyen iş yok.</p>
          ) : (
            <ul className="y-list">
              {isler.map((i) => (
                <li key={i.href + i.ad}>
                  <span className="y-cnt" style={{ fontSize: 14, padding: "2px 10px" }}>{i.n}</span>
                  <Link href={i.href} style={{ flex: 1 }}>{i.ad} →</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="y-card y-narrow" aria-labelledby="h-cok">
          <h2 id="h-cok">Bu ay en çok satanlar</h2>
          {rapor.urunler.length === 0 ? (
            <p className="y-mut y-sm">Bu ay henüz satış yok.</p>
          ) : (
            <ul className="y-list">
              {rapor.urunler.slice(0, 5).map((u) => (
                <li key={`${u.urunId ?? u.ad}`}><span style={{ flex: 1, minWidth: 0 }}>{u.ad}</span><b className="y-num">{u.adet} adet</b></li>
              ))}
            </ul>
          )}
          {azStok.length > 0 && (
            <p className="y-note y-sm"><b>Stoğu azalan:</b> {azStok.map((u) => `${u.ad} (${u.stok})`).join(", ")}</p>
          )}
        </section>
      </div>
    </>
  );
}
