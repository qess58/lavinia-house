/**
 * Sitenin tam adresi (ör. https://laviniahouse.com), sonunda "/" olmadan.
 * SITE_URL tanımlı değilse Vercel'in verdiği üretim adresi kullanılır (alan adı bağlanınca o alan adı olur).
 */
export function siteAdresi(yedek = "http://localhost:3000") {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL || (vercel ? `https://${vercel}` : yedek)).replace(/\/+$/, "");
}

/**
 * Site Vercel sunucusunda mı çalışıyor? (canlı ya da önizleme)
 * Bilgisayara "vercel env pull" ile inen .env.local dosyasında da VERCEL=1 olabildiği için
 * VERCEL_ENV=development durumu bilgisayar sayılır.
 */
export const vercelde = () => process.env.VERCEL === "1" && !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development";
