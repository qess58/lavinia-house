# Lavinia House – web sitesi

Lavinia House mağazasının kaynak kodu: mağaza (ana sayfa, ürünler, ürün detayı, kendin tasarla, sepet, ödeme, sipariş takibi ve tasarım onayı, teklif formu). Yönetim paneli bir sonraki aşamada eklenecek.

## Bilgisayarınızda açmak (Windows)

1. [nodejs.org](https://nodejs.org) adresinden **Node.js LTS** sürümünü kurun (bir kez).
2. Bu klasördeki **`baslat.bat`** dosyasına çift tıklayın.
   - İlk açılışta gerekli paketler indirilir (birkaç dakika).
   - Tarayıcıda `http://localhost:3000` açılır.
3. Kapatmak için açılan siyah pencereyi kapatın.

Ayrı bir veritabanı kurmanıza gerek yok: site, ilk açılışta bu klasörün içinde `.veri/` adında küçük bir veritabanı oluşturur ve **örnek ürünleri** yükler. Örnek verileri silip baştan başlamak için `.veri` klasörünü silin.

Komut satırından:

```bash
npm install
npm run dev        # geliştirme: http://localhost:3000
npm run build      # canlıya hazır derleme
npm start          # derlenmiş siteyi çalıştırır
```

## Denemek için

- **Tasarım onayı:** `http://localhost:3000/siparis/1052?t=ornek-1052` adresindeki örnek siparişte tasarımı onaylayabilir ya da düzeltme isteyebilirsiniz.
- **Kupon:** `HOSGELDIN10` (300 ₺ üzeri %10).
- **Ödeme:** Test modundadır; kart bilgisi istenmez, gerçek para çekilmez.
- **E-postalar:** Henüz gönderilmez; içerikleri siyah pencereye (sunucu konsolu) yazılır.

## Yönetim paneli

Adres: `http://localhost:3000/yonetim`. İlk açılışta **İlk kurulum** sayfasında sahibi olarak hesabınızı oluşturursunuz (canlı sunucuda `KURULUM_ANAHTARI` gerekir).

| Bölüm | Neler yapılır |
|---|---|
| Genel bakış | Bu ayın cirosu, bugünkü ziyaretçi, bekleyen işler listesi, stoğu azalanlar |
| Siparişler | Durum sekmeleri; havale onayı; tasarım görseli yükleyip müşteri onayına gönderme; düzeltme notları; kargo firması ve takip no; teslim; iptal (stok geri eklenir); iç not; lazer için **SVG indir** |
| Ürünler | Ekle / düzenle / kopyala / sil; fotoğraf yükleme (otomatik küçültülür); seçenekler ve kombinasyonlar; kişiselleştirme alanları; stok; Google görünümü (SEO) |
| Kategoriler | Ekle, sırala, menüde göster, sil (ürünleri taşıyarak) |
| Teklifler | Gelen talepler, müşteri dosyalarını indirme, teklif tutarı ve mesajı gönderme |
| Kuponlar | Yüzde / tutar indirim, alt limit, son gün, kullanım sınırı |
| Yorumlar | Teslim edilen siparişlerden gelen değerlendirmeleri yayınlama / gizleme / yanıtlama |
| Raporlar | Aylık ciro, hangi üründen kaç adet satıldı, günlük ciro ve ziyaretçi, ziyaretçi kaynağı (Google, Instagram…), cihaz, en çok bakılan ürünler, son 12 ay; CSV (Excel) indirme |
| Ayarlar | İletişim, kargo ücretleri, IBAN, Instagram, Google Search Console kodu, şifre değiştirme, panel kullanıcıları |

**Ziyaretçi sayacı** çerez kullanmaz (çerez onay penceresi gerektirmez); IP adresi kaydedilmez. Panele giriş yaptığınız tarayıcıdan yapılan ziyaretler ve arama motoru botları sayılmaz.

**Instagram:** Ayarlar’a kullanıcı adını yazın; profilinizdeki bağlantıya `siteadresi.com/instagram` koyun. Oradan gelenler Raporlar’da “Instagram” olarak ayrı görünür.

**Google (SEO):** Ürün sayfalarında Google’ın okuduğu ürün bilgisi (fiyat, stok, puan, kargo), site haritası ve kategori sayfaları hazır. Site yayına girince Search Console’a kaydolup doğrulama kodunu Ayarlar’a yapıştırın ve `sitemap.xml` gönderin (adımlar Ayarlar sayfasında yazıyor).

Yüklenen ürün ve tasarım görselleri `.veri/medya`, müşteri dosyaları `.veri/yuklemeler` klasöründe durur; bu klasörü yedeklemeyi unutmayın.

## Yayına hazırlık

Panelde **Yayına hazırlık** sayfası, canlıya çıkmadan önce eksik kalanları (satıcı bilgileri, yasal metinler, ürün fotoğrafları, ödeme, e-posta, sunucu ayarları) otomatik kontrol eder. Yasal metinler ve bilgi sayfaları **Sayfalar** bölümünden yazılır.

Canlı sunucuda gerçek ödeme altyapısı bağlanana kadar kartla ödeme kapalıdır; IBAN girildiyse havale / EFT açıktır. E-posta için `.env` dosyasındaki `SMTP_*` alanlarını doldurun (bkz. `.env.example`).

## Neler var

| Sayfa | Adres |
|---|---|
| Ana sayfa | `/` |
| Ürün listesi, filtreler, arama | `/urunler` |
| Ürün detayı, canlı önizlemeli kişiselleştirme | `/urun/[slug]` |
| Kendin tasarla (cm² × malzeme fiyatı × kalınlık çarpanı) | `/kendin-tasarla` |
| Sepet, kupon, ücretsiz kargo çubuğu | `/sepet` |
| Ödeme (üyeliksiz, kurumsal fatura, hediye paketi, taksit) | `/odeme` |
| Sipariş takibi ve tasarım onayı | `/siparis`, `/siparis/[no]` |
| Dosyanı yükle / kurumsal teklif | `/teklif` |
| Bilgi ve yasal sayfalar | `/bilgi/[sayfa]` |
| Site haritası, robots | `/sitemap.xml`, `/robots.txt` |
| Yönetim paneli | `/yonetim` |

Güvenlik açısından önemli: **fiyatlar her siparişte sunucuda veritabanından yeniden hesaplanır**; tarayıcıdaki sepet fiyatına güvenilmez. Stok, kapalı varyantlar, zorunlu kişiselleştirme alanları ve kupon kuralları sunucuda kontrol edilir.

## Vercel'e yayınlama

Site **GitHub'daki `qess58/lavinia-house` deposuna** bağlı Vercel projesinde (`lavinia-house`) çalışır. Depodaki `main` dalına yüklenen her değişiklik Vercel'de otomatik olarak derlenip yayınlanır; ayrıca bir şey yapmanız gerekmez.

Yedek yol olarak klasördeki **`vercel-yayinla.bat`** ile bilgisayardan da yayınlanabilir. Pencere sırayla şunları yapar:

1. Vercel aracını (Vercel CLI) kurar ve Vercel hesabınıza girişi ister (tarayıcıda onaylarsınız).
2. Klasörü `lavinia-house` adlı Vercel projesine bağlar (ilk seferde projeyi oluşturur).
3. Eksikse ekler: **Neon Postgres** veritabanı (ücretsiz plan, bölge olarak Frankfurt seçin), **Vercel Blob** dosya deposu (gizli erişim, Frankfurt) ve yönetici **kurulum anahtarı**.
4. Siteyi canlıya yükler ve adresi gösterir (genellikle `https://lavinia-house.vercel.app`).

Ardından `[site adresi]/yonetim/kurulum` sayfasında pencerede yazan kurulum anahtarıyla yönetici hesabınızı açın. Anahtar `.vercel/kurulum-anahtari.txt` dosyasında da durur.

- **Güncelleme:** Kodda değişiklik olunca aynı dosyayı tekrar çalıştırmanız yeterli; veritabanı ve dosyalar korunur.
- **Veritabanı tabloları** her yayında derleme sırasında güncellenir (`scripts/goc.mjs`).
- **Canlı veritabanı** ilk açıldığında yalnızca mağaza ayarları, kategoriler ve malzemeler yüklenir; ürünleri panelden girersiniz. Örnek ürünlerin de gelmesi için Vercel'de `ORNEK_VERI=1` ekleyip boş bir veritabanıyla yayınlayın.
- **Dosyalar:** Ürün fotoğrafları ve müşteri dosyaları Vercel Blob'a yazılır. Büyük dosyalar (50 MB'a kadar) tarayıcıdan doğrudan Blob'a yüklenir, panelde büyük fotoğraflar yüklemeden önce küçültülür.
- **Alan adı:** Vercel'de proje → Settings → Domains → `laviniahouse.com` ekleyin, Vercel'in gösterdiği DNS kayıtlarını GoDaddy'de girin. Site adresi (SITE_URL) Vercel'de otomatik bulunur.
- **E-posta:** SMTP bilgilerini Vercel'de proje → Settings → Environment Variables bölümüne ekleyip yeniden yayınlayın.
- **Plan:** Vercel'in ücretsiz Hobby planı ticari olmayan kullanım içindir. Online satışı açtığınızda Pro plana geçin.

