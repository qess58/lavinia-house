// Basit istek sınırı: aynı IP'den kısa sürede çok fazla form gönderimini (spam, kötü niyetli deneme) engeller.
// Sunucu belleğinde tutulur; tek sunucuda çalışan küçük bir mağaza için yeterlidir.
const kayitlar = new Map<string, number[]>();

export function ipAdresi(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "yerel";
}

/** Sınır aşıldıysa true döner. ör. sinirAsildi(req, "siparis", 10, 10 * 60_000) → 10 dakikada en fazla 10 istek. */
export function sinirAsildi(req: Request, ad: string, enFazla: number, sureMs: number) {
  const anahtar = `${ad}|${ipAdresi(req)}`;
  const simdi = Date.now();
  const liste = (kayitlar.get(anahtar) ?? []).filter((t) => simdi - t < sureMs);
  if (liste.length >= enFazla) {
    kayitlar.set(anahtar, liste);
    return true;
  }
  liste.push(simdi);
  kayitlar.set(anahtar, liste);
  if (kayitlar.size > 5000) for (const [k, v] of kayitlar) if (!v.some((t) => simdi - t < 3600_000)) kayitlar.delete(k);
  return false;
}

export const COK_FAZLA = { hata: "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin." };
