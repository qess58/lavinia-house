// Para, tarih ve metin biçimlendirme yardımcıları.

/** Kuruşu "1.290" veya "1.290,50" biçimine çevirir (₺ işareti olmadan). */
export function tl(kurus: number) {
  const tam = Math.round(kurus) / 100;
  return tam.toLocaleString("tr-TR", { minimumFractionDigits: Number.isInteger(tam) ? 0 : 2, maximumFractionDigits: 2 });
}

/** "₺1.290" */
export function para(kurus: number) {
  return (kurus < 0 ? "−₺" : "₺") + tl(Math.abs(kurus));
}

export const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function tarihYaz(d: Date, gunAdi = false) {
  return `${d.getDate()} ${AYLAR[d.getMonth()]}${gunAdi ? " " + GUNLER[d.getDay()] : ""}`;
}

/** Türkiye saatine göre "22 Kasım 2026, 01:51" (sunucu hangi saat diliminde olursa olsun). */
export function tarihSaat(d: Date) {
  const t = turkiyeSaati(d);
  return `${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()}, ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

/** Verilen anın Türkiye'deki takvim/saat değerlerini taşıyan bir Date döndürür (yalnızca biçimlendirme ve gün hesabı için). */
export function turkiyeSaati(d = new Date()) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
}

/** Hafta sonlarını atlayarak iş günü ekler. */
export function isGunuEkle(bas: Date, gun: number) {
  const d = new Date(bas);
  let kalan = gun;
  while (kalan > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) kalan--;
  }
  return d;
}

/** "25–26 Kasım" veya "25 Kasım – 1 Aralık" */
export function tarihAraligi(a: Date, b: Date) {
  if (a.getMonth() === b.getMonth()) return a.getDate() === b.getDate() ? tarihYaz(a) : `${a.getDate()}–${b.getDate()} ${AYLAR[a.getMonth()]}`;
  return `${tarihYaz(a)} – ${tarihYaz(b)}`;
}

/** Tahmini kargo aralığı. Kişiye özel ürünlerde 1 iş günü tasarım onayı eklenir. */
export function tahminiKargo(min: number, max: number, kisisel: boolean, bugun = turkiyeSaati()) {
  const onay = kisisel ? 1 : 0;
  return tarihAraligi(isGunuEkle(bugun, min + onay), isGunuEkle(bugun, max + onay));
}

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u", â: "a", î: "i", û: "u" };

/** Türkçe karakterleri çevirerek URL dostu metin üretir. */
export function slugify(t: string) {
  return t
    .replace(/[çğıöşüÇĞİIÖŞÜâîû]/g, (c) => TR[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function kucukHarf(t: string) {
  return t.toLocaleLowerCase("tr");
}

/** Türkiye saatine göre "2026-11-22". Türkiye 2016'dan beri sabit UTC+3 kullanır. */
export function gunAnahtari(d = new Date()) {
  return new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10);
}

/** "2026-11" ayının Türkiye saatine göre başlangıç ve bitiş anları. */
export function ayAraligi(ay: string) {
  const [y, m] = ay.split("-").map(Number);
  const bas = new Date(Date.UTC(y, m - 1, 1) - 3 * 3600e3);
  const son = new Date(Date.UTC(y, m, 1) - 3 * 3600e3);
  return { bas, son, gunSayisi: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

export function ayYaz(ay: string) {
  const [y, m] = ay.split("-").map(Number);
  return `${AYLAR[m - 1]} ${y}`;
}
