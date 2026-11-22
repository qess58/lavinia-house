import type { OnayDurumu, SiparisDurumu } from "@/lib/tipler";

export const DURUM_AD: Record<SiparisDurumu, [string, string]> = {
  odeme: ["Ödeme bekleniyor", "y-b-sari"],
  yeni: ["Yeni", "y-b-mor"],
  onay: ["Tasarım onayında", "y-b-mavi"],
  uretim: ["Üretimde", "y-b-tur"],
  kargo: ["Kargoda", "y-b-mavi"],
  teslim: ["Teslim edildi", "y-b-yesil"],
  iptal: ["İptal", "y-b-kirmizi"],
  iade: ["İade", "y-b-kirmizi"],
};

export function sonrakiAdim(durum: SiparisDurumu, onay: OnayDurumu, kisisel: boolean): [string, boolean] {
  if (durum === "odeme") return ["Havale ödemesini kontrol edin", true];
  if (onay === "duzeltme" && (durum === "yeni" || durum === "onay")) return ["Müşteri düzeltme istedi", true];
  if (durum === "yeni") return kisisel && onay !== "onaylandi" ? ["Tasarımı hazırlayıp onaya gönderin", true] : ["Hazırlayıp üretime alın", true];
  if (durum === "onay") return ["Müşteri onayı bekleniyor", false];
  if (durum === "uretim") return ["Kargoya verin", true];
  if (durum === "kargo") return ["Teslimat bekleniyor", false];
  return ["—", false];
}
