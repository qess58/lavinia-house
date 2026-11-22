// Sunucu tarafı veri okuma fonksiyonları (sayfalar ve API'ler buradan okur).
import { and, asc, avg, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ayarlar, kategoriler, kuponlar, malzemeler, siparisKalemleri, siparisler, siparisOlaylari, urunler, yorumlar } from "@/db/schema";
import { VARSAYILAN_AYARLAR, type MagazaAyarlari } from "./tipler";
import { satisFiyati } from "./fiyat";
import { kucukHarf, tahminiKargo } from "./bicim";

export async function magazaAyarlari(): Promise<MagazaAyarlari> {
  const d = await db();
  const [r] = await d.select().from(ayarlar).where(eq(ayarlar.anahtar, "magaza"));
  return { ...VARSAYILAN_AYARLAR, ...((r?.deger as Partial<MagazaAyarlari>) ?? {}) };
}

export async function kategoriListesi() {
  const d = await db();
  const kats = await d.select().from(kategoriler).orderBy(asc(kategoriler.sira));
  const sayilar = await d
    .select({ kategoriId: urunler.kategoriId, n: count() })
    .from(urunler)
    .where(and(eq(urunler.durum, "yayinda"), isNull(urunler.silinme)))
    .groupBy(urunler.kategoriId);
  const n = Object.fromEntries(sayilar.map((s) => [s.kategoriId, s.n]));
  return kats.map((k) => ({ ...k, urunSayisi: n[k.id] ?? 0 }));
}

/** Mağazada gösterilecek kategoriler (yönetim panelindeki sıraya göre). */
export async function magazaKategorileri() {
  const liste = await kategoriListesi();
  return {
    /** "Menüde göster" açık olanlar: üst menü, alt bilgi, ana sayfa. */
    menu: liste.filter((k) => k.menude),
    /** İçinde yayında ürün olanlar: ürün listesi seçim kutusu ve arama. */
    dolu: liste.filter((k) => k.urunSayisi > 0),
  };
}

export type UrunKartVerisi = Awaited<ReturnType<typeof yayindakiUrunler>>[number];

export async function yayindakiUrunler() {
  const d = await db();
  const [liste, kats, puanlar, ayar] = await Promise.all([
    d.select().from(urunler).where(and(eq(urunler.durum, "yayinda"), isNull(urunler.silinme))).orderBy(asc(urunler.sira)),
    d.select().from(kategoriler),
    d.select({ urunId: yorumlar.urunId, ort: avg(yorumlar.puan), n: count() }).from(yorumlar).where(eq(yorumlar.durum, "yayinda")).groupBy(yorumlar.urunId),
    magazaAyarlari(),
  ]);
  const kat = Object.fromEntries(kats.map((k) => [k.id, k]));
  const puan = Object.fromEntries(puanlar.map((p) => [p.urunId, p]));
  return liste.map((u) => {
    const p = puan[u.id];
    const kisisel = u.kisisellestirme.length > 0;
    const stokYok = u.stokTipi === "adet" && u.stok <= 0;
    return {
      id: u.id,
      slug: u.slug,
      ad: u.ad,
      fiyat: u.fiyat,
      indirimliFiyat: u.indirimliFiyat,
      satis: satisFiyati(u),
      rozet: u.rozet,
      renk: u.renk,
      gorsel: u.gorseller[0] ?? null,
      malzeme: u.malzeme,
      kategoriSlug: u.kategoriId ? kat[u.kategoriId]?.slug ?? "" : "",
      kategoriAd: u.kategoriId ? kat[u.kategoriId]?.ad ?? "" : "",
      puan: p ? Math.round(Number(p.ort) * 10) / 10 : null,
      yorumSayisi: p?.n ?? 0,
      kisisel,
      yapimSeti: u.yapimSeti,
      secenekVar: u.secenekler.length > 0,
      hizli: u.hazirlikGunMax <= 2,
      stokYok,
      sira: u.sira,
      yeni: u.rozet === "Yeni",
      ucretsizKargo: satisFiyati(u) >= ayar.ucretsizKargoLimiti,
      kargoYazi: stokYok ? "Şu an tükendi" : kisisel ? `Onaydan sonra ${u.uretimSuresi}` : `${tahminiKargo(u.hazirlikGunMin, u.hazirlikGunMax, false)} kargoda`,
      aramaMetni: kucukHarf([u.ad, u.malzeme, ...(u.etiketler ?? []), u.kategoriId ? kat[u.kategoriId]?.ad ?? "" : ""].join(" ")),
    };
  });
}

export async function urunDetayi(slug: string) {
  const d = await db();
  const [u] = await d.select().from(urunler).where(and(eq(urunler.slug, slug), isNull(urunler.silinme)));
  if (!u || u.durum === "taslak") return null;
  const [kat] = u.kategoriId ? await d.select().from(kategoriler).where(eq(kategoriler.id, u.kategoriId)) : [];
  const yorum = await d
    .select()
    .from(yorumlar)
    .where(and(eq(yorumlar.urunId, u.id), eq(yorumlar.durum, "yayinda")))
    .orderBy(desc(yorumlar.olusturma));
  return { urun: u, kategori: kat ?? null, yorumlar: yorum };
}

export async function studyoMalzemeleri() {
  const d = await db();
  return d.select().from(malzemeler).where(eq(malzemeler.aktif, true)).orderBy(asc(malzemeler.sira));
}

export async function kuponBul(kod: string) {
  const d = await db();
  const [k] = await d.select().from(kuponlar).where(eq(kuponlar.kod, kod.trim().toUpperCase()));
  if (!k || !k.aktif) return { hata: "Bu kod geçersiz ya da süresi dolmuş." as const };
  if (k.sonKullanma && k.sonKullanma.getTime() < Date.now()) return { hata: "Bu kodun süresi dolmuş." as const };
  if (k.kullanimSiniri !== null && k.kullanim >= k.kullanimSiniri) return { hata: "Bu kodun kullanım sınırı dolmuş." as const };
  return { kupon: { kod: k.kod, tur: k.tur, deger: k.deger, altLimit: k.altLimit } };
}

export async function siparisGetir(no: number, token: string) {
  const d = await db();
  const [s] = await d.select().from(siparisler).where(eq(siparisler.no, no));
  if (!s || s.token !== token) return null;
  const [kalemler, olaylar] = await Promise.all([
    d.select().from(siparisKalemleri).where(eq(siparisKalemleri.siparisId, s.id)),
    d.select().from(siparisOlaylari).where(and(eq(siparisOlaylari.siparisId, s.id), eq(siparisOlaylari.musteriyeGorunur, true))).orderBy(asc(siparisOlaylari.olusturma)),
  ]);
  return { siparis: s, kalemler, olaylar };
}

export async function siparisBulEposta(no: number, eposta: string) {
  const d = await db();
  const [s] = await d.select().from(siparisler).where(eq(siparisler.no, no));
  if (!s || kucukHarf(s.musteri.eposta.trim()) !== kucukHarf(eposta.trim())) return null;
  return s;
}
