// Panel sunucu eylemlerinde ortak yardımcılar.

/** "1.290,50" / "1290.5" / "1290" → kuruş. Geçersizse null. */
export function kurusa(deger: FormDataEntryValue | string | null | undefined): number | null {
  const s = String(deger ?? "").trim().replace(/\s|₺/g, "");
  if (!s) return null;
  // "1.290,50" → 1290.50 · "2.450" → 2450 (nokta binlik ayracı) · "1290.5" → 1290.5
  const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Kuruşu form alanı için "1290" / "1290,5" yazar. */
export function tlYaz(kurus: number | null | undefined) {
  if (kurus === null || kurus === undefined) return "";
  return (kurus / 100).toString().replace(".", ",");
}

export const metin = (f: FormData, k: string, azami = 2000) => String(f.get(k) ?? "").trim().slice(0, azami);
export const tamsayi = (f: FormData, k: string) => {
  const n = Number(String(f.get(k) ?? "").trim());
  return Number.isInteger(n) ? n : null;
};
