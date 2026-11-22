import { NextResponse } from "next/server";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { kuponBul } from "@/lib/veri";
import { para } from "@/lib/bicim";

export async function POST(req: Request) {
  if (sinirAsildi(req, "kupon", 30, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  const g = (await req.json().catch(() => null)) as { kod?: unknown; araToplam?: unknown } | null;
  const kod = String(g?.kod ?? "").trim();
  if (!kod) return NextResponse.json({ hata: "Bir kod yazın." }, { status: 400 });
  const sonuc = await kuponBul(kod);
  if ("hata" in sonuc) return NextResponse.json({ hata: sonuc.hata }, { status: 404 });
  const ara = Number(g?.araToplam ?? 0);
  if (ara < sonuc.kupon.altLimit) return NextResponse.json({ hata: `Bu kod ${para(sonuc.kupon.altLimit)} ve üzeri sepetlerde geçerli.` }, { status: 422 });
  return NextResponse.json({ kupon: sonuc.kupon });
}
