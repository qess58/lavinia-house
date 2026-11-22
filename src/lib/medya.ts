// Panelden yüklenen görseller (ürün fotoğrafları, tasarım onay görselleri) ve müşteri dosyaları.
// Dosyalar depo.ts üzerinden diske ya da Vercel Blob'a yazılır; sayfalarda her zaman /medya/... adresiyle görünür.
import { randomBytes } from "node:crypto";
import { dosyaBul, dosyaSil, dosyaYaz } from "./depo";
const AZAMI = 15 * 1024 * 1024;

/** Panelden yüklenen görsellerin klasörleri ve en uzun kenar (px). */
export const GORSEL_KLASORLERI = { urun: 1600, onay: 2000, anasayfa: 2000, kategori: 1200 } as const;
export type GorselKlasoru = keyof typeof GORSEL_KLASORLERI;
export const gorselKlasoruMu = (k: unknown): k is GorselKlasoru => typeof k === "string" && Object.hasOwn(GORSEL_KLASORLERI, k);
/** Panelden yüklenmiş bir görselin adresi mi? (ör. /medya/anasayfa/<20 hex>.webp) */
export const medyaYoluMu = (yol: string, klasor?: GorselKlasoru) => {
  const m = yol.match(/^\/medya\/([a-z]+)\/[a-f0-9]{20}\.(webp|jpg|png)$/);
  return !!m && gorselKlasoruMu(m[1]) && (!klasor || m[1] === klasor);
};

function turBul(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/** Görseli doğrular, büyükse küçültür (WebP) ve kaydeder. Dönen yol sayfalarda doğrudan kullanılır. */
export async function gorselKaydet(dosya: File, klasor: GorselKlasoru): Promise<{ yol: string } | { hata: string }> {
  if (dosya.size === 0) return { hata: "Dosya boş." };
  if (dosya.size > AZAMI) return { hata: "Görsel 15 MB'tan büyük olamaz." };
  const ham = Buffer.from(await dosya.arrayBuffer());
  const tur = turBul(ham);
  if (!tur) return { hata: "Yalnızca JPG, PNG veya WEBP görsel yükleyebilirsiniz." };

  let cikti: Buffer = ham;
  let uzanti: string = tur;
  try {
    const sharp = (await import("sharp")).default;
    cikti = await sharp(ham)
      .rotate()
      .resize({ width: GORSEL_KLASORLERI[klasor], height: GORSEL_KLASORLERI[klasor], fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    uzanti = "webp";
  } catch {
    // sharp yoksa özgün dosya saklanır
  }
  const ad = `${randomBytes(10).toString("hex")}.${uzanti}`;
  await dosyaYaz(`medya/${klasor}/${ad}`, cikti, ICERIK_TURU[uzanti] ?? "application/octet-stream");
  return { yol: `/medya/${klasor}/${ad}` };
}

export async function gorselSil(yol: string) {
  const m = yol.match(/^\/medya\/([a-z]+)\/([a-f0-9]{20}\.(webp|jpg|png))$/);
  if (!m || !gorselKlasoruMu(m[1])) return;
  await dosyaSil(`medya/${m[1]}/${m[2]}`);
}

/** Teklif / müşteri dosyası yolunu depo anahtarına çevirir: ".veri\\yuklemeler\\T-209\\a.pdf", "T-209/a.pdf" → "yuklemeler/T-209/a.pdf". */
export function yuklemeAnahtari(goreli: string) {
  const temiz = goreli.replace(/\\/g, "/").replace(/^\.veri\//, "").replace(/^yuklemeler\//, "");
  if (!temiz || temiz.split("/").some((p) => p === ".." || p === "." || p === "")) return null;
  return `yuklemeler/${temiz}`;
}

/** Müşterinin ürün sayfasında yüklediği dosya ("id|ad" biçiminde saklanır); yuklemeler altındaki göreli yolu döner. */
export async function musteriDosyasi(deger: string) {
  const id = deger.split("|")[0];
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  const anahtar = await dosyaBul(`yuklemeler/musteri/${id}-`);
  return anahtar ? anahtar.replace(/^yuklemeler\//, "") : null;
}

export const ICERIK_TURU: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  dxf: "application/dxf",
  ai: "application/postscript",
  eps: "application/postscript",
  cdr: "application/octet-stream",
};
