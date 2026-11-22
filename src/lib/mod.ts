import type { MagazaAyarlari } from "./tipler";

/** Sunucu tarafında mağaza modunu ayarlardan çıkarır. */
export function magazaModu(a: MagazaAyarlari) {
  return { satis: a.onlineSatis, fiyat: a.onlineSatis || a.fiyatGoster, whatsapp: a.whatsapp };
}
