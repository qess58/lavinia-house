import { NextResponse } from "next/server";
import { magazaKategorileri, yayindakiUrunler } from "@/lib/veri";
import { kucukHarf } from "@/lib/bicim";

// Üst menüdeki arama kutusu için öneriler.
export async function GET(req: Request) {
  const q = kucukHarf(new URL(req.url).searchParams.get("q")?.trim() ?? "").slice(0, 60);
  if (q.length < 2) return NextResponse.json({ sonuclar: [] });
  const [urunler, { dolu: kategoriler }] = await Promise.all([yayindakiUrunler(), magazaKategorileri()]);
  const sonuclar = [
    ...kategoriler.filter((k) => kucukHarf(k.ad).includes(q)).map((k) => ({ ad: k.ad, tur: "Kategori", href: `/urunler?kategori=${k.slug}` })),
    ...urunler.filter((u) => u.aramaMetni.includes(q)).map((u) => ({ ad: u.ad, tur: "Ürün", href: `/urun/${u.slug}` })),
  ].slice(0, 7);
  return NextResponse.json({ sonuclar });
}
