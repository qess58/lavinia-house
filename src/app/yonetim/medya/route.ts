import { NextResponse } from "next/server";
import { mevcutYonetici } from "@/lib/yetki";
import { gorselKaydet } from "@/lib/medya";

// Panelden görsel yükleme (ürün fotoğrafı veya tasarım onay görseli). Yalnızca giriş yapmış yönetici.
export async function POST(req: Request) {
  if (!(await mevcutYonetici())) return NextResponse.json({ hata: "Oturumunuz kapanmış. Yeniden giriş yapın." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const dosya = form?.get("dosya");
  const klasor = form?.get("klasor") === "onay" ? "onay" : "urun";
  if (!dosya || typeof dosya === "string") return NextResponse.json({ hata: "Dosya seçin." }, { status: 400 });
  const sonuc = await gorselKaydet(dosya, klasor);
  return NextResponse.json(sonuc, { status: "hata" in sonuc ? 400 : 201 });
}
