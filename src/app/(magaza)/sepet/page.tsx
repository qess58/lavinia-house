import type { Metadata } from "next";
import { magazaAyarlari } from "@/lib/veri";
import { SepetSayfasi } from "@/components/SepetSayfasi";
import { SatisYakinda } from "@/components/SatisYakinda";

export const metadata: Metadata = { title: "Sepetim", robots: { index: false } };

export default async function Sepet() {
  const a = await magazaAyarlari();
  if (!a.onlineSatis)
    return (
      <main className="wrap mainy" style={{ paddingTop: 32 }}>
        <SatisYakinda whatsapp={a.whatsapp} />
      </main>
    );
  return (
    <main className="wrap mainy" style={{ paddingTop: 32 }}>
      <SepetSayfasi ayarlar={{ kargoUcreti: a.kargoUcreti, ucretsizKargoLimiti: a.ucretsizKargoLimiti, hediyePaketiUcreti: a.hediyePaketiUcreti, taksit6VadeYuzde: a.taksit6VadeYuzde }} />
    </main>
  );
}
