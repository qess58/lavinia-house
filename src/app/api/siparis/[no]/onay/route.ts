import { NextResponse } from "next/server";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { siparisler, siparisOlaylari } from "@/db/schema";
import { epostaGonder, magazayaBildir, panelLinki } from "@/lib/eposta";

const Sema = z.discriminatedUnion("karar", [
  z.object({ token: z.string().min(1), karar: z.literal("onay") }),
  z.object({ token: z.string().min(1), karar: z.literal("duzeltme"), not: z.string().trim().min(3, "Lütfen istediğiniz değişikliği yazın.").max(1000) }),
]);

// Müşterinin tasarımı onaylaması veya düzeltme istemesi.
export async function POST(req: Request, ctx: { params: Promise<{ no: string }> }) {
  if (sinirAsildi(req, "onay", 20, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  const { no } = await ctx.params;
  const sonuc = Sema.safeParse(await req.json().catch(() => null));
  if (!sonuc.success) return NextResponse.json({ hata: sonuc.error.issues[0]?.message ?? "Geçersiz istek." }, { status: 400 });
  const d = await db();
  const [s] = await d.select().from(siparisler).where(eq(siparisler.no, Number(no)));
  if (!s || s.token !== sonuc.data.token) return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (s.onayDurumu !== "bekliyor") return NextResponse.json({ hata: "Bu tasarım için şu an onay beklenmiyor." }, { status: 409 });

  if (sonuc.data.karar === "onay") {
    await d.update(siparisler).set({ onayDurumu: "onaylandi", onayNotu: null, durum: s.durum === "onay" || s.durum === "yeni" ? "uretim" : s.durum }).where(eq(siparisler.id, s.id));
    await d.insert(siparisOlaylari).values([
      { siparisId: s.id, tur: "onay", mesaj: "Müşteri tasarımı onayladı" },
      { siparisId: s.id, tur: "durum", mesaj: "Sipariş üretime alındı" },
    ]);
    await epostaGonder({ alici: s.musteri.eposta, konu: `Siparişiniz üretimde · #${s.no}`, metin: `Merhaba ${s.musteri.ad},\n\nTasarımınızı onayladığınız için teşekkürler. Siparişiniz atölyemizde üretime alındı.\n\nLavinia House` });
    await magazayaBildir(`Tasarım onaylandı · #${s.no}`, `${s.musteri.ad} tasarımı onayladı, sipariş üretime geçti.\n\nPanelde aç: ${panelLinki(`/siparisler/${s.no}`)}`);
  } else {
    await d.update(siparisler).set({ onayDurumu: "duzeltme", onayNotu: sonuc.data.not }).where(eq(siparisler.id, s.id));
    await d.insert(siparisOlaylari).values({ siparisId: s.id, tur: "onay", mesaj: `Düzeltme istendi: “${sonuc.data.not}”` });
    await magazayaBildir(`Tasarım düzeltmesi istendi · #${s.no}`, `${s.musteri.ad} düzeltme istedi:\n\n“${sonuc.data.not}”\n\nPanelde aç: ${panelLinki(`/siparisler/${s.no}`)}`);
  }
  return NextResponse.json({ tamam: true });
}
