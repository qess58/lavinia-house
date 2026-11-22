"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { ayarlar, oturumlar, yoneticiler } from "@/db/schema";
import { magazaAyarlari } from "@/lib/veri";
import { sifreDogru, sifreKarmasi, yoneticiGerekli } from "@/lib/yetki";
import { kurusa, metin } from "../../ortak";

const git = (s: string): never => {
  revalidatePath("/", "layout");
  redirect(`/yonetim/ayarlar?${s}`);
};

export async function ayarlariKaydet(f: FormData) {
  await yoneticiGerekli();
  const eski = await magazaAyarlari();
  const para = (k: string) => kurusa(f.get(k));
  const kargo = para("kargoUcreti");
  const limit = para("ucretsizKargoLimiti");
  const hediye = para("hediyePaketiUcreti");
  const vade = Number(metin(f, "taksit6VadeYuzde", 6).replace(",", "."));
  if (kargo === null || limit === null || hediye === null || !Number.isFinite(vade) || vade < 0 || vade > 50) git("hata=sayi");

  const iban = metin(f, "iban", 40).toUpperCase().replace(/\s/g, "");
  if (iban && !/^TR\d{24}$/.test(iban)) git("hata=iban");
  const ig = metin(f, "instagram", 120)
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) git("hata=instagram");
  const gHam = metin(f, "googleDogrulama", 300);
  const g = (gHam.match(/content=["']([^"']+)["']/)?.[1] ?? gHam).trim();
  if (g && !/^[A-Za-z0-9_-]{10,100}$/.test(g)) git("hata=google");
  const wa = metin(f, "whatsapp", 20).replace(/\D/g, "").replace(/^0/, "90");

  const yeni = {
    ...eski,
    kampanyaBandi: metin(f, "kampanyaBandi", 140),
    telefon: metin(f, "telefon", 30),
    eposta: metin(f, "eposta", 120),
    whatsapp: wa,
    adres: metin(f, "adres", 300),
    aliciAdi: metin(f, "aliciAdi", 120) || "Lavinia House",
    iban: iban ? iban.replace(/(.{4})/g, "$1 ").trim() : "",
    kargoUcreti: kargo!,
    ucretsizKargoLimiti: limit!,
    hediyePaketiUcreti: hediye!,
    taksit6VadeYuzde: vade,
    instagram: ig,
    googleDogrulama: g,
    unvan: metin(f, "unvan", 200),
    vergiDairesi: metin(f, "vergiDairesi", 80),
    vergiNo: metin(f, "vergiNo", 20).replace(/\s/g, ""),
    mersisNo: metin(f, "mersisNo", 20).replace(/\s/g, ""),
    etbisNo: metin(f, "etbisNo", 80),
    calismaSaatleri: metin(f, "calismaSaatleri", 80) || "Hafta içi 09:00–18:00",
    onlineSatis: f.get("onlineSatis") === "acik",
    fiyatGoster: f.get("fiyatGoster") === "on",
  };
  await (await db()).insert(ayarlar).values({ anahtar: "magaza", deger: yeni }).onConflictDoUpdate({ target: ayarlar.anahtar, set: { deger: yeni } });
  git("ok=kaydedildi");
}

export async function sifreDegistir(f: FormData) {
  const y = await yoneticiGerekli();
  const d = await db();
  const [k] = await d.select().from(yoneticiler).where(eq(yoneticiler.id, y.id));
  const yeni = String(f.get("yeni") ?? "");
  if (!k || !(await sifreDogru(String(f.get("mevcut") ?? ""), k.sifreKarmasi))) git("hata=mevcut#hesap");
  if (yeni.length < 10) git("hata=kisa#hesap");
  if (yeni !== String(f.get("yeni2") ?? "")) git("hata=ayni#hesap");
  await d.update(yoneticiler).set({ sifreKarmasi: await sifreKarmasi(yeni) }).where(eq(yoneticiler.id, y.id));
  git("ok=sifre#hesap");
}

export async function yoneticiEkle(f: FormData) {
  const y = await yoneticiGerekli();
  if (y.rol !== "sahip") git("hata=yetki#kullanicilar");
  const ad = metin(f, "ad", 60);
  const eposta = metin(f, "eposta", 120).toLocaleLowerCase("tr");
  const sifre = String(f.get("sifre") ?? "");
  if (ad.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) git("hata=bilgi#kullanicilar");
  if (sifre.length < 10) git("hata=kisa#kullanicilar");
  const d = await db();
  const [var_] = await d.select({ id: yoneticiler.id }).from(yoneticiler).where(eq(yoneticiler.eposta, eposta));
  if (var_) git("hata=eposta#kullanicilar");
  await d.insert(yoneticiler).values({ ad, eposta, sifreKarmasi: await sifreKarmasi(sifre), rol: f.get("rol") === "sahip" ? "sahip" : "personel" });
  git("ok=kullanici#kullanicilar");
}

export async function yoneticiSil(f: FormData) {
  const y = await yoneticiGerekli();
  const id = Number(f.get("id"));
  if (y.rol !== "sahip" || id === y.id) git("hata=yetki#kullanicilar");
  const d = await db();
  const [{ n }] = await d.select({ n: count() }).from(yoneticiler).where(and(eq(yoneticiler.rol, "sahip"), ne(yoneticiler.id, id)));
  if (!n) git("hata=sonsahip#kullanicilar");
  await d.delete(oturumlar).where(eq(oturumlar.yoneticiId, id));
  await d.delete(yoneticiler).where(eq(yoneticiler.id, id));
  git("ok=kaldirildi#kullanicilar");
}
