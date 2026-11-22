import { boolean, date, doublePrecision, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
import type {
  Gorsel,
  Kalinlik,
  KisiAlan,
  MalzemeGorunum,
  OnayDurumu,
  Secenek,
  SiparisDurumu,
  StudyoSecimi,
  VaryantAyari,
} from "../lib/tipler";

// Not: Tüm para alanları kuruş cinsinden tam sayıdır (ör. 440 ₺ = 44000).

export const kategoriler = pgTable("kategoriler", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  ad: text("ad").notNull(),
  aciklama: text("aciklama").notNull().default(""),
  ustId: integer("ust_id"),
  sira: integer("sira").notNull().default(0),
  gorsel: text("gorsel"),
  renk: text("renk").notNull().default("#EDE6DA"),
  /** Üst menüde, alt bilgide ve ana sayfada gösterilsin mi? */
  menude: boolean("menude").notNull().default(true),
});

export const malzemeler = pgTable("malzemeler", {
  id: serial("id").primaryKey(),
  ad: text("ad").notNull(),
  aciklama: text("aciklama").notNull().default(""),
  renkler: jsonb("renkler").$type<string[]>().notNull().default([]),
  cm2Kurus: doublePrecision("cm2_kurus").notNull(),
  kalinliklar: jsonb("kalinliklar").$type<Kalinlik[]>().notNull(),
  gorunum: jsonb("gorunum").$type<MalzemeGorunum>().notNull(),
  aktif: boolean("aktif").notNull().default(true),
  sira: integer("sira").notNull().default(0),
});

export const urunler = pgTable("urunler", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  ad: text("ad").notNull(),
  aciklama: text("aciklama").notNull().default(""),
  kategoriId: integer("kategori_id").references(() => kategoriler.id),
  durum: text("durum").$type<"taslak" | "yayinda" | "gizli">().notNull().default("taslak"),
  fiyat: integer("fiyat").notNull(),
  indirimliFiyat: integer("indirimli_fiyat"),
  malzeme: text("malzeme").notNull().default(""),
  uretimSuresi: text("uretim_suresi").notNull().default("2–3 iş günü"),
  hazirlikGunMin: integer("hazirlik_gun_min").notNull().default(2),
  hazirlikGunMax: integer("hazirlik_gun_max").notNull().default(3),
  stokTipi: text("stok_tipi").$type<"adet" | "kapasite">().notNull().default("adet"),
  stok: integer("stok").notNull().default(0),
  olculer: text("olculer").notNull().default(""),
  bakim: text("bakim").notNull().default(""),
  etiketler: jsonb("etiketler").$type<string[]>().notNull().default([]),
  gorseller: jsonb("gorseller").$type<Gorsel[]>().notNull().default([]),
  secenekler: jsonb("secenekler").$type<Secenek[]>().notNull().default([]),
  varyantlar: jsonb("varyantlar").$type<Record<string, VaryantAyari>>().notNull().default({}),
  kisisellestirme: jsonb("kisisellestirme").$type<KisiAlan[]>().notNull().default([]),
  yapimSeti: boolean("yapim_seti").notNull().default(false),
  rozet: text("rozet"),
  renk: text("renk").notNull().default("#EDE6DA"),
  seoBaslik: text("seo_baslik"),
  seoAciklama: text("seo_aciklama"),
  sira: integer("sira").notNull().default(0),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
  silinme: timestamp("silinme", { withTimezone: true }),
});

