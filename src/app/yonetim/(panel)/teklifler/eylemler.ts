"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teklifler } from "@/db/schema";
import { para } from "@/lib/bicim";
import { epostaGonder } from "@/lib/eposta";
import { yoneticiGerekli } from "@/lib/yetki";
import { kurusa, metin } from "../../ortak";

const DURUMLAR = ["yeni", "gonderildi", "kabul", "siparis", "red"] as const;

async function getir(f: FormData) {
  await yoneticiGerekli();
  const no = Number(f.get("no"));
  const [t] = Number.isInteger(no) ? await (await db()).select().from(teklifler).where(eq(teklifler.no, no)) : [];
  if (!t) redirect("/yonetim/teklifler?hata=yok");
  return t;
}
const geri = (no: number, s: string): never => {
  revalidatePath("/yonetim", "layout");
  redirect(`/yonetim/teklifler/${no}?${s}`);
};

export async function teklifGonder(f: FormData) {
  const t = await getir(f);
  const tutar = kurusa(f.get("tutar"));
  const mesaj = metin(f, "mesaj", 3000);
  if (!tutar || !mesaj) geri(t.no, "hata=eksik");
  await (await db()).update(teklifler).set({ teklifTutari: tutar, yanit: mesaj, durum: "gonderildi" }).where(eq(teklifler.id, t.id));
  await epostaGonder({
    alici: t.eposta,
    konu: `Teklifiniz hazır · T-${t.no}`,
    metin: `Merhaba ${t.ad},\n\n${mesaj}\n\nTeklif tutarı: ${para(tutar!)} (KDV dahil)\n\nOnaylamak ya da sorularınız için bu e-postayı yanıtlayabilirsiniz.\n\nLavinia House`,
  });
  geri(t.no, "ok=gonderildi");
}

export async function teklifDurum(f: FormData) {
  const t = await getir(f);
  const durum = String(f.get("durum"));
  if (!DURUMLAR.includes(durum as (typeof DURUMLAR)[number])) geri(t.no, "hata=genel");
  await (await db()).update(teklifler).set({ durum: durum as (typeof DURUMLAR)[number] }).where(eq(teklifler.id, t.id));
  geri(t.no, "ok=durum");
}

export async function teklifNot(f: FormData) {
  const t = await getir(f);
  await (await db()).update(teklifler).set({ icNot: metin(f, "not", 2000) || null }).where(eq(teklifler.id, t.id));
  geri(t.no, "ok=not");
}
