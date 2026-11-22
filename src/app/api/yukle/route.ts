import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { randomBytes } from "node:crypto";
import { dosyaYaz } from "@/lib/depo";
import { NextResponse } from "next/server";
import { guvenliAd, MUSTERI_DOSYASI, uzanti } from "@/lib/yukleme-kurallari";

// Ürün kişiselleştirmesinde müşterinin yüklediği logo / çizim.
// Dosyalar depoya (diskte .veri/yuklemeler/musteri ya da Vercel Blob) yazılır.
// Vercel'de büyük dosyalar bu yolu kullanmaz; tarayıcı doğrudan Blob'a yükler (/api/yukleme).
export async function POST(req: Request) {
  if (sinirAsildi(req, "yukle", 20, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("dosya");
  if (!f || typeof f === "string" || f.size === 0) return NextResponse.json({ hata: "Dosya seçin." }, { status: 400 });
  if (!MUSTERI_DOSYASI.uzantilar.includes(uzanti(f.name))) return NextResponse.json({ hata: "PNG, JPG, SVG, WEBP veya PDF yükleyin." }, { status: 400 });
  if (f.size > MUSTERI_DOSYASI.azami) return NextResponse.json({ hata: "Dosya 20 MB'tan büyük olamaz." }, { status: 400 });
  const id = randomBytes(8).toString("hex");
  await dosyaYaz(`yuklemeler/musteri/${id}-${guvenliAd(f.name, 100)}`, Buffer.from(await f.arrayBuffer()), f.type || "application/octet-stream");
  return NextResponse.json({ id, ad: f.name });
}
