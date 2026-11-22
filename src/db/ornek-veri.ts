// ÖRNEK VERİ: Geliştirme ve deneme içindir. Ürünler, fiyatlar ve yorumlar gerçek değildir.
// Gömülü veritabanı boşsa otomatik yüklenir. Canlı veritabanı ilk açıldığında yalnızca temel veriler
// (mağaza ayarları, kategoriler, malzemeler) yüklenir; ORNEK_VERI=1 tanımlıysa örnek ürünler de gelir.
import { count, eq, sql } from "drizzle-orm";
import type { Db } from "./index";
import { ayarlar, kategoriler, kuponlar, malzemeler, siparisKalemleri, siparisler, siparisOlaylari, urunler, yorumlar } from "./schema";
import { VARSAYILAN_AYARLAR, type KisiAlan, type Secenek } from "../lib/tipler";

const TL = (n: number) => n * 100;

const FONT3 = ["Great Vibes", "Montserrat", "Playfair Display"];
const YAZI_RENGI: KisiAlan = {
  id: "renk",
  tip: "renk",
  baslik: "Yazı rengi",
  zorunlu: false,
  ucret: TL(25),
  renkler: [
    { ad: "Gravür (yakma)", hex: "#3B2A17" },
    { ad: "Siyah", hex: "#17201C" },
    { ad: "Beyaz", hex: "#FFFFFF" },
    { ad: "Altın", hex: "#C9A227" },
  ],
};
const LOGO: KisiAlan = { id: "logo", tip: "dosya", baslik: "Logo veya çizim", zorunlu: false, ucret: TL(60) };

const ISIMLIK_SECENEK: Secenek[] = [
  { ad: "Malzeme", degerler: [{ ad: "Kayın kontrplak", fark: 0 }, { ad: "MDF", fark: TL(-40) }] },
  { ad: "Boyut", degerler: [{ ad: "20 × 15 cm", fark: TL(-80) }, { ad: "30 × 20 cm", fark: 0 }, { ad: "40 × 30 cm", fark: TL(180) }] },
  { ad: "Ahşap rengi", degerler: [{ ad: "Doğal", fark: 0 }, { ad: "Ceviz", fark: TL(30) }] },
];

type UrunGirdisi = Omit<typeof urunler.$inferInsert, "kategoriId"> & { kategori: string };

