import { NextResponse } from "next/server";
import { mevcutYonetici } from "@/lib/yetki";
import { gorselKaydet, gorselKlasoruMu } from "@/lib/medya";

// Panelden görsel yükleme (ürün, tasarım onayı, ana sayfa slaytı, kategori). Yalnızca giriş yapmış yönetici.
export async function POST(req: Request) {
  if (!(await mevcutYonetici())) return NextResponse.json({ hata: "Oturumunuz kapanmış. Yeniden giriş yapın." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const dosya = form?.get("dosya");
  const k = form?.get("klasor");
  const klasor = gorselKlasoruMu(k) ? k : "urun";
  if (!dosya || typeof dosya === "string") return NextResponse.json({ hata: "Dosya seçin." }, { status: 400 });
  const sonuc = await gorselKaydet(dosya, klasor);
  return NextResponse.json(sonuc, { status: "hata" in sonuc ? 400 : 201 });
}
