import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { magazaAyarlari } from "@/lib/veri";
import { isaretleriDoldur, sayfaIcerigi, sayfaTanimi } from "@/lib/sayfalar";
import { SayfaMetni } from "@/components/SayfaMetni";

// Bilgi ve yasal sayfalar. Metinler yönetim panelindeki “Sayfalar” bölümünden yazılır.
type Props = { params: Promise<{ sayfa: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = sayfaTanimi((await params).sayfa);
  return t ? { title: t.baslik, alternates: { canonical: `/bilgi/${t.adres}` } } : { title: "Sayfa bulunamadı" };
}

export default async function BilgiSayfasi({ params }: Props) {
  const { sayfa } = await params;
  const t = sayfaTanimi(sayfa);
  if (!t) notFound();
  const [a, { icerik }] = await Promise.all([magazaAyarlari(), sayfaIcerigi(sayfa)]);
  const bos = !icerik.trim();
  return (
    <main className="wrap mainy">
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        <span>{t.baslik}</span>
      </nav>
      <article className="prose">
        <h1 style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>{t.baslik}</h1>
        {bos ? (
          <p className="uyari">Bu metin henüz eklenmedi. Sorularınız için {a.eposta || "e-posta"} adresinden bize yazabilirsiniz.</p>
        ) : (
          <SayfaMetni metin={isaretleriDoldur(icerik, a)} />
        )}
        {sayfa === "iletisim" && (
          <p>
            Teklif talepleri için <Link href="/teklif">Dosyanı yükle</Link> sayfasını kullanabilirsiniz.
          </p>
        )}
        {sayfa === "gizlilik-ve-cerezler" && (
          <>
            <h2 style={{ fontSize: 21 }}>Ziyaret istatistikleri</h2>
            <p>
              Sitemiz ziyaret sayılarını ölçmek için çerez veya benzeri bir tanımlayıcı kullanmaz. Bir sayfayı açtığınızda yalnızca açılan sayfanın
              adresi, hangi siteden geldiğiniz (ör. Google, Instagram) ve cihaz türünüz (mobil, masaüstü) toplu sayılara eklenir. Aynı gün içinde
              sizi iki kez saymamak için IP adresiniz ve tarayıcı bilginiz her gün değişen bir anahtarla geri döndürülemez biçimde özetlenir; bu özet
              en geç 2 gün sonra silinir, IP adresinizin kendisi kaydedilmez. Bu bilgiler üçüncü taraflarla paylaşılmaz.
            </p>
            <h2 style={{ fontSize: 21 }}>Tarayıcı hafızası</h2>
            <p>Sepetiniz ve favorileriniz, siz siteden çıkınca kaybolmasın diye yalnızca kendi tarayıcınızda saklanır; sunucumuza gönderilmez.</p>
          </>
        )}
      </article>
    </main>
  );
}
