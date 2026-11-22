// Panel raporları: aylık satış, ürün bazında adetler, ziyaretçi sayıları.
import { and, gte, inArray, like, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { siparisKalemleri, siparisler, urunler, ziyaretDagilim, ziyaretOzet, ziyaretSayfa } from "@/db/schema";
import { ayAraligi, gunAnahtari } from "./bicim";

/** Ciroya sayılan siparişler: ödemesi alınmış, iptal / iade edilmemiş. */
const SATIS_DISI = new Set(["odeme", "iptal", "iade"]);

export function oncekiAy(ay: string, kac = 1) {
  const [y, m] = ay.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - kac, 1));
  return d.toISOString().slice(0, 7);
}

export async function aylikRapor(ay: string) {
  const d = await db();
  const onceki = oncekiAy(ay);
  const { bas, son, gunSayisi } = ayAraligi(ay);
  const oBas = ayAraligi(onceki).bas;
  const yilBas = ayAraligi(oncekiAy(ay, 11)).bas;

  const tumSiparis = await d.select().from(siparisler).where(and(gte(siparisler.olusturma, yilBas), lt(siparisler.olusturma, son)));
  const satis = tumSiparis.filter((s) => !SATIS_DISI.has(s.durum));
  const buAy = satis.filter((s) => s.olusturma >= bas);
  const gecenAy = satis.filter((s) => s.olusturma >= oBas && s.olusturma < bas);
  const iptal = tumSiparis.filter((s) => s.olusturma >= bas && (s.durum === "iptal" || s.durum === "iade")).length;
  const odemeBekleyen = tumSiparis.filter((s) => s.olusturma >= bas && s.durum === "odeme").length;

  const kalemler = buAy.length || gecenAy.length ? await d.select().from(siparisKalemleri).where(inArray(siparisKalemleri.siparisId, [...buAy, ...gecenAy].map((s) => s.id))) : [];
  const buAyIdleri = new Set(buAy.map((s) => s.id));
  const adetSay = (idler: Set<number>) => kalemler.filter((k) => idler.has(k.siparisId)).reduce((t, k) => t + k.adet, 0);

  // Ürün bazında satış
  const urunMap = new Map<string, { ad: string; urunId: number | null; adet: number; ciro: number; siparis: Set<number> }>();
  for (const k of kalemler.filter((x) => buAyIdleri.has(x.siparisId))) {
    const anahtar = k.urunId ? `u${k.urunId}` : `s:${k.ad}`;
    const v = urunMap.get(anahtar) ?? { ad: k.ad, urunId: k.urunId, adet: 0, ciro: 0, siparis: new Set<number>() };
    v.adet += k.adet;
    v.ciro += k.birimFiyat * k.adet;
    v.siparis.add(k.siparisId);
    urunMap.set(anahtar, v);
  }

  // Günlük seriler
  const gunler = Array.from({ length: gunSayisi }, (_, i) => `${ay}-${String(i + 1).padStart(2, "0")}`);
  const ciroGun = new Map<string, { ciro: number; adet: number }>();
  for (const s of buAy) {
    const g = gunAnahtari(s.olusturma);
    const v = ciroGun.get(g) ?? { ciro: 0, adet: 0 };
    v.ciro += s.toplam;
    v.adet += 1;
    ciroGun.set(g, v);
  }

  const [ozetler, dagilim, sayfalar, urunAdlari] = await Promise.all([
    d.select().from(ziyaretOzet).where(and(gte(ziyaretOzet.gun, gunAnahtari(yilBas)), lt(ziyaretOzet.gun, gunAnahtari(son)))),
    d
      .select({ tur: ziyaretDagilim.tur, deger: ziyaretDagilim.deger, n: sql<number>`sum(${ziyaretDagilim.ziyaretci})::int` })
      .from(ziyaretDagilim)
      .where(and(gte(ziyaretDagilim.gun, `${ay}-01`), lt(ziyaretDagilim.gun, gunAnahtari(son))))
      .groupBy(ziyaretDagilim.tur, ziyaretDagilim.deger),
    d
      .select({ yol: ziyaretSayfa.yol, n: sql<number>`sum(${ziyaretSayfa.goruntuleme})::int` })
      .from(ziyaretSayfa)
      .where(and(gte(ziyaretSayfa.gun, `${ay}-01`), lt(ziyaretSayfa.gun, gunAnahtari(son)), like(ziyaretSayfa.yol, "/urun/%")))
      .groupBy(ziyaretSayfa.yol),
    d.select({ id: urunler.id, slug: urunler.slug, ad: urunler.ad }).from(urunler),
  ]);
  const ozetGun = new Map(ozetler.map((o) => [o.gun, o]));
  const ayToplam = (a: string) => ozetler.filter((o) => o.gun.startsWith(a)).reduce((t, o) => ({ ziyaretci: t.ziyaretci + o.ziyaretci, goruntuleme: t.goruntuleme + o.goruntuleme }), { ziyaretci: 0, goruntuleme: 0 });
  const zBu = ayToplam(ay);
  const zOnceki = ayToplam(onceki);

  const slugAd = new Map(urunAdlari.map((u) => [u.slug, u]));
  const satilanAdet = new Map<number, number>();
  for (const v of urunMap.values()) if (v.urunId) satilanAdet.set(v.urunId, v.adet);
  const bakilan = sayfalar
    .map((s) => {
      const u = slugAd.get(s.yol.replace("/urun/", ""));
      return u ? { ad: u.ad, id: u.id, goruntuleme: s.n, satilan: satilanAdet.get(u.id) ?? 0 } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.goruntuleme - a.goruntuleme)
    .slice(0, 10);

  const aylar = Array.from({ length: 12 }, (_, i) => oncekiAy(ay, 11 - i));
  const aylik = aylar.map((a) => {
    const s = satis.filter((x) => gunAnahtari(x.olusturma).startsWith(a));
    return { ay: a, ciro: s.reduce((t, x) => t + x.toplam, 0), siparis: s.length, ziyaretci: ayToplam(a).ziyaretci };
  });

  const ciro = buAy.reduce((t, s) => t + s.toplam, 0);
  const oCiro = gecenAy.reduce((t, s) => t + s.toplam, 0);
  return {
    ay,
    onceki,
    ozet: {
      ciro,
      oCiro,
      siparis: buAy.length,
      oSiparis: gecenAy.length,
      adet: adetSay(buAyIdleri),
      oAdet: adetSay(new Set(gecenAy.map((s) => s.id))),
      ortalama: buAy.length ? Math.round(ciro / buAy.length) : 0,
      oOrtalama: gecenAy.length ? Math.round(oCiro / gecenAy.length) : 0,
      ziyaretci: zBu.ziyaretci,
      oZiyaretci: zOnceki.ziyaretci,
      goruntuleme: zBu.goruntuleme,
      donusum: zBu.ziyaretci ? (buAy.length / zBu.ziyaretci) * 100 : null,
      oDonusum: zOnceki.ziyaretci ? (gecenAy.length / zOnceki.ziyaretci) * 100 : null,
      iptal,
      odemeBekleyen,
    },
    urunler: [...urunMap.values()].map(({ siparis, ...v }) => ({ ...v, siparis: siparis.size })).sort((a, b) => b.adet - a.adet || b.ciro - a.ciro),
    gunluk: gunler.map((g) => ({ gun: g, ciro: ciroGun.get(g)?.ciro ?? 0, siparis: ciroGun.get(g)?.adet ?? 0, ziyaretci: ozetGun.get(g)?.ziyaretci ?? 0, goruntuleme: ozetGun.get(g)?.goruntuleme ?? 0 })),
    kaynaklar: dagilim.filter((x) => x.tur === "kaynak").sort((a, b) => b.n - a.n),
    cihazlar: dagilim.filter((x) => x.tur === "cihaz").sort((a, b) => b.n - a.n),
    bakilan,
    aylik,
  };
}
