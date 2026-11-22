import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { kategoriler, siparisKalemleri, urunler } from "@/db/schema";
import { magazaAyarlari } from "@/lib/veri";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../../Mesaj";
import { tlYaz } from "../../../ortak";
import { UrunFormu } from "../UrunFormu";
import { urunKopyala, urunSil } from "../eylemler";
import type { UrunGirdisi } from "../eylemler";

export const metadata: Metadata = { title: "Ürün düzenle" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const BOS: UrunGirdisi = {
  id: null, ad: "", slug: "", aciklama: "", kategoriId: null, durum: "taslak", fiyat: "", indirimliFiyat: "", malzeme: "", uretimSuresi: "2–3 iş günü",
  hazirlikGunMin: 2, hazirlikGunMax: 3, stokTipi: "kapasite", stok: 0, olculer: "", bakim: "", etiketler: "", gorseller: [], secenekler: [], varyantlar: {},
  kisisellestirme: [], yapimSeti: false, rozet: "", renk: "#EDE6DA", seoBaslik: "", seoAciklama: "",
};

export default async function UrunDuzenle({ params, searchParams }: Props) {
  await yoneticiGerekli();
  const { id } = await params;
  const sp = await searchParams;
  const d = await db();
  const yeni = id === "yeni";
  const [u] = yeni ? [] : await d.select().from(urunler).where(and(eq(urunler.id, Number(id) || 0), isNull(urunler.silinme)));
  if (!yeni && !u) notFound();
  const [kats, ayar, malz, satis] = await Promise.all([
    d.select({ id: kategoriler.id, ad: kategoriler.ad }).from(kategoriler).orderBy(asc(kategoriler.sira)),
    magazaAyarlari(),
    d.selectDistinct({ m: urunler.malzeme }).from(urunler),
    u ? d.select({ adet: sql<number>`coalesce(sum(${siparisKalemleri.adet}), 0)::int` }).from(siparisKalemleri).where(eq(siparisKalemleri.urunId, u.id)) : Promise.resolve([{ adet: 0 }]),
  ]);

  const baslangic: UrunGirdisi = u
    ? {
        id: u.id, ad: u.ad, slug: u.slug, aciklama: u.aciklama, kategoriId: u.kategoriId, durum: u.durum, fiyat: tlYaz(u.fiyat), indirimliFiyat: tlYaz(u.indirimliFiyat),
        malzeme: u.malzeme, uretimSuresi: u.uretimSuresi, hazirlikGunMin: u.hazirlikGunMin, hazirlikGunMax: u.hazirlikGunMax, stokTipi: u.stokTipi, stok: u.stok,
        olculer: u.olculer, bakim: u.bakim, etiketler: u.etiketler.join(", "), gorseller: u.gorseller,
        secenekler: u.secenekler.map((s) => ({ ad: s.ad, degerler: s.degerler.map((x) => ({ ad: x.ad, fark: x.fark ? tlYaz(x.fark) : "" })) })),
        varyantlar: Object.fromEntries(Object.entries(u.varyantlar).map(([k, a]) => [k, { aktif: a.aktif !== false, fark: a.fark !== undefined ? tlYaz(a.fark) : "" }])),
        kisisellestirme: u.kisisellestirme.map((a) => ({ ...a, ucret: a.ucret ? tlYaz(a.ucret) : "" })),
        yapimSeti: u.yapimSeti, rozet: u.rozet ?? "", renk: u.renk, seoBaslik: u.seoBaslik ?? "", seoAciklama: u.seoAciklama ?? "",
      }
    : BOS;

  return (
    <>
      <div className="y-top">
        <div>
          <Link className="y-back" href="/yonetim/urunler">← Ürünler</Link>
          <h1 style={{ marginTop: 6 }}>{u ? u.ad : "Yeni ürün"}</h1>
          {u && <p className="y-sub">Toplam {satis[0]?.adet ?? 0} adet satıldı</p>}
        </div>
      </div>
      <Mesaj sp={sp} basari={{ kaydedildi: "Ürün kaydedildi. Mağazada hemen güncellenir.", kopyalandi: "Ürün kopyalandı. Kopya taslak olarak oluşturuldu; fotoğrafları ekleyip yayına alabilirsiniz." }} />
      <UrunFormu
        key={u ? `${u.id}-${u.slug}-${String(sp.ok ?? "")}` : "yeni"}
        baslangic={baslangic}
        kategoriler={kats}
        fontlar={ayar.fontlar.map((f) => f.ad)}
        malzemeler={[...new Set(malz.map((m) => m.m).filter(Boolean))]}
      />
      {u && (
        <section className="y-card" aria-labelledby="u-diger" style={{ marginTop: 8 }}>
          <h2 id="u-diger">Diğer işlemler</h2>
          <div className="y-kbtn">
            <form action={urunKopyala}>
              <input type="hidden" name="id" value={u.id} />
              <button className="y-btn">Kopyasını oluştur</button>
            </form>
            <details className="y-ac y-sil">
              <summary>Ürünü sil</summary>
              <div>
                <p className="y-sm">Ürün mağazadan kalkar. Geçmiş siparişlerdeki kayıtlar ve raporlar korunur.</p>
                <form action={urunSil}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="y-btn y-redf">“{u.ad}” ürününü sil</button>
                </form>
              </div>
            </details>
          </div>
        </section>
      )}
    </>
  );
}
