import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { magazaAyarlari, urunDetayi, yayindakiUrunler } from "@/lib/veri";
import { satisFiyati } from "@/lib/fiyat";
import { tahminiKargo } from "@/lib/bicim";
import { UrunYapilandirici } from "@/components/UrunYapilandirici";
import { UrunSekmeleri } from "@/components/UrunSekmeleri";
import { UrunKarti } from "@/components/UrunKarti";
import { jsonLd, mutlak } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const v = await urunDetayi(slug);
  if (!v) return { title: "Ürün bulunamadı" };
  const aciklama = v.urun.seoAciklama || v.urun.aciklama.split("\n")[0].slice(0, 160);
  return {
    title: v.urun.seoBaslik || v.urun.ad,
    description: aciklama,
    alternates: { canonical: `/urun/${v.urun.slug}` },
    // Gizli ürünler bağlantıyla açılır ama arama motorlarında listelenmez
    ...(v.urun.durum === "gizli" ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      title: v.urun.ad,
      description: aciklama,
      url: `/urun/${v.urun.slug}`,
      images: v.urun.gorseller.length ? v.urun.gorseller.slice(0, 4).map((g) => ({ url: g.yol, alt: g.alt || v.urun.ad })) : ["/logo-512.png"],
    },
  };
}

export default async function UrunSayfasi({ params }: Props) {
  const { slug } = await params;
  const [v, ayarlar, tum] = await Promise.all([urunDetayi(slug), magazaAyarlari(), yayindakiUrunler()]);
  if (!v) notFound();
  const { urun: u, kategori, yorumlar } = v;
  const puan = yorumlar.length ? Math.round((yorumlar.reduce((t, y) => t + y.puan, 0) / yorumlar.length) * 10) / 10 : null;
  const kisisel = u.kisisellestirme.length > 0;
  const benzer = tum.filter((x) => x.id !== u.id && x.kategoriSlug === kategori?.slug).concat(tum.filter((x) => x.id !== u.id && x.kategoriSlug !== kategori?.slug)).slice(0, 4);

  // Arama motorları için ürün bilgisi (Google'da fiyat, stok ve puanla görünmesi için)
  const adres = mutlak(`/urun/${u.slug}`);
  const yapisalVeri = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: u.ad,
      description: u.aciklama,
      sku: `LH-${u.id}`,
      url: adres,
      ...(u.gorseller.length ? { image: u.gorseller.map((g) => mutlak(g.yol)) } : {}),
      ...(u.malzeme ? { material: u.malzeme } : {}),
      ...(kategori ? { category: kategori.ad } : {}),
      brand: { "@type": "Brand", name: "Lavinia House" },
      // Online satış kapalıyken (vitrin modu) Google'a satın alınabilir teklif bildirilmez.
      ...(ayarlar.onlineSatis
        ? {
          offers: {
            "@type": "Offer",
            url: adres,
            priceCurrency: "TRY",
            price: (satisFiyati(u) / 100).toFixed(2),
            itemCondition: "https://schema.org/NewCondition",
            availability: u.stokTipi === "adet" && u.stok <= 0 ? "https://schema.org/OutOfStock" : kisisel ? "https://schema.org/MadeToOrder" : "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "Lavinia House" },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "TR" },
              shippingRate: { "@type": "MonetaryAmount", currency: "TRY", value: satisFiyati(u) >= ayarlar.ucretsizKargoLimiti ? "0" : (ayarlar.kargoUcreti / 100).toFixed(2) },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: { "@type": "QuantitativeValue", minValue: u.hazirlikGunMin, maxValue: u.hazirlikGunMax, unitCode: "DAY" },
                transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
              },
            },
          },
        }
        : {}),
      ...(puan ? { aggregateRating: { "@type": "AggregateRating", ratingValue: puan, reviewCount: yorumlar.length } } : {}),
      ...(yorumlar.length
        ? { review: yorumlar.slice(0, 5).map((y) => ({ "@type": "Review", author: { "@type": "Person", name: y.ad }, reviewRating: { "@type": "Rating", ratingValue: y.puan }, reviewBody: y.metin })) }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana sayfa", item: mutlak("/") },
        ...(kategori ? [{ "@type": "ListItem", position: 2, name: kategori.ad, item: mutlak(`/urunler?kategori=${kategori.slug}`) }] : []),
        { "@type": "ListItem", position: kategori ? 3 : 2, name: u.ad, item: adres },
      ],
    },
  ];

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(yapisalVeri)} />
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        {kategori && (
          <>
            <Link href={`/urunler?kategori=${kategori.slug}`}>{kategori.ad}</Link>
            <span aria-hidden="true">›</span>
          </>
        )}
        <span>{u.ad}</span>
      </nav>
      <UrunYapilandirici
        urun={{
          id: u.id, slug: u.slug, ad: u.ad, fiyat: u.fiyat, indirimliFiyat: u.indirimliFiyat, secenekler: u.secenekler, varyantlar: u.varyantlar,
          kisisellestirme: u.kisisellestirme, malzeme: u.malzeme, renk: u.renk, gorseller: u.gorseller, stokYok: u.stokTipi === "adet" && u.stok <= 0,
        }}
        puan={puan}
        yorumSayisi={yorumlar.length}
        kategori={kategori?.ad ?? null}
        kargoTarihi={tahminiKargo(u.hazirlikGunMin, u.hazirlikGunMax, kisisel)}
        uretimSuresi={u.uretimSuresi}
        fontlar={ayarlar.fontlar}
        ucretsizKargoLimiti={ayarlar.ucretsizKargoLimiti}
        whatsapp={ayarlar.whatsapp}
      />
      <UrunSekmeleri
        aciklama={u.aciklama}
        olculer={u.olculer}
        bakim={u.bakim}
        kisisel={kisisel}
        yorumlar={yorumlar.map((y) => ({ id: y.id, ad: y.ad, puan: y.puan, metin: y.metin, yanit: y.yanit, ornek: y.ornek }))}
        puan={puan}
        kargoUcreti={ayarlar.kargoUcreti}
        ucretsizKargoLimiti={ayarlar.ucretsizKargoLimiti}
      />
      {benzer.length > 0 && (
        <section style={{ padding: "24px 0 80px" }} aria-labelledby="h-ben">
          <div className="shd">
            <h2 id="h-ben">Bunlar da ilginizi çekebilir</h2>
            <Link className="btn s" href="/urunler">Tümünü gör</Link>
          </div>
          <div className="grid g4">
            {benzer.map((b) => (
              <UrunKarti key={b.id} u={b} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
