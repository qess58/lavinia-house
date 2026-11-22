import Link from "next/link";
import { KilitIkon } from "@/components/Ikonlar";
import { ZiyaretSayaci } from "@/components/ZiyaretSayaci";
import { magazaAyarlari } from "@/lib/veri";

export const dynamic = "force-dynamic";

// Ödeme sayfası dikkat dağıtmayan sade bir üst bilgi kullanır.
export default async function OdemeDuzeni({ children }: { children: React.ReactNode }) {
  const a = await magazaAyarlari();
  return (
    <div style={{ background: "#F6F4F0", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="ch-hdr">
        <div className="wrap chr">
          <Link className="logo" href="/" aria-label="Lavinia House ana sayfa">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lm" src="/logo.png" alt="" width={44} height={44} />
            <span className="ln">Lavinia House</span>
          </Link>
          <span className="sm" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <KilitIkon />
            Güvenli ödeme
          </span>
        </div>
      </header>
      <div style={{ flex: 1 }}>{children}</div>
      <ZiyaretSayaci />
      <footer style={{ borderTop: "1px solid #E7E4DE", background: "#fff" }}>
        <div className="wrap xs mut" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", paddingTop: 22, paddingBottom: 22 }}>
          <span>
            © {new Date().getFullYear()} {a.unvan || "Lavinia House"}
            {a.etbisNo && ` · ETBİS: ${a.etbisNo}`}
          </span>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/bilgi/kvkk">KVKK</Link>
            <Link href="/bilgi/on-bilgilendirme-formu">Ön Bilgilendirme Formu</Link>
            <Link href="/bilgi/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link>
            <Link href="/bilgi/iade-ve-degisim">İade ve değişim</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