Bilgisayarınızdaki deneme sitesi (`baslat.bat`) bundan etkilenmez; kendi deneme veritabanını kullanmaya devam eder.

## Teknik yapı

- **Next.js 16** (App Router, TypeScript), **React 19**
- **Drizzle ORM** + **PostgreSQL**. `DATABASE_URL` yoksa gömülü PostgreSQL (**PGlite**) kullanılır.
- Tablo değişiklikleri `drizzle/` klasöründeki göçlerle yapılır; bilgisayarda açılışta, Vercel'de derleme sırasında uygulanır. Şema: `src/db/schema.ts`. Yeni göç: `npx drizzle-kit generate`.
- Dosyalar `src/lib/depo.ts` üzerinden bilgisayarda `.veri/` klasörüne, Vercel'de **Vercel Blob**'a yazılır.
- Yazı tipleri siteyle birlikte gelir (Google'a istek atılmaz, KVKK açısından daha uygun).
- Para tutarları veritabanında **kuruş** olarak tam sayı tutulur.

```
src/
  app/(magaza)/      mağaza sayfaları (ortak üst/alt bilgi)
  app/odeme/         sade başlıklı ödeme sayfası
  app/api/           sipariş, onay, teklif, arama, kupon, yükleme, bülten
  app/yonetim/       yönetim paneli (giriş, siparişler, ürünler, raporlar, ayarlar…)
  components/        sayfa parçaları
  db/                şema, bağlantı, örnek veriler
  lib/               fiyat, sipariş, ödeme, e-posta, yönetici girişi, ziyaret sayacı, raporlar, SEO, lazer SVG
drizzle/             veritabanı göçleri
```

## Canlıya almadan önce yapılacaklar

1. **Gerçek ürünleri** panelden girin, örnek ürünleri silin (örnek sipariş ve yorumlar raporlara karışmasın diye `.veri` klasörü yerine canlıda boş bir veritabanıyla başlayın).
2. **Ödeme altyapısı:** iyzico veya PayTR üye işyeri hesabı → `src/lib/odeme.ts`.
3. **E-posta servisi:** Resend, Brevo veya kendi SMTP'niz → `src/lib/eposta.ts`.
4. **Dosya depolama:** Vercel'de Vercel Blob kullanılır (yukarıdaki "Vercel'e yayınlama" bölümü).
5. **Barındırma:** Vercel + Neon (PostgreSQL). Ortam değişkenleri için `.env.example` dosyasına bakın.
6. **İçerik:** Gerçek ürünler ve fotoğraflar, iletişim bilgileri, IBAN, ETBİS kaydı.
7. **Yasal metinler:** KVKK, mesafeli satış sözleşmesi, ön bilgilendirme formu, çerez politikası (bir hukukçuya hazırlatın).
8. Örnek yorumlar ve örnek sipariş yalnızca geliştirme içindir; canlı veritabanına yüklemeyin.