export const yorumlar = pgTable("yorumlar", {
  id: serial("id").primaryKey(),
  urunId: integer("urun_id").references(() => urunler.id),
  ad: text("ad").notNull(),
  puan: integer("puan").notNull(),
  metin: text("metin").notNull(),
  durum: text("durum").$type<"bekliyor" | "yayinda" | "gizli">().notNull().default("bekliyor"),
  yanit: text("yanit"),
  ornek: boolean("ornek").notNull().default(false),
  /** Yorum, teslim edilmiş bir siparişten geldiyse o sipariş. */
  siparisId: integer("siparis_id"),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

export type Musteri = { ad: string; telefon: string; eposta: string };
export type Adres = { il: string; ilce: string; adres: string };
export type Fatura = { kurumsal: boolean; unvan?: string; vergiDairesi?: string; vergiNo?: string; ayniAdres: boolean };

export const siparisler = pgTable("siparisler", {
  id: serial("id").primaryKey(),
  no: integer("no").generatedByDefaultAsIdentity({ startWith: 1055 }).notNull().unique(),
  token: text("token").notNull(),
  durum: text("durum").$type<SiparisDurumu>().notNull().default("yeni"),
  odemeYontemi: text("odeme_yontemi").$type<"kart" | "havale">().notNull(),
  odemeDurumu: text("odeme_durumu").$type<"bekliyor" | "odendi" | "iade">().notNull().default("bekliyor"),
  taksit: integer("taksit").notNull().default(1),
  musteri: jsonb("musteri").$type<Musteri>().notNull(),
  adres: jsonb("adres").$type<Adres>().notNull(),
  fatura: jsonb("fatura").$type<Fatura>().notNull(),
  hediye: boolean("hediye").notNull().default(false),
  hediyeNotu: text("hediye_notu"),
  kuponKodu: text("kupon_kodu"),
  araToplam: integer("ara_toplam").notNull(),
  kargo: integer("kargo").notNull(),
  indirim: integer("indirim").notNull().default(0),
  hediyeUcreti: integer("hediye_ucreti").notNull().default(0),
  vadeFarki: integer("vade_farki").notNull().default(0),
  toplam: integer("toplam").notNull(),
  onayDurumu: text("onay_durumu").$type<OnayDurumu>().notNull().default("yok"),
  onayNotu: text("onay_notu"),
  tasarimSurumu: integer("tasarim_surumu").notNull().default(1),
  kargoFirmasi: text("kargo_firmasi"),
  takipNo: text("takip_no"),
  /** Müşteriye onay için gösterilen tasarım görseli (/medya/onay/...). */
  tasarimGorseli: text("tasarim_gorseli"),
  /** Yalnızca panelde görünen not. */
  icNot: text("ic_not"),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

export const siparisKalemleri = pgTable("siparis_kalemleri", {
  id: serial("id").primaryKey(),
  siparisId: integer("siparis_id")
    .notNull()
    .references(() => siparisler.id, { onDelete: "cascade" }),
  urunId: integer("urun_id").references(() => urunler.id),
  tur: text("tur").$type<"urun" | "studyo">().notNull(),
  ad: text("ad").notNull(),
  ozet: text("ozet").notNull().default(""),
  secim: jsonb("secim").$type<Record<string, string>>().notNull().default({}),
  kisi: jsonb("kisi").$type<Record<string, string>>().notNull().default({}),
  studyo: jsonb("studyo").$type<StudyoSecimi>(),
  kisisel: boolean("kisisel").notNull().default(false),
  birimFiyat: integer("birim_fiyat").notNull(),
  adet: integer("adet").notNull(),
});

export const siparisOlaylari = pgTable("siparis_olaylari", {
  id: serial("id").primaryKey(),
  siparisId: integer("siparis_id")
    .notNull()
    .references(() => siparisler.id, { onDelete: "cascade" }),
  tur: text("tur").notNull(),
  mesaj: text("mesaj").notNull(),
  musteriyeGorunur: boolean("musteriye_gorunur").notNull().default(true),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

export type TeklifDosyasi = { ad: string; boyut: number; yol: string };

export const teklifler = pgTable("teklifler", {
  id: serial("id").primaryKey(),
  no: integer("no").generatedByDefaultAsIdentity({ startWith: 209 }).notNull().unique(),
  tur: text("tur").$type<"bireysel" | "kurumsal">().notNull(),
  aciklama: text("aciklama").notNull(),
  malzeme: text("malzeme").notNull().default(""),
  olcu: text("olcu").notNull().default(""),
  adet: integer("adet").notNull().default(1),
  istenenTarih: text("istenen_tarih"),
  firma: text("firma"),
  sektor: text("sektor"),
  vergiNo: text("vergi_no"),
  butce: text("butce"),
  numune: boolean("numune").notNull().default(false),
  ad: text("ad").notNull(),
  eposta: text("eposta").notNull(),
  telefon: text("telefon").notNull().default(""),
  kanal: text("kanal").$type<"eposta" | "telefon" | "whatsapp">().notNull().default("eposta"),
  dosyalar: jsonb("dosyalar").$type<TeklifDosyasi[]>().notNull().default([]),
  durum: text("durum").$type<"yeni" | "gonderildi" | "kabul" | "siparis" | "red">().notNull().default("yeni"),
  teklifTutari: integer("teklif_tutari"),
  yanit: text("yanit"),
  icNot: text("ic_not"),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

export const kuponlar = pgTable("kuponlar", {
  kod: text("kod").primaryKey(),
  tur: text("tur").$type<"yuzde" | "tutar">().notNull(),
  deger: integer("deger").notNull(), // yüzde için 10 = %10, tutar için kuruş
  altLimit: integer("alt_limit").notNull().default(0),
  sonKullanma: timestamp("son_kullanma", { withTimezone: true }),
  kullanimSiniri: integer("kullanim_siniri"),
  kullanim: integer("kullanim").notNull().default(0),
  aktif: boolean("aktif").notNull().default(true),
});

export const ayarlar = pgTable("ayarlar", {
  anahtar: text("anahtar").primaryKey(),
  deger: jsonb("deger").notNull(),
});

export const bultenAboneleri = pgTable("bulten_aboneleri", {
  eposta: text("eposta").primaryKey(),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

// Yönetim paneli kullanıcıları ve oturumları.
export const yoneticiler = pgTable("yoneticiler", {
  id: serial("id").primaryKey(),
  ad: text("ad").notNull(),
  eposta: text("eposta").notNull().unique(),
  sifreKarmasi: text("sifre_karmasi").notNull(),
  rol: text("rol").$type<"sahip" | "personel">().notNull().default("sahip"),
  sonGiris: timestamp("son_giris", { withTimezone: true }),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

/** Çerezdeki rastgele anahtarın yalnızca SHA-256 özeti saklanır. */
export const oturumlar = pgTable("oturumlar", {
  anahtarOzeti: text("anahtar_ozeti").primaryKey(),
  yoneticiId: integer("yonetici_id")
    .notNull()
    .references(() => yoneticiler.id, { onDelete: "cascade" }),
  sonKullanma: timestamp("son_kullanma", { withTimezone: true }).notNull(),
  olusturma: timestamp("olusturma", { withTimezone: true }).notNull().defaultNow(),
});

// Ziyaretçi sayacı (çerezsiz). Gün, Türkiye saatine göre "YYYY-AA-GG" biçimindedir.
export const ziyaretOzet = pgTable("ziyaret_ozet", {
  gun: date("gun", { mode: "string" }).primaryKey(),
  ziyaretci: integer("ziyaretci").notNull().default(0),
  goruntuleme: integer("goruntuleme").notNull().default(0),
});

export const ziyaretSayfa = pgTable(
  "ziyaret_sayfa",
  {
    gun: date("gun", { mode: "string" }).notNull(),
    yol: text("yol").notNull(),
    goruntuleme: integer("goruntuleme").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.gun, t.yol] })],
);

/** Yeni ziyaretçilerin kaynağı (Google, Instagram…) ve cihazı (mobil, masaüstü). */
export const ziyaretDagilim = pgTable(
  "ziyaret_dagilim",
  {
    gun: date("gun", { mode: "string" }).notNull(),
    tur: text("tur").$type<"kaynak" | "cihaz">().notNull(),
    deger: text("deger").notNull(),
    ziyaretci: integer("ziyaretci").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.gun, t.tur, t.deger] })],
);

/** Aynı gün aynı kişiyi iki kez saymamak için tek yönlü özet. Günlük değişen anahtarla üretilir, 2 gün sonra silinir. */
export const ziyaretIzleri = pgTable(
  "ziyaret_izleri",
  {
    gun: date("gun", { mode: "string" }).notNull(),
    ozet: text("ozet").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gun, t.ozet] })],
);