const URUNLER: UrunGirdisi[] = [
  {
    slug: "kisiye-ozel-ahsap-isimlik", ad: "Kişiye Özel Ahşap İsimlik", kategori: "kisiye-ozel", durum: "yayinda",
    fiyat: TL(440), malzeme: "Ahşap", uretimSuresi: "2–3 iş günü", hazirlikGunMin: 2, hazirlikGunMax: 3, stokTipi: "kapasite", stok: 20,
    aciklama: "Kapınıza, çocuk odasına ya da ofisinize özel isimlik. İsminiz lazerle işlenir, kenarlar elde zımparalanır.\n\n• Doğal kayın kontrplak veya MDF\n• Arkasında askı deliği hazır\n• Hediye paketiyle gönderilir",
    olculer: "20 × 15, 30 × 20 veya 40 × 30 cm · 4 mm", bakim: "Nemli bezle silin; doğrudan güneş ışığından ve sudan uzak tutun.",
    secenekler: ISIMLIK_SECENEK, varyantlar: { "MDF / 40 × 30 cm / Ceviz": { aktif: false } },
    kisisellestirme: [
      { id: "ust", tip: "metin", baslik: "Üst satır (isim)", zorunlu: true, ucret: 0, sinir: 20, ornek: "Örn. Yılmaz Ailesi" },
      { id: "alt", tip: "metin", baslik: "Alt satır", zorunlu: false, ucret: TL(40), sinir: 30, ornek: "Örn. Hoş geldiniz" },
      { id: "font", tip: "font", baslik: "Yazı tipi", zorunlu: true, ucret: 0, fontlar: FONT3 },
      YAZI_RENGI, LOGO,
    ],
    rozet: "Çok satan", renk: "#E7D6BD", sira: 1, etiketler: ["isimlik", "kapı", "hediye"],
  },
  {
    slug: "mekanik-ahsap-masa-saati", ad: "Mekanik Ahşap Masa Saati", kategori: "mekanik-modeller", durum: "yayinda",
    fiyat: TL(1290), malzeme: "Ahşap", uretimSuresi: "1 iş günü", hazirlikGunMin: 1, hazirlikGunMax: 1, stokTipi: "adet", stok: 14, yapimSeti: true,
    aciklama: "Dişlileriyle gerçekten çalışan, kendin kur ahşap masa saati. Lazerle kesilmiş parçalar yapıştırıcı gerektirmeden birbirine geçer.\n\n• 168 parça · Türkçe resimli kılavuz\n• Kurulum süresi yaklaşık 6 saat\n• 14 yaş ve üzeri için önerilir",
    olculer: "Kurulmuş hali 18 × 12 × 26 cm", bakim: "Dişlileri arada bir kurşun kalemle grafitleyin, daha sessiz çalışır.",
    rozet: "Çok satan", renk: "#E9DFD0", sira: 2, etiketler: ["saat", "yapım seti", "hediye"],
  },
  {
    slug: "ahsap-dunya-haritasi", ad: "Ahşap Dünya Haritası", kategori: "ev-ve-dekor", durum: "yayinda",
    fiyat: TL(1690), indirimliFiyat: TL(1450), malzeme: "Ahşap", uretimSuresi: "3–5 iş günü", hazirlikGunMin: 3, hazirlikGunMax: 5, stokTipi: "kapasite", stok: 4,
    aciklama: "Kıtaları katman katman kesilmiş, duvara kolayca asılan ahşap dünya haritası. İsterseniz altına aile adınızı ya da bir tarih yazalım.",
    olculer: "60 × 30 cm veya 100 × 50 cm", bakim: "Kuru bezle tozunu alın.",
    secenekler: [{ ad: "Boyut", degerler: [{ ad: "60 × 30 cm", fark: 0 }, { ad: "100 × 50 cm", fark: TL(600) }] }],
    kisisellestirme: [{ id: "yazi", tip: "metin", baslik: "Haritanın altına yazı", zorunlu: false, ucret: 0, sinir: 30, ornek: "Örn. Demir Ailesi · 2026" }],
    renk: "#E2E7D5", sira: 3, etiketler: ["harita", "duvar"],
  },
  {
    slug: "gravurlu-kesme-tahtasi", ad: "Gravürlü Kesme Tahtası", kategori: "ev-ve-dekor", durum: "yayinda",
    fiyat: TL(690), indirimliFiyat: TL(590), malzeme: "Bambu", uretimSuresi: "2 iş günü", hazirlikGunMin: 2, hazirlikGunMax: 2, stokTipi: "adet", stok: 22,
    aciklama: "Bambu kesme tahtası; isminiz, bir tarif ya da logonuz gravürle işlenir. Gıdaya uygun yağla bakımı yapılmıştır.",
    olculer: "35 × 25 cm · 1,5 cm", bakim: "Elde yıkayın, bulaşık makinesine koymayın. Ayda bir zeytinyağı sürün.",
    kisisellestirme: [{ id: "yazi", tip: "metin", baslik: "Gravür yazısı", zorunlu: false, ucret: 0, sinir: 30, ornek: "Örn. Annemin Mutfağı" }, { id: "font", tip: "font", baslik: "Yazı tipi", zorunlu: true, ucret: 0, fontlar: FONT3 }, LOGO],
    renk: "#E2E7D5", sira: 4, etiketler: ["mutfak", "hediye"],
  },
  {
    slug: "disli-muzik-kutusu", ad: "Dişli Müzik Kutusu (yapım seti)", kategori: "mekanik-modeller", durum: "yayinda",
    fiyat: TL(890), malzeme: "Ahşap", uretimSuresi: "1 iş günü", hazirlikGunMin: 1, hazirlikGunMax: 1, stokTipi: "adet", stok: 9, yapimSeti: true,
    aciklama: "Kolu çevirdikçe melodi çalan, şeffaf dişlileriyle mekanizması görünen müzik kutusu yapım seti.",
    olculer: "Kurulmuş hali 14 × 10 × 12 cm", rozet: "Yeni", renk: "#DCD3C4", sira: 5, etiketler: ["müzik kutusu", "yapım seti"],
  },
  {
    slug: "pleksi-kapi-tabelasi", ad: "Pleksi Kapı Tabelası", kategori: "kisiye-ozel", durum: "yayinda",
    fiyat: TL(650), indirimliFiyat: TL(590), malzeme: "Pleksi", uretimSuresi: "1–2 iş günü", hazirlikGunMin: 1, hazirlikGunMax: 2, stokTipi: "kapasite", stok: 10,
    aciklama: "Ofis, muayenehane ya da ev kapısı için şık pleksi tabela. Arkasında çift taraflı bant ile gelir.",
    olculer: "25 × 10 cm · 3 mm",
    secenekler: [{ ad: "Renk", degerler: [{ ad: "Siyah pleksi", fark: 0 }, { ad: "Şeffaf pleksi", fark: 0 }, { ad: "Ayna altın", fark: TL(50) }] }],
    kisisellestirme: [
      { id: "ust", tip: "metin", baslik: "Tabela yazısı", zorunlu: true, ucret: 0, sinir: 30, ornek: "Örn. Dr. Mehmet Kaya" },
      { id: "alt", tip: "metin", baslik: "Alt satır", zorunlu: false, ucret: TL(30), sinir: 40, ornek: "Örn. Diş Hekimi" },
      { id: "font", tip: "font", baslik: "Yazı tipi", zorunlu: true, ucret: 0, fontlar: ["Montserrat", "Playfair Display"] },
    ],
    renk: "#DCE6EE", sira: 6, etiketler: ["tabela", "ofis"],
  },
  {
    slug: "dugun-masa-isimligi", ad: "Düğün Masa İsimliği", kategori: "kisiye-ozel", durum: "yayinda",
    fiyat: TL(60), malzeme: "Ayna pleksi", uretimSuresi: "3 iş günü", hazirlikGunMin: 3, hazirlikGunMax: 3, stokTipi: "kapasite", stok: 200,
    aciklama: "Davetlilerinizin isimleri ayna pleksiye kesilir. Adet başı fiyattır; isim listenizi siparişten sonra e-postayla isteyeceğiz.",
    olculer: "10 × 4 cm",
    kisisellestirme: [{ id: "ust", tip: "metin", baslik: "Örnek isim", zorunlu: true, ucret: 0, sinir: 24, ornek: "Örn. Elif" }, { id: "font", tip: "font", baslik: "Yazı tipi", zorunlu: true, ucret: 0, fontlar: ["Great Vibes", "Pacifico"] }],
    renk: "#EEDFE4", sira: 7, etiketler: ["düğün", "nişan"],
  },
  {
    slug: "pleksi-anahtarlik", ad: "Pleksi Anahtarlık", kategori: "kisiye-ozel", durum: "yayinda",
    fiyat: TL(75), malzeme: "Pleksi", uretimSuresi: "1–2 iş günü", hazirlikGunMin: 1, hazirlikGunMax: 2, stokTipi: "adet", stok: 4,
    aciklama: "İsminiz ya da kısa bir kelimeyle kişiye özel pleksi anahtarlık.",
    secenekler: [{ ad: "Renk", degerler: [{ ad: "Şeffaf", fark: 0 }, { ad: "Siyah", fark: 0 }, { ad: "Ayna altın", fark: TL(10) }] }],
    kisisellestirme: [{ id: "ust", tip: "metin", baslik: "Yazı", zorunlu: true, ucret: 0, sinir: 14, ornek: "Örn. Deniz" }, { id: "font", tip: "font", baslik: "Yazı tipi", zorunlu: true, ucret: 0, fontlar: ["Pacifico", "Montserrat"] }],
    rozet: "Çok satan", renk: "#DCE6EE", sira: 8, etiketler: ["anahtarlık", "hediye"],
  },
  {
    slug: "mekanik-ahsap-araba", ad: "Mekanik Ahşap Araba (yapım seti)", kategori: "mekanik-modeller", durum: "yayinda",
    fiyat: TL(690), malzeme: "Ahşap", uretimSuresi: "1 iş günü", hazirlikGunMin: 1, hazirlikGunMax: 1, stokTipi: "adet", stok: 11, yapimSeti: true,
    aciklama: "Lastik motoruyla gerçekten giden klasik araba yapım seti.", olculer: "Kurulmuş hali 22 × 10 × 9 cm",
    rozet: "Yeni", renk: "#E9DFD0", sira: 9, etiketler: ["araba", "yapım seti"],
  },
  {
    slug: "bambu-bardak-altligi-seti", ad: "Bambu Bardak Altlığı Seti", kategori: "ev-ve-dekor", durum: "yayinda",
    fiyat: TL(280), malzeme: "Bambu", uretimSuresi: "2 iş günü", hazirlikGunMin: 2, hazirlikGunMax: 2, stokTipi: "adet", stok: 0,
    aciklama: "4'lü bambu bardak altlığı seti, baş harfleriniz gravürle.",
    kisisellestirme: [{ id: "yazi", tip: "metin", baslik: "Baş harfler", zorunlu: false, ucret: 0, sinir: 4, ornek: "Örn. A&C" }],
    renk: "#E2E7D5", sira: 10, etiketler: ["mutfak"],
  },
  {
    slug: "ahsap-kalem-kutusu", ad: "Ahşap Kalem Kutusu", kategori: "kisiye-ozel", durum: "yayinda",
    fiyat: TL(390), malzeme: "Ahşap", uretimSuresi: "2–3 iş günü", hazirlikGunMin: 2, hazirlikGunMax: 3, stokTipi: "adet", stok: 9,
    aciklama: "Sürgülü kapaklı ahşap kalem kutusu; kapağına isim gravürü.",
    kisisellestirme: [{ id: "ust", tip: "metin", baslik: "Kapak yazısı", zorunlu: false, ucret: 0, sinir: 20, ornek: "Örn. E. Çelik" }],
    rozet: "Yeni", renk: "#E7D6BD", sira: 11, etiketler: ["ofis", "okul"],
  },
  {
    slug: "bebek-odasi-isim-panosu", ad: "Bebek Odası İsim Panosu", kategori: "ev-ve-dekor", durum: "yayinda",
    fiyat: TL(820), indirimliFiyat: TL(720), malzeme: "Ahşap", uretimSuresi: "3 iş günü", hazirlikGunMin: 3, hazirlikGunMax: 3, stokTipi: "kapasite", stok: 6,
    aciklama: "Bebeğinizin adı, pastel tonlarda boyanmış ahşap harflerle.",
    secenekler: [{ ad: "Renk teması", degerler: [{ ad: "Pastel pembe", fark: 0 }, { ad: "Pastel mavi", fark: 0 }, { ad: "Doğal ahşap", fark: 0 }] }],
    kisisellestirme: [{ id: "ust", tip: "metin", baslik: "Bebeğin adı", zorunlu: true, ucret: 0, sinir: 14, ornek: "Örn. Ada" }, { id: "font", tip: "font", baslik: "Yazı tipi", zorunlu: true, ucret: 0, fontlar: ["Pacifico", "Great Vibes", "Montserrat"] }],
    renk: "#EEDFE4", sira: 12, etiketler: ["bebek", "hediye"],
  },
];

