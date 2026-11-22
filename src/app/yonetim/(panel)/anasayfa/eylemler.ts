"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { ayarlar } from "@/db/schema";
import { gorselSil, medyaYoluMu } from "@/lib/medya";
import { magazaAyarlari } from "@/lib/veri";
import { yoneticiGerekli } from "@/lib/yetki";
import { AZAMI_SLAYT } from "./sabitler";

const Sema = z.object({
  gorseller: z
    .array(z.object({ yol: z.string().refine((y) => medyaYoluMu(y, "anasayfa")), alt: z.string().trim().max(160) }))
    .max(AZAMI_SLAYT),
  sure: z.coerce.number().int().min(3).max(15),
});

const git = (s: string): never => {
  revalidatePath("/", "layout");
  redirect(`/yonetim/anasayfa?${s}`);
};

/** Ana sayfa slaytını ve kurumsal kart fotoğrafını kaydeder; listeden çıkarılan fotoğrafları depodan siler. */
export async function anasayfaKaydet(f: FormData) {
  await yoneticiGerekli();
  let ham: unknown;
  try {
    ham = JSON.parse(String(f.get("veri") ?? ""));
  } catch {
    git("hata=veri");
  }
  const s = Sema.safeParse(ham);
  if (!s.success) git("hata=veri");
  const kurumsal = String(f.get("kurumsalGorsel") ?? "");
  if (kurumsal && !medyaYoluMu(kurumsal)) git("hata=veri");

  const eski = await magazaAyarlari();
  const yeni = { ...eski, anasayfaGorselleri: s.data!.gorseller, slaytSuresi: s.data!.sure, kurumsalGorsel: kurumsal };
  await (await db()).insert(ayarlar).values({ anahtar: "magaza", deger: yeni }).onConflictDoUpdate({ target: ayarlar.anahtar, set: { deger: yeni } });

  const kalan = new Set([...yeni.anasayfaGorselleri.map((g) => g.yol), yeni.kurumsalGorsel]);
  const silinecek = [...eski.anasayfaGorselleri.map((g) => g.yol), eski.kurumsalGorsel].filter((y) => y && !kalan.has(y));
  await Promise.all(silinecek.map((y) => gorselSil(y).catch(() => {})));
  git("ok=kaydedildi");
}
