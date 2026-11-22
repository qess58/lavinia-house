import { mevcutYonetici } from "@/lib/yetki";
import { ICERIK_TURU, yuklemeAnahtari } from "@/lib/medya";
import { dosyaOku } from "@/lib/depo";

// Müşterilerin yüklediği dosyaları (teklif dosyaları, logolar) yalnızca giriş yapmış yöneticiye indirir.
export async function GET(req: Request) {
  if (!(await mevcutYonetici())) return new Response("Yetkisiz", { status: 401 });
  const anahtar = yuklemeAnahtari(new URL(req.url).searchParams.get("yol") ?? "");
  const dosya = anahtar ? await dosyaOku(anahtar) : null;
  if (!anahtar || !dosya) return new Response("Dosya bulunamadı", { status: 404 });
  const ad = anahtar.split("/").pop()!.replace(/^[a-f0-9]{16}-/, "");
  const uz = ad.split(".").pop()?.toLowerCase() ?? "";
  return new Response(dosya.govde, {
    headers: {
      "Content-Type": ICERIK_TURU[uz] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(ad)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
