// Arama motorları için ortak yardımcılar (yapısal veri, mutlak adresler).
import type { MagazaAyarlari } from "./tipler";

import { siteAdresi } from "./site";
export { siteAdresi };
export const mutlak = (yol: string) => (/^https?:\/\//.test(yol) ? yol : `${siteAdresi()}${yol.startsWith("/") ? "" : "/"}${yol}`);

/** JSON-LD'yi sayfaya güvenle gömmek için (</script> kaçışı). */
export const jsonLd = (veri: unknown) => ({ __html: JSON.stringify(veri).replace(/</g, "\\u003c") });

export function kurulusVerisi(a: MagazaAyarlari) {
  const site = siteAdresi();
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${site}/#magaza`,
      name: "Lavinia House",
      url: site,
      logo: `${site}/logo-512.png`,
      description: "Lazerle kesilen mekanik ahşap modeller, isimlikler ve kişiye özel hediyeler.",
      ...(a.telefon ? { telephone: a.telefon } : {}),
      ...(a.eposta ? { email: a.eposta } : {}),
      ...(a.adres ? { address: { "@type": "PostalAddress", streetAddress: a.adres, addressCountry: "TR" } } : {}),
      ...(a.instagram ? { sameAs: [`https://www.instagram.com/${a.instagram}/`] } : {}),
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "TR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Lavinia House",
      url: site,
      inLanguage: "tr-TR",
      potentialAction: { "@type": "SearchAction", target: `${site}/urunler?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
  ];
}
