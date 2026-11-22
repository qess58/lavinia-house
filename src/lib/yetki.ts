// Yönetim paneli girişi: şifre karması (scrypt) ve çerezli oturum.
// Çerezde rastgele bir anahtar durur; veritabanında yalnızca SHA-256 özeti saklanır.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { oturumlar, yoneticiler } from "@/db/schema";

const scryptAsync = promisify(scrypt) as (sifre: string, tuz: Buffer, uzunluk: number, ayar: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const AYAR = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const CEREZ = "lh_yonetim";
const OTURUM_GUN = 7;

export async function sifreKarmasi(sifre: string) {
  const tuz = randomBytes(16);
  const k = await scryptAsync(sifre, tuz, 64, AYAR);
  return `scrypt$${AYAR.N}$${tuz.toString("base64")}$${k.toString("base64")}`;
}

export async function sifreDogru(sifre: string, karma: string) {
  const [tur, n, tuz, deger] = karma.split("$");
  if (tur !== "scrypt" || !tuz || !deger) return false;
  const beklenen = Buffer.from(deger, "base64");
  const k = await scryptAsync(sifre, Buffer.from(tuz, "base64"), beklenen.length, { ...AYAR, N: Number(n) });
  return k.length === beklenen.length && timingSafeEqual(k, beklenen);
}

const ozet = (anahtar: string) => createHash("sha256").update(anahtar).digest("hex");

export async function oturumAc(yoneticiId: number) {
  const anahtar = randomBytes(32).toString("base64url");
  const sonKullanma = new Date(Date.now() + OTURUM_GUN * 864e5);
  const d = await db();
  await d.delete(oturumlar).where(lt(oturumlar.sonKullanma, new Date()));
  await d.insert(oturumlar).values({ anahtarOzeti: ozet(anahtar), yoneticiId, sonKullanma });
  await d.update(yoneticiler).set({ sonGiris: new Date() }).where(eq(yoneticiler.id, yoneticiId));
  (await cookies()).set(CEREZ, anahtar, {
    httpOnly: true,
    sameSite: "lax",
    // Canlıda (https) yalnızca güvenli bağlantıda gönderilir. SITE_URL http:// ile başlıyorsa kapalı kalır.
    secure: process.env.NODE_ENV === "production" && !(process.env.SITE_URL ?? "").startsWith("http://"),
    path: "/yonetim",
    expires: sonKullanma,
  });
}

export async function oturumKapat() {
  const c = await cookies();
  const anahtar = c.get(CEREZ)?.value;
  if (anahtar) await (await db()).delete(oturumlar).where(eq(oturumlar.anahtarOzeti, ozet(anahtar)));
  c.set(CEREZ, "", { path: "/yonetim", maxAge: 0 });
}

/** Giriş yapmış yönetici (yoksa null). Aynı istek içinde bir kez sorgulanır. */
export const mevcutYonetici = cache(async () => {
  const anahtar = (await cookies()).get(CEREZ)?.value;
  if (!anahtar) return null;
  const d = await db();
  const [r] = await d
    .select({ id: yoneticiler.id, ad: yoneticiler.ad, eposta: yoneticiler.eposta, rol: yoneticiler.rol })
    .from(oturumlar)
    .innerJoin(yoneticiler, eq(oturumlar.yoneticiId, yoneticiler.id))
    .where(and(eq(oturumlar.anahtarOzeti, ozet(anahtar)), gt(oturumlar.sonKullanma, new Date())));
  return r ?? null;
});

/** Sayfalarda ve sunucu eylemlerinde ilk satır: giriş yoksa giriş sayfasına yönlendirir. */
export async function yoneticiGerekli() {
  const y = await mevcutYonetici();
  if (!y) redirect("/yonetim/giris");
  return y;
}

export async function yoneticiVarMi() {
  const d = await db();
  const [r] = await d.select({ id: yoneticiler.id }).from(yoneticiler).limit(1);
  return !!r;
}

// Basit kaba kuvvet koruması: aynı IP + e-posta için 15 dakikada en fazla 5 hatalı deneme.
const denemeler = new Map<string, { n: number; ilk: number }>();
const PENCERE = 15 * 60 * 1000;
export function girisEngelli(anahtar: string) {
  const k = denemeler.get(anahtar);
  if (!k || Date.now() - k.ilk > PENCERE) return false;
  return k.n >= 5;
}
export function hataliDeneme(anahtar: string) {
  const k = denemeler.get(anahtar);
  if (!k || Date.now() - k.ilk > PENCERE) denemeler.set(anahtar, { n: 1, ilk: Date.now() });
  else k.n++;
}
export function denemeleriSifirla(anahtar: string) {
  denemeler.delete(anahtar);
}
