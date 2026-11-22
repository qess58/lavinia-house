"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kuponlar } from "@/db/schema";
import { yoneticiGerekli } from "@/lib/yetki";
import { kurusa, metin } from "../../ortak";

const git = (s: string): never => {
  revalidatePath("/yonetim/kuponlar");
  redirect(`/yonetim/kuponlar?${s}`);
};

export async function kuponEkle(f: FormData) {
  await yoneticiGerekli();
  const kod = metin(f, "kod", 30).toLocaleUpperCase("tr").replace(/İ/g, "I").replace(/[^A-Z0-9]/g, "");
  const tur = f.get("tur") === "tutar" ? "tutar" : "yuzde";
  const degerHam = metin(f, "deger", 20);
  const deger = tur === "yuzde" ? Number(degerHam.replace(",", ".")) : kurusa(degerHam);
  const altLimit = kurusa(f.get("altLimit")) ?? 0;
  const tarih = metin(f, "sonKullanma", 20);
  const sinir = metin(f, "kullanimSiniri", 10);
  if (kod.length < 3) git("hata=kod");
  if (!deger || deger <= 0 || (tur === "yuzde" && (deger > 90 || !Number.isInteger(deger)))) git("hata=deger");
  const d = await db();
  const [var_] = await d.select({ kod: kuponlar.kod }).from(kuponlar).where(eq(kuponlar.kod, kod));
  if (var_) git("hata=var");
  await d.insert(kuponlar).values({
    kod,
    tur,
    deger: deger!,
    altLimit,
    // Son kullanma gününün sonuna kadar geçerli (Türkiye saati)
    sonKullanma: tarih ? new Date(`${tarih}T23:59:59+03:00`) : null,
    kullanimSiniri: sinir ? Math.max(1, Number(sinir) || 1) : null,
  });
  git("ok=eklendi");
}

export async function kuponAktif(f: FormData) {
  await yoneticiGerekli();
  await (await db()).update(kuponlar).set({ aktif: f.get("aktif") === "1" }).where(eq(kuponlar.kod, String(f.get("kod"))));
  git("ok=kaydedildi");
}

export async function kuponSil(f: FormData) {
  await yoneticiGerekli();
  await (await db()).delete(kuponlar).where(eq(kuponlar.kod, String(f.get("kod"))));
  git("ok=silindi");
}
