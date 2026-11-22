import type { MetadataRoute } from "next";
import { magazaKategorileri, yayindakiUrunler } from "@/lib/veri";
import { siteAdresi } from "@/lib/site";

export const dynamic = "force-dynamic";

// Arama motorları için site haritası: tüm yayındaki ürünler ve kategoriler.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteAdresi();
  const [urunler, { dolu: kategoriler }] = await Promise.all([yayindakiUrunler(), magazaKategorileri()]);
  return [
    { url: `${site}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site}/urunler`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/kendin-tasarla`, priority: 0.8 },
    { url: `${site}/teklif`, priority: 0.7 },
    ...kategoriler.map((k) => ({ url: `${site}/urunler?kategori=${k.slug}`, priority: 0.8 })),
    ...urunler.map((u) => ({ url: `${site}/urun/${u.slug}`, priority: 0.8 })),
  ];
}
