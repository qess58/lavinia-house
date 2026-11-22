import type { Metadata } from "next";
import Link from "next/link";
import { SiparisSorgu } from "@/components/SiparisSorgu";

export const metadata: Metadata = { title: "Sipariş takibi", robots: { index: false } };

export default function SiparisTakibi() {
  return (
    <main className="wrap mainy">
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        <span>Sipariş takibi</span>
      </nav>
      <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 18 }}>
        <h1 style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>Siparişinizi takip edin</h1>
        <p className="mut" style={{ fontSize: 17 }}>Sipariş numaranızı ve siparişte kullandığınız e-postayı yazın. Tasarım onayınızı da buradan verebilirsiniz.</p>
        <SiparisSorgu />
      </div>
    </main>
  );
}
