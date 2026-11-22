import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { urunler } from "@/db/schema";
import { TeklifFormu } from "@/components/TeklifFormu";

export const metadata: Metadata = {
  title: "Dosyanı yükle, teklif al",
  description: "Çiziminizi, logonuzu ya da bir fotoğrafı yükleyin; 1 iş günü içinde fiyat ve teslim tarihiyle dönelim. Kurumsal ve toplu siparişler.",
  alternates: { canonical: "/teklif" },
};

type Arama = Promise<{ tur?: string; urun?: string; not?: string }>;

export default async function Teklif({ searchParams }: { searchParams: Arama }) {
  const { tur, urun, not } = await searchParams;
  // Ürün sayfasından ya da tasarım stüdyosundan gelindiyse açıklama önceden doldurulur.
  const [u] = urun ? await (await db()).select({ ad: urunler.ad }).from(urunler).where(and(eq(urunler.slug, String(urun)), isNull(urunler.silinme))) : [];
  const ek = typeof not === "string" ? not.slice(0, 1200) : "";
  const adet = ek.match(/Adet: (\d+)/)?.[1] ?? "";
  const onDolum = [u ? `“${u.ad}” için fiyat ve sipariş bilgisi almak istiyorum.` : "", ek.replace(/\n?Adet: \d+/, "").trim()].filter(Boolean).join("\n");
  return (
    <main className="wrap mainy">
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        <span>Dosyanı yükle, teklif al</span>
      </nav>
      <TeklifFormu baslangic={tur === "kurumsal" ? "kurumsal" : "bireysel"} onDolum={onDolum} adet={adet} />
    </main>
  );
}
