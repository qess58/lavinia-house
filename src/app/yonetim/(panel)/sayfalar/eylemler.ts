"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ayarlar } from "@/db/schema";
import { sayfaTanimi } from "@/lib/sayfalar";
import { yoneticiGerekli } from "@/lib/yetki";

export async function sayfaKaydet(f: FormData) {
  await yoneticiGerekli();
  const adres = String(f.get("adres") ?? "");
  if (!sayfaTanimi(adres)) redirect("/yonetim/sayfalar?hata=genel");
  const icerik = String(f.get("icerik") ?? "").replace(/\r\n/g, "\n").slice(0, 60000);
  const deger = { icerik, guncelleme: new Date().toISOString() };
  await (await db()).insert(ayarlar).values({ anahtar: `sayfa:${adres}`, deger }).onConflictDoUpdate({ target: ayarlar.anahtar, set: { deger } });
  revalidatePath("/", "layout");
  redirect(`/yonetim/sayfalar/${adres}?ok=kaydedildi`);
}

export async function sayfaSifirla(f: FormData) {
  await yoneticiGerekli();
  const adres = String(f.get("adres") ?? "");
  if (!sayfaTanimi(adres)) redirect("/yonetim/sayfalar?hata=genel");
  await (await db()).delete(ayarlar).where(eq(ayarlar.anahtar, `sayfa:${adres}`));
  revalidatePath("/", "layout");
  redirect(`/yonetim/sayfalar/${adres}?ok=sifirlandi`);
}
