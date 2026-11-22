import { NextResponse } from "next/server";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { siparisBulEposta } from "@/lib/veri";

// Sipariş numarası + e-posta ile sipariş takip bağlantısını döndürür.
export async function POST(req: Request) {
  if (sinirAsildi(req, "bul", 10, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  const g = (await req.json().catch(() => null)) as { no?: unknown; eposta?: unknown } | null;
  const no = Number(String(g?.no ?? "").replace(/\D/g, ""));
  const eposta = String(g?.eposta ?? "");
  if (!no || !eposta) return NextResponse.json({ hata: "Sipariş numarası ve e-posta gerekli." }, { status: 400 });
  const s = await siparisBulEposta(no, eposta);
  if (!s) return NextResponse.json({ hata: "Bu bilgilerle bir sipariş bulamadık. Numarayı ve e-postayı kontrol edin." }, { status: 404 });
  return NextResponse.json({ no: s.no, token: s.token });
}
