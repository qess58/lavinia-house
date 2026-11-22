import { NextResponse } from "next/server";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { siparisKalemleri, siparisler, yorumlar } from "@/db/schema";
import { magazayaBildir, panelLinki } from "@/lib/eposta";

const Sema = z.object({
  no: z.number().int(),
  token: z.string().min(1),
  urunId: z.number().int().positive(),
  puan: z.number().int().min(1, "Puan seçin.").max(5),
  metin: z.string().trim().min(5, "Biraz daha yazar mısınız? (en az 5 karakter)").max(1500),
  ad: z.string().trim().min(2, "Görünecek adınızı yazın.").max(40),
});

// Teslim edilen siparişin sahibi, aldığı ürünü değerlendirir. Yorum panelden onaylanınca yayınlanır.
export async function POST(req: Request) {
  if (sinirAsildi(req, "yorum", 10, 60 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  const v = Sema.safeParse(await req.json().catch(() => null));
  if (!v.success) return NextResponse.json({ hata: v.error.issues[0]?.message ?? "Geçersiz istek." }, { status: 400 });
  const d = await db();
  const [s] = await d.select().from(siparisler).where(eq(siparisler.no, v.data.no));
  if (!s || s.token !== v.data.token) return NextResponse.json({ hata: "Sipariş bulunamadı." }, { status: 404 });
  if (s.durum !== "teslim") return NextResponse.json({ hata: "Siparişiniz teslim edildikten sonra değerlendirme yapabilirsiniz." }, { status: 409 });
  const [k] = await d.select({ id: siparisKalemleri.id }).from(siparisKalemleri).where(and(eq(siparisKalemleri.siparisId, s.id), eq(siparisKalemleri.urunId, v.data.urunId)));
  if (!k) return NextResponse.json({ hata: "Bu ürün siparişinizde yok." }, { status: 400 });
  const [var_] = await d.select({ id: yorumlar.id }).from(yorumlar).where(and(eq(yorumlar.siparisId, s.id), eq(yorumlar.urunId, v.data.urunId)));
  if (var_) return NextResponse.json({ hata: "Bu ürünü zaten değerlendirdiniz. Teşekkürler!" }, { status: 409 });
  await d.insert(yorumlar).values({ urunId: v.data.urunId, siparisId: s.id, ad: v.data.ad, puan: v.data.puan, metin: v.data.metin, durum: "bekliyor" });
  await magazayaBildir(`Yeni yorum (${v.data.puan}★) onay bekliyor`, `${v.data.ad}: “${v.data.metin}”\n\nPanelde aç: ${panelLinki("/yorumlar")}`);
  return NextResponse.json({ tamam: true }, { status: 201 });
}
