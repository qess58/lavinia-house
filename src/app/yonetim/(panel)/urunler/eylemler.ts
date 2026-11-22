"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kategoriler, urunler } from "@/db/schema";
import { slugify } from "@/lib/bicim";
import { gorselSil } from "@/lib/medya";
import { yoneticiGerekli } from "@/lib/yetki";
import type { KisiAlan, Secenek, VaryantAyari } from "@/lib/tipler";
import { kombinasyonlar } from "@/lib/varyant";
import { kurusa } from "../../ortak";

const yenile = () => revalidatePath("/", "layout");

const Para = z.string().max(20);
const Sema = z.object({
  id: z.number().int().positive().nullable(),
  ad: z.string().trim().min(2, "Ürün adı en az 2 karakter olmalı.").max(120),
  slug: z.string().trim().max(120),
  aciklama: z.string().max(8000),
  kategoriId: z.number().int().positive().nullable(),
  durum: z.enum(["yayinda", "taslak", "gizli"]),
  fiyat: Para,
  indirimliFiyat: Para,
  malzeme: z.string().trim().max(60),
  uretimSuresi: z.string().trim().max(60),
  hazirlikGunMin: z.number().int().min(0).max(60),
  hazirlikGunMax: z.number().int().min(0).max(90),
  stokTipi: z.enum(["adet", "kapasite"]),
  stok: z.number().int().min(0).max(100000),
  olculer: z.string().max(300),
  bakim: z.string().max(1000),
  etiketler: z.string().max(400),
  gorseller: z.array(z.object({ yol: z.string().regex(/^\/medya\/urun\/[a-f0-9]{20}\.(webp|jpg|png)$/), alt: z.string().max(160) })).max(12),
  secenekler: z
    .array(z.object({ ad: z.string().trim().min(1, "Seçenek adı boş olamaz.").max(40), degerler: z.array(z.object({ ad: z.string().trim().min(1, "Seçenek değeri boş olamaz.").max(60), fark: Para })).min(1, "Her seçeneğin en az bir değeri olmalı.").max(30) }))
    .max(5),
  varyantlar: z.record(z.string(), z.object({ aktif: z.boolean(), fark: Para })),
  kisisellestirme: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_-]{1,30}$/),
        tip: z.enum(["metin", "font", "renk", "dosya"]),
        baslik: z.string().trim().min(1, "Kişiselleştirme alanının başlığı boş olamaz.").max(60),
        zorunlu: z.boolean(),
        ucret: Para,
        sinir: z.number().int().min(0).max(500).optional(),
        ornek: z.string().max(80).optional(),
        fontlar: z.array(z.string().max(60)).max(20).optional(),
        renkler: z.array(z.object({ ad: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(20).optional(),
      }),
    )
    .max(10),
  yapimSeti: z.boolean(),
  rozet: z.string().trim().max(30),
  renk: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  seoBaslik: z.string().trim().max(70),
  seoAciklama: z.string().trim().max(170),
});
export type UrunGirdisi = z.input<typeof Sema>;

async function bosSlug(taban: string, haricId: number | null) {
  const d = await db();
  const kok = taban || "urun";
  for (let i = 1; i < 200; i++) {
    const aday = i === 1 ? kok : `${kok}-${i}`;
    const [r] = await d.select({ id: urunler.id }).from(urunler).where(haricId ? and(eq(urunler.slug, aday), ne(urunler.id, haricId)) : eq(urunler.slug, aday));
    if (!r) return aday;
  }
  return `${kok}-${Date.now()}`;
}

