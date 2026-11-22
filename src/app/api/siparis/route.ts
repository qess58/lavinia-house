import { NextResponse } from "next/server";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { SiparisHatasi, SiparisSemasi, siparisOlustur } from "@/lib/siparis";

export async function POST(req: Request) {
  if (sinirAsildi(req, "siparis", 10, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  let govde: unknown;
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ hatalar: ["İstek okunamadı."] }, { status: 400 });
  }
  const sonuc = SiparisSemasi.safeParse(govde);
  if (!sonuc.success) {
    const hatalar = [...new Set(sonuc.error.issues.map((i) => i.message))];
    return NextResponse.json({ hatalar }, { status: 400 });
  }
  try {
    const s = await siparisOlustur(sonuc.data);
    return NextResponse.json(s, { status: 201 });
  } catch (e) {
    if (e instanceof SiparisHatasi) return NextResponse.json({ hatalar: e.hatalar }, { status: 400 });
    console.error(e);
    return NextResponse.json({ hatalar: ["Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."] }, { status: 500 });
  }
}
