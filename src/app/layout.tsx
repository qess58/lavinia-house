import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/great-vibes/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/pacifico/400.css";
import "./globals.css";
import { Saglayicilar } from "@/components/Saglayicilar";
import { siteAdresi } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteAdresi()),
  title: { default: "Lavinia House · Mekanik ahşap modeller ve kişiye özel ürünler", template: "%s · Lavinia House" },
  description: "Lazerle kesilen mekanik ahşap modeller, isimlikler ve kişiye özel hediyeler. Kişiye özel her siparişte tasarımı üretimden önce onayınıza sunuyoruz.",
  openGraph: { siteName: "Lavinia House", locale: "tr_TR", type: "website", images: ["/logo-512.png"] },
};

export const viewport: Viewport = { themeColor: "#4A2E85", width: "device-width", initialScale: 1 };

export default function KokSayfa({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Saglayicilar>
          <div className="site">{children}</div>
        </Saglayicilar>
      </body>
    </html>
  );
}
