// "Yayına hazırlık" kontrol listesi: canlıya çıkmadan önce eksik kalan ayar, metin ve bağlantıları bulur.
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db, veritabaniAdresi } from "@/db";
import { kategoriler, siparisKalemleri, siparisler, siparisOlaylari, urunler, yorumlar } from "@/db/schema";
import { bulutDepo, dogrudanYukleme } from "./depo";
import { siteAdresi, vercelde } from "./site";
import { epostaBagli } from "./eposta";
import { testModu } from "./odeme";
import { SAYFALAR, kayitliSayfalar } from "./sayfalar";
import { magazaAyarlari } from "./veri";

export type Durum = "tamam" | "eksik" | "uyari" | "bilgi";
export type Madde = { ad: string; durum: Durum; aciklama: string; link?: string; linkAd?: string };
export type Grup = { baslik: string; not?: string; maddeler: Madde[] };

export const ORNEK_URUNLER = [
  "kisiye-ozel-ahsap-isimlik", "mekanik-ahsap-masa-saati", "ahsap-dunya-haritasi", "gravurlu-kesme-tahtasi", "disli-muzik-kutusu", "pleksi-kapi-tabelasi",
  "dugun-masa-isimligi", "pleksi-anahtarlik", "mekanik-ahsap-araba", "bambu-bardak-altligi-seti", "ahsap-kalem-kutusu", "bebek-odasi-isim-panosu",
];

