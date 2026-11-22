"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type MenuSayilari = Partial<Record<"siparisler" | "teklifler" | "yorumlar" | "hazirlik", number>>;

const BOLUMLER: { href: string; ad: string; sayi?: keyof MenuSayilari }[] = [
  { href: "/yonetim", ad: "Genel bakış" },
  { href: "/yonetim/siparisler", ad: "Siparişler", sayi: "siparisler" },
  { href: "/yonetim/urunler", ad: "Ürünler" },
  { href: "/yonetim/kategoriler", ad: "Kategoriler" },
  { href: "/yonetim/teklifler", ad: "Teklifler", sayi: "teklifler" },
  { href: "/yonetim/kuponlar", ad: "Kuponlar" },
  { href: "/yonetim/yorumlar", ad: "Yorumlar", sayi: "yorumlar" },
  { href: "/yonetim/raporlar", ad: "Raporlar" },
  { href: "/yonetim/sayfalar", ad: "Sayfalar" },
  { href: "/yonetim/ayarlar", ad: "Ayarlar" },
  { href: "/yonetim/hazirlik", ad: "Yayına hazırlık", sayi: "hazirlik" },
];

export function PanelMenu({ sayilar }: { sayilar: MenuSayilari }) {
  const yol = usePathname();
  return (
    <nav className="y-nav" aria-label="Yönetim">
      {BOLUMLER.map((b) => {
        const on = b.href === "/yonetim" ? yol === b.href : yol.startsWith(b.href);
        const n = b.sayi ? sayilar[b.sayi] ?? 0 : 0;
        return (
          <Link key={b.href} className={`y-na ${on ? "y-on" : ""}`} href={b.href} aria-current={on ? "page" : undefined}>
            {b.ad}
            {n > 0 && (
              <span className="y-cnt" aria-label={`${n} bekleyen`}>
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
