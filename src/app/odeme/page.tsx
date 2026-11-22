import type { Metadata } from "next";
import { magazaAyarlari } from "@/lib/veri";
import { havaleAcik, kartOdemeAcik, testModu } from "@/lib/odeme";
import { OdemeSayfasi } from "@/components/OdemeSayfasi";
import { SatisYakinda } from "@/components/SatisYakinda";

export const metadata: Metadata = { title: "Ödeme", robots: { index: false } };

export default async function Odeme() {
  const a = await magazaAyarlari();
  if (!a.onlineSatis)
    return (
      <main className="wrap" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <SatisYakinda whatsapp={a.whatsapp} />
      </main>
    );
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 72 }}>
      <OdemeSayfasi
        ayarlar={{ kargoUcreti: a.kargoUcreti, ucretsizKargoLimiti: a.ucretsizKargoLimiti, hediyePaketiUcreti: a.hediyePaketiUcreti, taksit6VadeYuzde: a.taksit6VadeYuzde }}
        testModu={testModu() && kartOdemeAcik()}
        kartAcik={kartOdemeAcik()}
        havaleAcik={havaleAcik(a.iban)}
      />
    </main>
  );
}
