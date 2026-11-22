"use server";

// Yönetim paneli sunucu eylemleri. Her eylem önce girişi kontrol eder.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kategoriler, urunler, yoneticiler } from "@/db/schema";
import { slugify } from "@/lib/bicim";
import {
  denemeleriSifirla,
  girisEngelli,
  hataliDeneme,
  oturumAc,
  oturumKapat,
  sifreDogru,
  sifreKarmasi,
  yoneticiGerekli,
  yoneticiVarMi,
} from "@/lib/yetki";

export type FormDurumu = { hata?: string; alanlar?: Record<string, string> };

const KATEGORI_SAYFASI = "/yonetim/kategoriler";
const yenile = () => revalidatePath("/", "layout");
const alanlar = (f: FormData) => Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/* ---------- Giriş, çıkış, ilk kurulum ---------- */

const SAHTE_KARMA = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

export async function girisYap(_: FormDurumu, f: FormData): Promise<FormDurumu> {
  const eposta = String(f.get("eposta") ?? "").trim().toLocaleLowerCase("tr");
  const sifre = String(f.get("sifre") ?? "");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "yerel";
  const anahtar = `${ip}|${eposta}`;
  if (girisEngelli(anahtar)) return { hata: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.", alanlar: { eposta } };
  if (!eposta || !sifre) return { hata: "E-posta ve şifrenizi girin.", alanlar: { eposta } };

  const d = await db();
  const [y] = await d.select().from(yoneticiler).where(eq(yoneticiler.eposta, eposta));
  const dogru = await sifreDogru(sifre, y?.sifreKarmasi ?? SAHTE_KARMA);
  if (!y || !dogru) {
    hataliDeneme(anahtar);
    return { hata: "E-posta veya şifre hatalı.", alanlar: { eposta } };
  }
  denemeleriSifirla(anahtar);
  await oturumAc(y.id);
  redirect("/yonetim");
}

export async function cikisYap() {
  await oturumKapat();
  redirect("/yonetim/giris");
}

const KurulumSemasi = z
  .object({
    ad: z.string().trim().min(2, "Adınızı yazın.").max(60),
    eposta: z.email("Geçerli bir e-posta yazın.").transform((v) => v.trim().toLocaleLowerCase("tr")),
    sifre: z.string().min(10, "Şifre en az 10 karakter olmalı.").max(200),
    sifre2: z.string(),
    anahtar: z.string().optional(),
  })
  .refine((v) => v.sifre === v.sifre2, { message: "Şifreler aynı değil.", path: ["sifre2"] });

/** Canlı sunucuda ilk yönetici yalnızca KURULUM_ANAHTARI ile oluşturulabilir. */
export async function kurulumAnahtariGerekli() {
  return process.env.NODE_ENV === "production";
}

export async function kurulumYap(_: FormDurumu, f: FormData): Promise<FormDurumu> {
  const g = alanlar(f);
  const geri = { ad: g.ad ?? "", eposta: g.eposta ?? "" };
  if (await yoneticiVarMi()) redirect("/yonetim/giris");
  if (await kurulumAnahtariGerekli()) {
    const beklenen = process.env.KURULUM_ANAHTARI;
    if (!beklenen) return { hata: "Sunucuda KURULUM_ANAHTARI tanımlı değil. Önce bu ortam değişkenini ekleyin.", alanlar: geri };
    if (g.anahtar !== beklenen) return { hata: "Kurulum anahtarı hatalı.", alanlar: geri };
  }
  const s = KurulumSemasi.safeParse(g);
  if (!s.success) return { hata: s.error.issues[0]?.message ?? "Bilgileri kontrol edin.", alanlar: geri };

  const d = await db();
  const sifreKarmasiDegeri = await sifreKarmasi(s.data.sifre);
  const id = await d.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
    const [var_] = await tx.select({ id: yoneticiler.id }).from(yoneticiler).limit(1);
    if (var_) return null;
    const [y] = await tx
      .insert(yoneticiler)
      .values({ ad: s.data.ad, eposta: s.data.eposta, sifreKarmasi: sifreKarmasiDegeri, rol: "sahip" })
      .returning({ id: yoneticiler.id });
    return y.id;
  });
  if (!id) redirect("/yonetim/giris");
  await oturumAc(id);
  redirect("/yonetim");
}

/* ---------- Kategoriler ---------- */