export async function urunKaydet(girdi: UrunGirdisi): Promise<{ hatalar: string[] }> {
  await yoneticiGerekli();
  const s = Sema.safeParse(girdi);
  if (!s.success) return { hatalar: [...new Set(s.error.issues.map((i) => i.message.startsWith("Invalid") || i.message.startsWith("Too") ? `Geçersiz alan: ${i.path.join(" › ")}` : i.message))] };
  const v = s.data;
  const hatalar: string[] = [];

  const fiyat = kurusa(v.fiyat);
  if (fiyat === null || fiyat <= 0) hatalar.push("Fiyatı yazın (ör. 440).");
  const indirimli = v.indirimliFiyat.trim() ? kurusa(v.indirimliFiyat) : null;
  if (v.indirimliFiyat.trim() && indirimli === null) hatalar.push("İndirimli fiyat geçersiz.");
  if (indirimli !== null && fiyat !== null && indirimli >= fiyat) hatalar.push("İndirimli fiyat, normal fiyattan düşük olmalı.");
  if (v.hazirlikGunMax < v.hazirlikGunMin) hatalar.push("Hazırlık süresinde en çok gün, en az günden küçük olamaz.");
  if (v.kategoriId) {
    const [k] = await (await db()).select({ id: kategoriler.id }).from(kategoriler).where(eq(kategoriler.id, v.kategoriId));
    if (!k) hatalar.push("Seçilen kategori bulunamadı.");
  }
  const secenekAdlari = v.secenekler.map((x) => x.ad);
  if (new Set(secenekAdlari).size !== secenekAdlari.length) hatalar.push("Aynı adla iki seçenek olamaz.");
  for (const x of v.secenekler) if (new Set(x.degerler.map((d) => d.ad)).size !== x.degerler.length) hatalar.push(`“${x.ad}” seçeneğinde aynı değer iki kez yazılmış.`);
  const alanIdleri = v.kisisellestirme.map((a) => a.id);
  if (new Set(alanIdleri).size !== alanIdleri.length) hatalar.push("Kişiselleştirme alanlarının kodları farklı olmalı.");

  const fark = (x: string, ad: string) => {
    if (!x.trim()) return 0;
    const neg = x.trim().startsWith("-") || x.trim().startsWith("−");
    const k = kurusa(x.trim().replace(/^[-−+]/, ""));
    if (k === null) {
      hatalar.push(`${ad}: tutar geçersiz.`);
      return 0;
    }
    return neg ? -k : k;
  };
  const secenekler: Secenek[] = v.secenekler.map((x) => ({ ad: x.ad, degerler: x.degerler.map((d) => ({ ad: d.ad, fark: fark(d.fark, `${x.ad} / ${d.ad}`) })) }));
  // Yalnızca hâlâ geçerli kombinasyonların ayarları saklanır
  const gecerli = new Set(kombinasyonlar(secenekler));
  const varyantlar: Record<string, VaryantAyari> = {};
  for (const [k, a] of Object.entries(v.varyantlar)) {
    if (!gecerli.has(k)) continue;
    const ayar: VaryantAyari = {};
    if (!a.aktif) ayar.aktif = false;
    if (a.fark.trim()) ayar.fark = fark(a.fark, `Varyant ${k}`);
    if (Object.keys(ayar).length) varyantlar[k] = ayar;
  }
  const kisisellestirme: KisiAlan[] = v.kisisellestirme.map((a) => {
    const alan: KisiAlan = { id: a.id, tip: a.tip, baslik: a.baslik, zorunlu: a.zorunlu, ucret: fark(a.ucret, a.baslik) };
    if (a.tip === "metin") {
      if (a.sinir) alan.sinir = a.sinir;
      if (a.ornek) alan.ornek = a.ornek;
    }
    if (a.tip === "font") {
      alan.fontlar = a.fontlar ?? [];
      if (!alan.fontlar.length) hatalar.push(`“${a.baslik}” için en az bir yazı tipi seçin.`);
    }
    if (a.tip === "renk") {
      alan.renkler = a.renkler ?? [];
      if (!alan.renkler.length) hatalar.push(`“${a.baslik}” için en az bir renk ekleyin.`);
    }
    return alan;
  });
  if (hatalar.length) return { hatalar: [...new Set(hatalar)] };

  const slug = await bosSlug(slugify(v.slug || v.ad), v.id);
  const kayit = {
    ad: v.ad,
    slug,
    aciklama: v.aciklama.trim(),
    kategoriId: v.kategoriId,
    durum: v.durum,
    fiyat: fiyat!,
    indirimliFiyat: indirimli,
    malzeme: v.malzeme,
    uretimSuresi: v.uretimSuresi || "2–3 iş günü",
    hazirlikGunMin: v.hazirlikGunMin,
    hazirlikGunMax: v.hazirlikGunMax,
    stokTipi: v.stokTipi,
    stok: v.stok,
    olculer: v.olculer.trim(),
    bakim: v.bakim.trim(),
    etiketler: v.etiketler.split(",").map((e) => e.trim()).filter(Boolean).slice(0, 20),
    gorseller: v.gorseller,
    secenekler,
    varyantlar,
    kisisellestirme,
    yapimSeti: v.yapimSeti,
    rozet: v.rozet || null,
    renk: v.renk,
    seoBaslik: v.seoBaslik || null,
    seoAciklama: v.seoAciklama || null,
  };
  const d = await db();
  let id = v.id;
  if (id) {
    const [eski] = await d.select({ gorseller: urunler.gorseller }).from(urunler).where(eq(urunler.id, id));
    if (!eski) return { hatalar: ["Ürün bulunamadı."] };
    await d.update(urunler).set(kayit).where(eq(urunler.id, id));
    // Formdan çıkarılan fotoğrafları diskten de sil
    const kalan = new Set(v.gorseller.map((g) => g.yol));
    for (const g of eski.gorseller) if (!kalan.has(g.yol)) await gorselSil(g.yol);
  } else {
    const [y] = await d.insert(urunler).values({ ...kayit, sira: 999 }).returning({ id: urunler.id });
    id = y.id;
  }
  yenile();
  redirect(`/yonetim/urunler/${id}?ok=kaydedildi`);
}

