// Ödeme altyapısı. Şimdilik yalnızca "test" sağlayıcısı var: gerçek para çekilmez.
// iyzico veya PayTR eklenirken kart bilgileri sağlayıcının güvenli ödeme sayfasında (3D Secure) alınır,
// bu sunucu kart numarası görmez ve saklamaz.

export type OdemeIstegi = { tutar: number; taksit: number; aciklama: string };
export type OdemeSonucu = { basarili: boolean; referans?: string; hata?: string };

export async function odemeAl(istek: OdemeIstegi): Promise<OdemeSonucu> {
  const saglayici = process.env.ODEME_SAGLAYICI ?? "test";
  if (!kartOdemeAcik()) return { basarili: false, hata: "Kartla ödeme şu an kapalı. Havale / EFT ile ödeyebilirsiniz." };
  if (saglayici === "test") {
    if (istek.tutar <= 0) return { basarili: false, hata: "Ödeme tutarı geçersiz." };
    return { basarili: true, referans: `TEST-${Date.now()}` };
  }
  return { basarili: false, hata: `“${saglayici}” ödeme altyapısı henüz bağlanmadı.` };
}

export function testModu() {
  return (process.env.ODEME_SAGLAYICI ?? "test") === "test";
}

/** Canlı sitede (production) gerçek ödeme altyapısı bağlanmadan kartla ödeme kapalıdır; yalnızca havale / EFT alınır. */
export function kartOdemeAcik() {
  return !(process.env.NODE_ENV === "production" && testModu());
}

/** Havale / EFT için IBAN girilmiş olmalı (geliştirme sırasında denemek için IBAN'sız da açık). */
export function havaleAcik(iban: string) {
  return !!iban || process.env.NODE_ENV !== "production";
}