export async function bossaYukle(d: Db) {
  const [{ n }] = await d.select({ n: count() }).from(urunler);
  if (n > 0) return false;
  await yukle(d);
  return true;
}

/**
 * Canlı (PostgreSQL) veritabanı ilk kez açıldığında bir kez çalışır: mağaza ayarı kaydı varsa hiçbir şey yapmaz.
 * Aynı anda açılan birden çok sunucu örneği için kilitle korunur.
 */
export async function ilkKurulum(d: Db, ornekUrunler: boolean) {
  const kayit = () => d.select({ a: ayarlar.anahtar }).from(ayarlar).where(eq(ayarlar.anahtar, "magaza")).limit(1);
  if ((await kayit()).length) return false;
  return d.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(724501)`);
    const t = tx as unknown as Db;
    if ((await t.select({ a: ayarlar.anahtar }).from(ayarlar).where(eq(ayarlar.anahtar, "magaza")).limit(1)).length) return false;
    const [{ n }] = await t.select({ n: count() }).from(urunler);
    if (n > 0) {
      await t.insert(ayarlar).values({ anahtar: "magaza", deger: VARSAYILAN_AYARLAR }).onConflictDoNothing();
      return false;
    }
    if (ornekUrunler) await yukle(t);
    else await temelVeri(t);
    return true;
  });
}

/** Mağaza ayarları, kategoriler ve malzemeler (ürünsüz başlangıç). Kategori kimliklerini döner. */
async function temelVeri(d: Db) {
  await d.insert(ayarlar).values({ anahtar: "magaza", deger: VARSAYILAN_AYARLAR }).onConflictDoNothing();

  const kats = await d
    .insert(kategoriler)
    .values([
      { slug: "mekanik-modeller", ad: "Mekanik Modeller", aciklama: "Kendin kur, gerçekten çalışan ahşap mekanizmalar.", sira: 1, renk: "#E9DFD0" },
      { slug: "kisiye-ozel", ad: "Kişiye Özel", aciklama: "İsim, tarih ya da logonuzla hazırlanan ürünler.", sira: 2, renk: "#E7D6BD" },
      { slug: "ev-ve-dekor", ad: "Ev ve Dekor", aciklama: "Duvar dekoru, mutfak ve çocuk odası.", sira: 3, renk: "#E2E7D5" },
    ])
    .returning();
  const katId: Record<string, number> = Object.fromEntries(kats.map((k) => [k.slug, k.id]));

  await d.insert(malzemeler).values([
    { ad: "Kayın kontrplak", aciklama: "Doğal ahşap", renkler: ["Doğal", "Ceviz vernik"], cm2Kurus: 45, kalinliklar: [{ mm: 3, carpan: 1 }, { mm: 4, carpan: 1.25 }, { mm: 6, carpan: 1.6 }], gorunum: { zemin: "#D9B98C", kenar: "#B08A5B", yazi: "#3B2A17" }, sira: 1 },
    { ad: "MDF", aciklama: "Boyamaya uygun", renkler: ["Ham", "Beyaz boyalı", "Siyah boyalı"], cm2Kurus: 30, kalinliklar: [{ mm: 3, carpan: 1 }, { mm: 6, carpan: 1.4 }], gorunum: { zemin: "#CDB898", kenar: "#A89276", yazi: "#3B2A17" }, sira: 2 },
    { ad: "Şeffaf pleksi", aciklama: "Cam görünümlü", renkler: ["Şeffaf"], cm2Kurus: 60, kalinliklar: [{ mm: 3, carpan: 1 }, { mm: 5, carpan: 1.45 }], gorunum: { zemin: "#DCEBF3", kenar: "#8FB0C2", yazi: "#7E9AAA", saydamlik: 0.75 }, sira: 3 },
    { ad: "Siyah pleksi", aciklama: "Parlak siyah", renkler: ["Parlak", "Mat"], cm2Kurus: 65, kalinliklar: [{ mm: 3, carpan: 1 }, { mm: 5, carpan: 1.45 }], gorunum: { zemin: "#1F2321", kenar: "#000000", yazi: "#E6E6E6" }, sira: 4 },
    { ad: "Ayna altın pleksi", aciklama: "Ayna yüzey", renkler: ["Altın", "Gümüş", "Rose gold"], cm2Kurus: 95, kalinliklar: [{ mm: 3, carpan: 1 }], gorunum: { zemin: "#D4AF37", kenar: "#A8862A", yazi: "#6B5212" }, sira: 5 },
    { ad: "Bambu", aciklama: "Sert ve dayanıklı", renkler: ["Doğal"], cm2Kurus: 70, kalinliklar: [{ mm: 4, carpan: 1 }], gorunum: { zemin: "#E2C48E", kenar: "#B9995F", yazi: "#3B2A17" }, aktif: false, sira: 6 },
  ]);
  return katId;
}

export async function yukle(d: Db) {
  const katId = await temelVeri(d);

  const eklenen = await d
    .insert(urunler)
    .values(URUNLER.map(({ kategori, ...u }) => ({ ...u, kategoriId: katId[kategori] })))
    .returning({ id: urunler.id, slug: urunler.slug });
  const urunId = Object.fromEntries(eklenen.map((u) => [u.slug, u.id]));

  await d.insert(yorumlar).values([
    { urunId: urunId["kisiye-ozel-ahsap-isimlik"], ad: "Örnek müşteri", puan: 5, metin: "Tasarımı üretimden önce görmek içimi çok rahatlattı. Ürün özenle paketlenmişti.", durum: "yayinda", ornek: true },
    { urunId: urunId["kisiye-ozel-ahsap-isimlik"], ad: "Örnek müşteri", puan: 5, metin: "Önizleme geldiğinde küçük bir değişiklik istedim, hemen düzelttiler.", durum: "yayinda", ornek: true },
    { urunId: urunId["mekanik-ahsap-masa-saati"], ad: "Örnek müşteri", puan: 5, metin: "Kılavuz anlaşılır, parçalar tam oturuyor. Hafta sonu keyifle bitirdik.", durum: "yayinda", ornek: true },
    { urunId: urunId["ahsap-dunya-haritasi"], ad: "Örnek müşteri", puan: 4, metin: "Duvarda çok güzel duruyor, tahmin edilen tarihte kargodaydı.", durum: "yayinda", ornek: true },
  ]);

  await d.insert(kuponlar).values([
    { kod: "HOSGELDIN10", tur: "yuzde", deger: 10, altLimit: TL(300) },
    { kod: "KASIM50", tur: "tutar", deger: TL(50), altLimit: TL(500), sonKullanma: new Date("2026-11-30T23:59:59+03:00"), kullanimSiniri: 200 },
  ]);

  // Tasarım onayı akışını denemek için örnek sipariş: /siparis/1052?t=ornek-1052
  const [s] = await d
    .insert(siparisler)
    .values({
      no: 1052, token: "ornek-1052", durum: "onay", odemeYontemi: "kart", odemeDurumu: "odendi",
      musteri: { ad: "Ayşe Yılmaz", telefon: "0532 000 00 00", eposta: "ayse@ornek.com" },
      adres: { il: "İstanbul", ilce: "Kadıköy", adres: "Örnek Mah. Çınar Sok. No: 0 D: 0" },
      fatura: { kurumsal: false, ayniAdres: true },
      araToplam: TL(480), kargo: 0, toplam: TL(480), onayDurumu: "bekliyor",
    })
    .returning();
  await d.insert(siparisKalemleri).values({
    siparisId: s.id, urunId: urunId["kisiye-ozel-ahsap-isimlik"], tur: "urun", ad: "Kişiye Özel Ahşap İsimlik", kisisel: true,
    ozet: "Kayın kontrplak · 30 × 20 cm · Doğal · “Yılmaz Ailesi / Hoş geldiniz” · Great Vibes",
    secim: { Malzeme: "Kayın kontrplak", Boyut: "30 × 20 cm", "Ahşap rengi": "Doğal" },
    kisi: { ust: "Yılmaz Ailesi", alt: "Hoş geldiniz", font: "Great Vibes", renk: "Gravür (yakma)" },
    birimFiyat: TL(480), adet: 1,
  });
  await d.insert(siparisOlaylari).values([
    { siparisId: s.id, tur: "eposta", mesaj: "Sipariş alındı e-postası gönderildi" },
    { siparisId: s.id, tur: "eposta", mesaj: "Tasarım onay bağlantısı e-postayla gönderildi" },
  ]);
}
