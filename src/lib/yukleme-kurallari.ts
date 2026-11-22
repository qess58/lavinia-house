// Müşterinin yükleyebileceği dosyalar için ortak kurallar (hem tarayıcıda hem sunucuda kullanılır).
//   Ürün kişiselleştirme dosyası:  yuklemeler/musteri/<16 hex>-<ad>
//   Teklif formu dosyası:          yuklemeler/gelen/<16 hex>/<ad>   (sunucuya doğrudan gelirse yuklemeler/T-<no>/<ad>)

export const MUSTERI_DOSYASI = { uzantilar: ["png", "jpg", "jpeg", "svg", "pdf", "webp"], azami: 20 * 1024 * 1024 };
export const TEKLIF_DOSYASI = {
  uzantilar: ["svg", "dxf", "ai", "pdf", "png", "jpg", "jpeg", "eps", "cdr", "webp", "heic", "xlsx", "xls", "csv"],
  azami: 50 * 1024 * 1024,
  adet: 10,
};

export const uzanti = (ad: string) => (ad.includes(".") ? ad.split(".").pop()!.toLowerCase() : "");

/** Dosya adını depoda güvenle kullanılabilir hale getirir; uzun adlarda uzantıyı korur. */
export function guvenliAd(ad: string, enFazla = 100) {
  const temiz = ad.normalize("NFC").replace(/[^\p{L}\p{N}._-]+/gu, "_");
  const nokta = temiz.lastIndexOf(".");
  if (temiz.length <= enFazla || nokta < 1) return temiz.slice(0, enFazla);
  const uz = temiz.slice(nokta).slice(0, 12);
  return temiz.slice(0, enFazla - uz.length) + uz;
}

/** Tarayıcıdan doğrudan depoya yüklenmek istenen dosyanın anahtarı geçerliyse kuralını döner. */
export function yuklemeKurali(anahtar: string): { tur: "musteri" | "teklif"; azami: number } | null {
  const m = /^yuklemeler\/musteri\/[a-f0-9]{16}-([^/]{1,100})$/u.exec(anahtar);
  if (m && MUSTERI_DOSYASI.uzantilar.includes(uzanti(m[1]))) return { tur: "musteri", azami: MUSTERI_DOSYASI.azami };
  const t = /^yuklemeler\/gelen\/[a-f0-9]{16}\/([^/]{1,120})$/u.exec(anahtar);
  if (t && TEKLIF_DOSYASI.uzantilar.includes(uzanti(t[1]))) return { tur: "teklif", azami: TEKLIF_DOSYASI.azami };
  return null;
}