export async function hazirlikDurumu(): Promise<{ gruplar: Grup[]; eksik: number; uyari: number; ornekTemizlenebilir: boolean }> {
  const d = await db();
  const [a, sayfalar, [{ kat }], yayinda, [{ ornekYorum }], [{ ornekSiparis }]] = await Promise.all([
    magazaAyarlari(),
    kayitliSayfalar(),
    d.select({ kat: count() }).from(kategoriler),
    d.select({ slug: urunler.slug, ad: urunler.ad, gorseller: urunler.gorseller }).from(urunler).where(and(eq(urunler.durum, "yayinda"), isNull(urunler.silinme))),
    d.select({ ornekYorum: count() }).from(yorumlar).where(eq(yorumlar.ornek, true)),
    d.select({ ornekSiparis: count() }).from(siparisler).where(eq(siparisler.token, "ornek-1052")),
  ]);
  const ornekUrunler = yayinda.filter((u) => ORNEK_URUNLER.includes(u.slug) && u.gorseller.length === 0);
  const fotografsiz = yayinda.filter((u) => u.gorseller.length === 0);
  const site = siteAdresi("");
  const canli = process.env.NODE_ENV === "production";
  const m = (kosul: boolean, ad: string, eksikAciklama: string, tamamAciklama: string, link?: string, linkAd?: string, eksikDurum: Durum = "eksik"): Madde => ({
    ad,
    durum: kosul ? "tamam" : eksikDurum,
    aciklama: kosul ? tamamAciklama : eksikAciklama,
    link: kosul ? undefined : link,
    linkAd,
  });

  const gruplar: Grup[] = [
    {
      baslik: "Mağaza ve satıcı bilgileri",
      maddeler: [
        m(!!(a.telefon && a.eposta && a.adres), "İletişim bilgileri", "Telefon, e-posta ve adres sitede görünmeli; müşteri güveni ve yasal zorunluluk için gerekli.", `${a.telefon} · ${a.eposta}`, "/yonetim/ayarlar", "Ayarlar’a git"),
        m(!!(a.unvan && a.vergiNo), "Satıcı bilgileri", "Ticari unvan (ya da ad soyad) ve vergi numarası yasal metinlerde ve iletişim sayfasında yer almalı.", a.unvan, "/yonetim/ayarlar", "Ayarlar’a git"),
        m(!!a.etbisNo, "ETBİS kaydı", "İnternetten satış yapacak işletmelerin Ticaret Bakanlığı’nın ETBİS sistemine kayıt olması gerekir. Kayıt numarasını Ayarlar’a yazın; alt bilgide görünür.", `Kayıt no: ${a.etbisNo}`, "/yonetim/ayarlar", "Ayarlar’a git"),
        m(!!a.iban || !a.onlineSatis, "Havale / EFT için IBAN", "IBAN girilmeden canlı sitede havale seçeneği görünmez.", a.iban || "Vitrin modunda gerekmez", "/yonetim/ayarlar", "Ayarlar’a git"),
        m(!!a.whatsapp, "WhatsApp numarası", a.onlineSatis ? "Müşterilerin size hızlıca ulaşması için WhatsApp numaranızı girin." : "Vitrin modunda siparişler WhatsApp’tan geldiği için numara şart.", `+${a.whatsapp}`, "/yonetim/ayarlar", "Ayarlar’a git", a.onlineSatis ? "uyari" : "eksik"),
      ],
    },
    {
      baslik: "Yasal metinler ve sayfalar",
      maddeler: [
        ...SAYFALAR.filter((s) => s.yasal).map((s) => {
          const satisMetni = s.adres === "on-bilgilendirme-formu" || s.adres === "mesafeli-satis-sozlesmesi";
          return m(
            !!sayfalar[s.adres]?.icerik?.trim(),
            s.baslik,
            satisMetni && !a.onlineSatis
              ? "Vitrin modunda gerekmez; online satışı açmadan önce bir hukukçuya hazırlatıp Sayfalar bölümüne yapıştırın."
              : "Yayından önce bir hukukçuya hazırlatıp Sayfalar bölümüne yapıştırın. Teklif ve iletişim formları kişisel veri topladığı için vitrin modunda da gerekir.",
            "Yazıldı",
            `/yonetim/sayfalar/${s.adres}`,
            "Metni ekle",
            satisMetni && !a.onlineSatis ? "uyari" : "eksik",
          );
        }),
        m(!!sayfalar.hakkimizda?.icerik?.trim(), "Hakkımızda", "Şu an hazır bir metin görünüyor. Kendi hikâyenizi yazmanız güven verir.", "Kendi metniniz yazıldı", "/yonetim/sayfalar/hakkimizda", "Düzenle", "uyari"),
      ],
    },
    {
      baslik: "Ürünler",
      maddeler: [
        m(kat > 0 && yayinda.length > 0, "Kategori ve ürün", "Mağazada yayında en az bir kategori ve ürün olmalı.", `${kat} kategori · ${yayinda.length} yayında ürün`, "/yonetim/urunler/yeni", "Ürün ekle"),
        m(
          fotografsiz.length === 0,
          "Ürün fotoğrafları",
          `${fotografsiz.length} yayındaki ürünün fotoğrafı yok: ${fotografsiz.slice(0, 4).map((u) => u.ad).join(", ")}${fotografsiz.length > 4 ? "…" : ""}`,
          "Yayındaki tüm ürünlerin fotoğrafı var",
          "/yonetim/urunler",
          "Ürünlere git",
          "uyari",
        ),
        m(
          ornekUrunler.length === 0 && ornekYorum === 0 && ornekSiparis === 0,
          "Örnek veriler",
          [ornekUrunler.length && `${ornekUrunler.length} örnek ürün`, ornekYorum && `${ornekYorum} örnek yorum`, ornekSiparis && "örnek sipariş #1052"].filter(Boolean).join(", ") + " duruyor. Satmadığınız örnek ürünleri Ürünler’den silin; örnek yorum ve siparişi aşağıdaki düğmeyle temizleyebilirsiniz.",
          "Örnek ürün, yorum ve sipariş yok",
          undefined,
          undefined,
          "uyari",
        ),
      ],
    },
    {
      baslik: "Ödeme ve e-posta",
      not: "Hesapları siz açarsınız (sanal POS, e-posta); bağlantısını siteyi sunucuya kurarken birlikte yaparız.",
      maddeler: [
        a.onlineSatis
          ? {
              ad: "Kartla ödeme (sanal POS)",
              durum: testModu() ? "eksik" : "tamam",
              aciklama: testModu()
                ? "Gerçek kart ödemesi için iyzico, PayTR gibi bir ödeme kuruluşuyla anlaşma gerekiyor. Hesap onaylanınca bağlıyoruz. O zamana kadar canlı sitede kart seçeneği kapalı, havale / EFT açık kalır."
                : `Bağlı: ${process.env.ODEME_SAGLAYICI}`,
            }
          : {
              ad: "Satış modu",
              durum: "tamam",
              aciklama: "Vitrin modu: online satış kapalı, siparişler WhatsApp ve teklif formuyla alınıyor. Sanal POS hazır olunca Ayarlar’dan satışı açabilirsiniz.",
              link: "/yonetim/ayarlar",
              linkAd: "Satış modu",
            },
        m(epostaBagli(), "E-posta gönderimi", "Müşteriye sipariş, kargo ve tasarım onayı e-postaları gitmesi için bir e-posta hesabı (SMTP) bağlanmalı. Şu an e-postalar gönderilmiyor.", "Bağlı"),
        m(!!(process.env.MAGAZA_EPOSTA || a.eposta), "Yeni sipariş bildirimi", "Yeni sipariş ve teklifler size e-postayla gelsin diye Ayarlar’a e-posta adresinizi yazın.", `Bildirimler ${process.env.MAGAZA_EPOSTA || a.eposta} adresine gider`, "/yonetim/ayarlar", "Ayarlar’a git"),
      ],
    },
    {
      baslik: "Sunucu ve alan adı",
      not: "Bunlar siteyi sunucuya kurarken ayarlanır; bilgisayarınızda denerken eksik görünmesi normal.",
      maddeler: [
        m(site.startsWith("https://") && !site.includes("localhost"), "Site adresi (SITE_URL)", "Canlı sunucuda SITE_URL, sitenin https ile başlayan tam adresi olmalı (e-postadaki bağlantılar ve Google için).", site),
        m(!!veritabaniAdresi(), "Canlı veritabanı", "Şu an bilgisayarınızdaki deneme veritabanı kullanılıyor. Canlı sunucuda yedeklenen bir PostgreSQL veritabanı kullanılmalı.", "PostgreSQL bağlı"),
        ...(vercelde()
          ? [
              m(bulutDepo(), "Dosya deposu (Vercel Blob)", "Vercel'de ürün fotoğrafları ve müşteri dosyaları için Storage → Blob deposu bağlanmalı; bağlanmadan fotoğraf ve dosya yüklenemez.", "Blob deposu bağlı"),
              ...(bulutDepo()
                ? [m(dogrudanYukleme(), "Büyük dosya yükleme", "Blob bağlantısında okuma-yazma anahtarı (BLOB_READ_WRITE_TOKEN) yok; müşteriler 4,5 MB'tan büyük dosya yükleyemez. Vercel'de Storage → Blob → Projects → bağlantıyı düzenleyip “read-write token” seçeneğini açın.", "Müşteriler 50 MB'a kadar dosya yükleyebilir", undefined, undefined, "uyari")]
                : []),
            ]
          : []),
        m(canli, "Canlı mod", "Site şu an geliştirme modunda çalışıyor (npm run dev).", "Canlı modda çalışıyor", undefined, undefined, "bilgi"),
        m(!!a.googleDogrulama, "Google Search Console", "Site yayına girince Search Console’a kaydolup doğrulama kodunu Ayarlar’a yapıştırın ve site haritasını gönderin.", "Doğrulama kodu eklendi", "/yonetim/ayarlar", "Ayarlar’a git", "uyari"),
      ],
    },
    {
      baslik: "Panel dışında yapılacaklar",
      maddeler: [
        { ad: "Fatura (e-Arşiv)", durum: "bilgi", aciklama: "Her internet satışına fatura kesilmesi gerekir. Hangi faturayı nasıl keseceğinizi (e-Arşiv, e-Fatura) mali müşavirinizle netleştirin." },
        { ad: "İleti Yönetim Sistemi (İYS)", durum: "bilgi", aciklama: "Bülten abonelerine kampanya e-postası göndermeden önce İYS’ye kayıt gerekir. Sipariş ve kargo e-postaları için gerekmez." },
        { ad: "Yedekleme", durum: "bilgi", aciklama: "Canlı veritabanının ve yüklenen fotoğraf / dosyaların düzenli yedeğinin alındığından emin olun." },
        { ad: "Eski siteden geçiş", durum: "bilgi", aciklama: "Alan adı yeni siteye yönlendirilirken eski sayfa adresleri yeni adreslere yönlendirilmeli; yoksa Google’daki mevcut sıralama kaybolabilir." },
      ],
    },
  ];
  const tum = gruplar.flatMap((g) => g.maddeler);
  return { gruplar, eksik: tum.filter((x) => x.durum === "eksik").length, uyari: tum.filter((x) => x.durum === "uyari").length, ornekTemizlenebilir: ornekYorum > 0 || ornekSiparis > 0 };
}

export async function ornekVerileriTemizle() {
  const d = await db();
  const [s] = await d.select({ id: siparisler.id }).from(siparisler).where(eq(siparisler.token, "ornek-1052"));
  await d.transaction(async (tx) => {
    await tx.delete(yorumlar).where(eq(yorumlar.ornek, true));
    if (s) {
      await tx.delete(siparisOlaylari).where(eq(siparisOlaylari.siparisId, s.id));
      await tx.delete(siparisKalemleri).where(eq(siparisKalemleri.siparisId, s.id));
      await tx.delete(siparisler).where(inArray(siparisler.id, [s.id]));
    }
  });
}
