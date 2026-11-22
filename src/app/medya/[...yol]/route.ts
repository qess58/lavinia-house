import { ICERIK_TURU } from "@/lib/medya";
import { dosyaOku } from "@/lib/depo";

// Panelden yüklenen ürün ve tasarım görsellerini sunar. Dosya adları rastgele olduğundan uzun süre önbelleğe alınabilir
// (Vercel'de ilk istekten sonra CDN'den gelir).
export async function GET(_: Request, ctx: { params: Promise<{ yol: string[] }> }) {
  const { yol } = await ctx.params;
  if (yol.length !== 2 || !["urun", "onay"].includes(yol[0]) || !/^[a-f0-9]{20}\.(webp|jpg|png)$/.test(yol[1])) return new Response("Bulunamadı", { status: 404 });
  const dosya = await dosyaOku(`medya/${yol[0]}/${yol[1]}`);
  if (!dosya) return new Response("Bulunamadı", { status: 404 });
  return new Response(dosya.govde, {
    headers: {
      "Content-Type": ICERIK_TURU[yol[1].split(".").pop()!] ?? dosya.tur ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
