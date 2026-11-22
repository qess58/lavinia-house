/** Seçeneklerin tüm kombinasyonları, sepetteki varyant anahtarıyla aynı biçimde ("MDF / 30 × 20 cm / Doğal"). */
export function kombinasyonlar(secenekler: { ad: string; degerler: { ad: string }[] }[]): string[] {
  if (!secenekler.length) return [];
  return secenekler.reduce<string[][]>((acc, s) => acc.flatMap((a) => s.degerler.map((d) => [...a, d.ad])), [[]]).map((k) => k.join(" / "));
}