const RENK = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KategoriSemasi = z.object({
  ad: z.string().trim().min(1).max(60),
  aciklama: z.string().trim().max(300).default(""),
  renk: z.string().regex(RENK).catch("#EDE6DA"),
  menude: z.string().optional(),
});
const kimlik = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const git = (sonuc: string): never => redirect(`${KATEGORI_SAYFASI}?${sonuc}`);

async function bosSlug(taban: string, haricId?: number) {
  const d = await db();
  const kokSlug = taban || "kategori";
  for (let i = 1; i < 100; i++) {
    const aday = i === 1 ? kokSlug : `${kokSlug}-${i}`;
    const [r] = await d
      .select({ id: kategoriler.id })
      .from(kategoriler)
      .where(haricId ? and(eq(kategoriler.slug, aday), ne(kategoriler.id, haricId)) : eq(kategoriler.slug, aday));
    if (!r) return aday;
  }
  return `${kokSlug}-${Date.now()}`;
}

export async function kategoriEkle(f: FormData) {
  await yoneticiGerekli();
  const s = KategoriSemasi.safeParse(alanlar(f));
  if (!s.success) git("hata=ad");
  const v = s.data!;
  const d = await db();
  const [{ enCok }] = await d.select({ enCok: max(kategoriler.sira) }).from(kategoriler);
  await d.insert(kategoriler).values({
    ad: v.ad,
    slug: await bosSlug(slugify(v.ad)),
    aciklama: v.aciklama,
    renk: v.renk,
    menude: v.menude === "on",
    sira: (enCok ?? 0) + 1,
  });
  yenile();
  git("ok=eklendi");
}

export async function kategoriGuncelle(f: FormData) {
  await yoneticiGerekli();
  const id = kimlik(f.get("id"));
  const s = KategoriSemasi.safeParse(alanlar(f));
  if (!id || !s.success) git("hata=ad");
  const slug = String(f.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG.test(slug)) git(`hata=slug-gecersiz&ac=${id}`);
  if ((await bosSlug(slug, id!)) !== slug) git(`hata=slug-var&ac=${id}`);
  const v = s.data!;
  const d = await db();
  await d.update(kategoriler).set({ ad: v.ad, slug, aciklama: v.aciklama, renk: v.renk, menude: v.menude === "on" }).where(eq(kategoriler.id, id!));
  yenile();
  git("ok=kaydedildi");
}

export async function kategoriMenuDegistir(f: FormData) {
  await yoneticiGerekli();
  const id = kimlik(f.get("id"));
  if (!id) git("hata=yok");
  const d = await db();
  await d.update(kategoriler).set({ menude: f.get("menude") === "1" }).where(eq(kategoriler.id, id!));
  yenile();
  git("ok=kaydedildi");
}

export async function kategoriTasi(f: FormData) {
  await yoneticiGerekli();
  const id = kimlik(f.get("id"));
  const yon = f.get("yon") === "yukari" ? -1 : 1;
  const d = await db();
  const liste = await d.select({ id: kategoriler.id }).from(kategoriler).orderBy(asc(kategoriler.sira), asc(kategoriler.id));
  const i = liste.findIndex((k) => k.id === id);
  const j = i + yon;
  if (i < 0 || j < 0 || j >= liste.length) git("ok=sira");
  [liste[i], liste[j]] = [liste[j], liste[i]];
  await d.transaction(async (tx) => {
    for (const [n, k] of liste.entries()) await tx.update(kategoriler).set({ sira: n + 1 }).where(eq(kategoriler.id, k.id));
  });
  yenile();
  git("ok=sira");
}

export async function kategoriSil(f: FormData) {
  await yoneticiGerekli();
  const id = kimlik(f.get("id"));
  const hedef = kimlik(f.get("hedef"));
  if (!id || hedef === id) git("hata=yok");
  const d = await db();
  if (hedef) {
    const [h] = await d.select({ id: kategoriler.id }).from(kategoriler).where(eq(kategoriler.id, hedef));
    if (!h) git("hata=yok");
  }
  await d.transaction(async (tx) => {
    await tx.update(urunler).set({ kategoriId: hedef }).where(eq(urunler.kategoriId, id!));
    await tx.update(kategoriler).set({ ustId: null }).where(eq(kategoriler.ustId, id!));
    await tx.delete(kategoriler).where(eq(kategoriler.id, id!));
  });
  yenile();
  git("ok=silindi");
}
