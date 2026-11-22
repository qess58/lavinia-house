// Tarayıcı tarafı yükleme yardımcıları.
// Vercel'de bir isteğin gövdesi en fazla 4,5 MB olabildiği için büyük dosyalar sunucudan geçmeden
// doğrudan Vercel Blob deposuna yüklenir (sunucu yalnızca tek kullanımlık izin verir: /api/yukleme).
// Bilgisayarda (Blob bağlı değilken) dosyalar eskisi gibi form ile sunucuya gönderilir.

type Bilgi = { bulut: boolean; erisim?: "private" | "public" };
let bilgi: Promise<Bilgi> | null = null;

export function yuklemeBilgisi(): Promise<Bilgi> {
  bilgi ??= fetch("/api/yukleme", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Bilgi>) : { bulut: false }))
    .catch(() => {
      bilgi = null;
      return { bulut: false };
    });
  return bilgi;
}

/** 16 karakterlik rastgele kimlik (dosya anahtarlarında kullanılır). */
export const rastgeleKimlik = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");

export async function bulutaYukle(anahtar: string, dosya: File, erisim: "private" | "public", ilerleme?: (yuzde: number) => void) {
  const { upload } = await import("@vercel/blob/client");
  await upload(anahtar, dosya, {
    access: erisim,
    handleUploadUrl: "/api/yukleme",
    contentType: dosya.type || undefined,
    multipart: dosya.size > 8 * 1024 * 1024,
    onUploadProgress: ilerleme ? (e) => ilerleme(e.percentage) : undefined,
  });
}

/**
 * Büyük fotoğrafları yüklemeden önce tarayıcıda küçültür (en uzun kenar 2400 px).
 * Sunucu zaten 1600–2000 px'e küçülttüğü için kalite kaybı olmaz; yükleme hızlanır ve 4,5 MB sınırına takılmaz.
 */
export async function gorseliKucult(f: File, sinir = 3 * 1024 * 1024, kenar = 2400): Promise<File> {
  if (f.size <= sinir || !/^image\/(jpeg|png|webp)$/.test(f.type)) return f;
  try {
    const bmp = await createImageBitmap(f);
    const oran = Math.min(1, kenar / Math.max(bmp.width, bmp.height));
    const tuval = document.createElement("canvas");
    tuval.width = Math.round(bmp.width * oran);
    tuval.height = Math.round(bmp.height * oran);
    tuval.getContext("2d")!.drawImage(bmp, 0, 0, tuval.width, tuval.height);
    bmp.close();
    // PNG'lerdeki saydamlık WebP'de korunur; fotoğraflar JPEG olur.
    const tur = f.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await new Promise<Blob | null>((coz) => tuval.toBlob(coz, tur, 0.9));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.[^.]+$/, "") + (tur === "image/jpeg" ? ".jpg" : ".webp"), { type: tur });
  } catch {
    return f;
  }
}