export async function urunSil(f: FormData) {
  await yoneticiGerekli();
  const id = Number(f.get("id"));
  if (!Number.isInteger(id)) redirect("/yonetim/urunler?hata=genel");
  // Geçmiş siparişler bozulmasın diye ürün tamamen silinmez, gizlenir ve listeden kalkar.
  await (await db()).update(urunler).set({ silinme: new Date(), durum: "gizli" }).where(eq(urunler.id, id));
  yenile();
  redirect("/yonetim/urunler?ok=silindi");
}

export async function urunKopyala(f: FormData) {
  await yoneticiGerekli();
  const id = Number(f.get("id"));
  const d = await db();
  const [u] = await d.select().from(urunler).where(and(eq(urunler.id, id), isNull(urunler.silinme)));
  if (!u) redirect("/yonetim/urunler?hata=genel");
  const { id: _, olusturma: __, silinme: ___, ...kopya } = u;
  void _; void __; void ___;
  const [y] = await d
    .insert(urunler)
    .values({ ...kopya, ad: `${u.ad} (kopya)`, slug: await bosSlug(`${u.slug}-kopya`, null), durum: "taslak", gorseller: [] })
    .returning({ id: urunler.id });
  yenile();
  redirect(`/yonetim/urunler/${y.id}?ok=kopyalandi`);
}

export async function urunDurumDegistir(f: FormData) {
  await yoneticiGerekli();
  const id = Number(f.get("id"));
  const durum = String(f.get("durum"));
  if (!Number.isInteger(id) || !["yayinda", "taslak", "gizli"].includes(durum)) redirect("/yonetim/urunler?hata=genel");
  await (await db()).update(urunler).set({ durum: durum as "yayinda" | "taslak" | "gizli" }).where(eq(urunler.id, id));
  yenile();
  const geri = String(f.get("geri") ?? "");
  redirect(geri.startsWith("/yonetim/urunler") ? `${geri}${geri.includes("?") ? "&" : "?"}ok=durum` : "/yonetim/urunler?ok=durum");
}
