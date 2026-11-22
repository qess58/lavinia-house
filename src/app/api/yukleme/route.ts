import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { blobErisimi, dogrudanYukleme } from "@/lib/depo";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { yuklemeKurali } from "@/lib/yukleme-kurallari";

// Tarayıcıdan Vercel Blob'a doğrudan yükleme (büyük dosyalar sunucudan geçmez).
// GET: depo bulutta mı, erişim türü ne?  POST: tek dosya için kısa süreli yükleme izni verir.
// Okuma-yazma anahtarı yoksa (yalnızca OIDC bağlantısı) dosyalar form ile sunucuya gönderilir (en fazla 4,5 MB).
export async function GET() {
  if (!dogrudanYukleme()) return NextResponse.json({ bulut: false });
  const erisim = await blobErisimi().catch(() => null);
  return NextResponse.json(erisim ? { bulut: true, erisim } : { bulut: false }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!dogrudanYukleme()) return NextResponse.json({ error: "Bulut depo bağlı değil." }, { status: 404 });
  const govde = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!govde) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  if (govde.type === "blob.generate-client-token" && sinirAsildi(req, "yukleme", 30, 10 * 60_000))
    return NextResponse.json({ error: COK_FAZLA.hata }, { status: 429 });
  try {
    const sonuc = await handleUpload({
      request: req,
      body: govde,
      onBeforeGenerateToken: async (anahtar) => {
        const kural = yuklemeKurali(anahtar);
        if (!kural) throw new Error("Bu dosya türü kabul edilmiyor.");
        return { maximumSizeInBytes: kural.azami, addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 30 * 60_000 };
      },
    });
    return NextResponse.json(sonuc);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Yükleme izni verilemedi." }, { status: 400 });
  }
}
