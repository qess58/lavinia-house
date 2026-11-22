// Mağaza ve panelde ortak kullanılan veri tipleri. Tüm para tutarları KURUŞ cinsinden tam sayıdır.

export type SecenekDegeri = { ad: string; fark: number };
export type Secenek = { ad: string; degerler: SecenekDegeri[] };
export type VaryantAyari = { fark?: number; aktif?: boolean };

export type KisiAlanTipi = "metin" | "font" | "renk" | "dosya";
export type KisiAlan = {
  id: string;
  tip: KisiAlanTipi;
  baslik: string;
  zorunlu: boolean;
  ucret: number;
  sinir?: number; // metin için karakter sınırı
  ornek?: string; // metin için yer tutucu
  fontlar?: string[]; // font alanı için
  renkler?: { ad: string; hex: string }[]; // renk alanı için; ilki ücretsiz varsayılandır
};

export type Gorsel = { yol: string; alt: string };

export type MalzemeGorunum = { zemin: string; kenar: string; yazi: string; saydamlik?: number };
export type Kalinlik = { mm: number; carpan: number };

export type MagazaAyarlari = {
  kargoUcreti: number;
  ucretsizKargoLimiti: number;
  hediyePaketiUcreti: number;
  taksit6VadeYuzde: number;
  kampanyaBandi: string;
  whatsapp: string;
  telefon: string;
  eposta: string;
  iban: string;
  aliciAdi: string;
  /** Instagram kullanıcı adı (@ olmadan). */
  instagram: string;
  adres: string;
  /** Google Search Console "HTML etiketi" doğrulama kodu. */
  googleDogrulama: string;
  /** Satıcı bilgileri (yasal metinlerde ve alt bilgide gösterilir). */
  unvan: string;
  vergiDairesi: string;
  vergiNo: string;
  mersisNo: string;
  etbisNo: string;
  calismaSaatleri: string;
  /** false: vitrin modu. Ürünler ve fiyatlar görünür, sepet / ödeme kapalı; müşteriler teklif ve WhatsApp ile ulaşır. */
  onlineSatis: boolean;
  /** Vitrin modunda fiyatlar gösterilsin mi? */
  fiyatGoster: boolean;
  fontlar: { ad: string; aile: string }[];
};

export const VARSAYILAN_AYARLAR: MagazaAyarlari = {
  kargoUcreti: 8900,
  ucretsizKargoLimiti: 75000,
  hediyePaketiUcreti: 3000,
  taksit6VadeYuzde: 5,
  kampanyaBandi: "750 ₺ ve üzeri siparişlerde kargo bedava",
  whatsapp: "",
  telefon: "",
  eposta: "",
  iban: "",
  aliciAdi: "Lavinia House",
  instagram: "",
  adres: "",
  googleDogrulama: "",
  unvan: "",
  vergiDairesi: "",
  vergiNo: "",
  mersisNo: "",
  etbisNo: "",
  calismaSaatleri: "Hafta içi 09:00–18:00",
  onlineSatis: false,
  fiyatGoster: true,
  fontlar: [
    { ad: "Great Vibes", aile: "'Great Vibes', cursive" },
    { ad: "Montserrat", aile: "Montserrat, sans-serif" },
    { ad: "Playfair Display", aile: "'Playfair Display', serif" },
    { ad: "Pacifico", aile: "Pacifico, cursive" },
  ],
};

export type SiparisDurumu = "odeme" | "yeni" | "onay" | "uretim" | "kargo" | "teslim" | "iptal" | "iade";
export type OnayDurumu = "yok" | "hazirlaniyor" | "bekliyor" | "duzeltme" | "onaylandi";

// Sepette (tarayıcıda) tutulan kalem. Fiyatlar sadece gösterim içindir; sunucu siparişte yeniden hesaplar.
export type SepetKalemi =
  | {
      anahtar: string;
      tur: "urun";
      urunId: number;
      slug: string;
      ad: string;
      secim: Record<string, string>;
      kisi: Record<string, string>;
      ozet: string;
      birimFiyat: number;
      adet: number;
      renk?: string;
      kisisel: boolean;
    }
  | {
      anahtar: string;
      tur: "studyo";
      ad: string;
      studyo: StudyoSecimi;
      ozet: string;
      birimFiyat: number;
      adet: number;
      kisisel: true;
    };

export type StudyoSecimi = {
  malzemeId: number;
  kalinlikMm: number;
  en: number;
  boy: number;
  sekil: "dikdortgen" | "yuvarlak" | "oval";
  yazi: string;
  font: string;
  islem: "gravur" | "kesim";
  aski: boolean;
  gorsel: boolean;
};

type DagilimliOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type YeniSepetKalemi = DagilimliOmit<SepetKalemi, "anahtar">;
