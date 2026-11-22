import Link from "next/link";
import { waLinki } from "@/lib/whatsapp";

/** Vitrin modunda sepet ve ödeme sayfalarının yerine gösterilir. */
export function SatisYakinda({ whatsapp }: { whatsapp: string }) {
  return (
    <div className="card" style={{ maxWidth: 640, margin: "24px auto", textAlign: "center", alignItems: "center", gap: 14, padding: "clamp(24px, 4vw, 40px)" }}>
      <span className="pill" style={{ background: "#F1ECF8", color: "#4A2E85" }}>Çok yakında</span>
      <h1 style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>Online satış çok yakında açılıyor</h1>
      <p className="mut" style={{ maxWidth: 480 }}>
        Şimdilik siparişleri WhatsApp ve teklif formu üzerinden alıyoruz. Beğendiğiniz ürünü ve seçimlerinizi yazın, fiyat ve teslim tarihiyle hemen dönelim.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <a className="btn wa-btn" href={waLinki(whatsapp, "Merhaba, sipariş vermek istiyorum.")} target="_blank" rel="noopener">WhatsApp’tan yazın</a>
        <Link className="btn" href="/teklif">Teklif formu</Link>
        <Link className="btn gh" href="/urunler">Ürünlere dön</Link>
      </div>
    </div>
  );
}
