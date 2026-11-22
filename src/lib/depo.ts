// Dosya deposu: yüklenen fotoğraflar ve müşteri dosyaları.
// Vercel'de Blob deposu bağlıysa (BLOB_READ_WRITE_TOKEN ya da BLOB_STORE_ID otomatik gelir) Vercel Blob'a,
// değilse bilgisayardaki / sunucudaki .veri klasörüne yazar. Anahtarlar her iki durumda aynıdır:
//   medya/urun/<ad>.webp · medya/onay/<ad>.webp · yuklemeler/musteri/<id>-<ad> · yuklemeler/T-<no>/<ad>
import fs from "node:fs/promises";
import path from "node:path";
import { vercelde } from "./site";

const KOK = path.join(process.cwd(), ".veri");
export const bulutDepo = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
/** Tarayıcıdan doğrudan yükleme izni üretebilmek için okuma-yazma anahtarı gerekir. */
export const dogrudanYukleme = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Anahtarın güvenli olduğunu doğrular (klasör dışına çıkılamaz). */
function gecerli(anahtar: string) {
  return /^(medya|yuklemeler)\/[^\\]+$/.test(anahtar) && !anahtar.split("/").some((p) => p === ".." || p === "." || p === "");
}

// Blob deposu "private" ya da "public" olarak açılmış olabilir; ilk denemede hangisi olduğu öğrenilir.
type Erisim = "private" | "public";
let erisim: Erisim | null = (process.env.BLOB_ERISIM as Erisim) || null;
const erisimHatasi = (e: unknown) => /access|private|public/i.test(String(e));

export async function dosyaYaz(anahtar: string, veri: Buffer, tur: string) {
  if (!gecerli(anahtar)) throw new Error("Geçersiz dosya yolu");
  if (!bulutDepo() && vercelde()) throw new Error("Dosya deposu bağlı değil: Vercel projesinde Storage → Blob ekleyin.");
  if (!bulutDepo()) {
    const tam = path.join(KOK, anahtar);
    await fs.mkdir(path.dirname(tam), { recursive: true });
    await fs.writeFile(tam, veri);
    return;
  }
  const { put } = await import("@vercel/blob");
  const yaz = (a: Erisim) => put(anahtar, veri, { access: a, contentType: tur, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
  try {
    await yaz(erisim ?? "private");
    erisim ??= "private";
  } catch (e) {
    if (erisim || !erisimHatasi(e)) throw e;
    await yaz("public");
    erisim = "public";
  }
}

export async function dosyaOku(anahtar: string): Promise<{ govde: BodyInit; tur: string | null } | null> {
  if (!gecerli(anahtar)) return null;
  if (!bulutDepo()) {
    const veri = await fs.readFile(path.join(KOK, anahtar)).catch(() => null);
    return veri ? { govde: new Uint8Array(veri) as unknown as BodyInit, tur: null } : null;
  }
  const { get } = await import("@vercel/blob");
  for (const a of erisim ? [erisim] : (["private", "public"] as Erisim[])) {
    try {
      const r = await get(anahtar, { access: a });
      if (r && r.statusCode === 200) {
        erisim = a;
        return { govde: r.stream as unknown as BodyInit, tur: r.blob.contentType };
      }
      if (r === null) return null;
    } catch (e) {
      if (!erisimHatasi(e) || erisim) return null;
    }
  }
  return null;
}

/** Dosyanın boyutu ve türü; yoksa null. */
export async function dosyaBilgisi(anahtar: string): Promise<{ boyut: number; tur: string | null } | null> {
  if (!gecerli(anahtar)) return null;
  if (!bulutDepo()) {
    const s = await fs.stat(path.join(KOK, anahtar)).catch(() => null);
    return s?.isFile() ? { boyut: s.size, tur: null } : null;
  }
  const { head } = await import("@vercel/blob");
  const h = await head(anahtar).catch(() => null);
  return h ? { boyut: h.size, tur: h.contentType } : null;
}

/** Blob deposunun erişim türü ("private" / "public"). Tarayıcıdan doğrudan yüklemede gerekir. */
export async function blobErisimi(): Promise<Erisim> {
  if (!erisim) await dosyaYaz("yuklemeler/.erisim", Buffer.from("1"), "text/plain");
  return erisim ?? "private";
}

export async function dosyaSil(anahtar: string) {
  if (!gecerli(anahtar)) return;
  if (!bulutDepo()) return void (await fs.rm(path.join(KOK, anahtar), { force: true }));
  const { del } = await import("@vercel/blob");
  await del(anahtar).catch(() => {});
}

/** Verilen önekle başlayan ilk dosyanın anahtarı (ör. müşterinin yüklediği dosyayı kimliğiyle bulmak için). */
export async function dosyaBul(onEk: string): Promise<string | null> {
  if (!gecerli(onEk + "x")) return null;
  if (!bulutDepo()) {
    const klasor = path.join(KOK, path.dirname(onEk));
    const bas = path.basename(onEk);
    const ad = (await fs.readdir(klasor).catch(() => [] as string[])).find((f) => f.startsWith(bas));
    return ad ? `${path.dirname(onEk)}/${ad}` : null;
  }
  const { list } = await import("@vercel/blob");
  const r = await list({ prefix: onEk, limit: 1 });
  return r.blobs[0]?.pathname ?? null;
}
