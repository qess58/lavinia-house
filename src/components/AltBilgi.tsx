import Link from "next/link";
import type { MagazaAyarlari } from "@/lib/tipler";
import { BultenFormu } from "./BultenFormu";
import { InstagramIkon, MesajIkon } from "./Ikonlar";

export function whatsappLinki(numara: string, metin = "Merhaba, Lavinia House ürünleri hakkında bilgi almak istiyorum.") {
  const n = numara.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(metin)}` : "/bilgi/iletisim";
}

export function AltBilgi({ ayarlar, kategoriler }: { ayarlar: MagazaAyarlari; kategoriler: { slug: string; ad: string }[] }) {
  return (
    <>
      <footer className="ftr">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between", alignItems: "center", paddingBottom: 36, borderBottom: "1px solid #333836" }}>
            <div style={{ maxWidth: 460 }}>
              <p className="hd" style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>
                Yeni ürünlerden ilk siz haberdar olun
              </p>
              <p style={{ marginTop: 6 }}>Ayda en fazla iki e-posta. İstediğiniz zaman çıkabilirsiniz.</p>
            </div>
            <BultenFormu />
          </div>
          <div style={{ display: "grid", gap: 32, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lm" src="/logo.png" alt="" width={44} height={44} />
                <span className="ln" style={{ color: "#fff" }}>
                  Lavinia House
                </span>
              </div>
              <p>Lazer kesim atölyemizde ahşap ve pleksiden mekanik modeller ve kişiye özel ürünler tasarlıyor, üretiyoruz.</p>
              <p>
                {[ayarlar.telefon, ayarlar.eposta].filter(Boolean).join(" · ")}
                {(ayarlar.telefon || ayarlar.eposta) && <br />}
                {ayarlar.calismaSaatleri}
                {ayarlar.adres && (
                  <>
                    <br />
                    {ayarlar.adres}
                  </>
                )}
              </p>
              {ayarlar.instagram && (
                <a className="igl" href={`https://www.instagram.com/${ayarlar.instagram}/`} target="_blank" rel="noopener">
                  <InstagramIkon boyut={20} /> @{ayarlar.instagram}
                </a>
              )}
            </div>
            <div>
              <h3>Alışveriş</h3>
              <ul>
                <li><Link href="/urunler">Tüm ürünler</Link></li>
                {kategoriler.map((k) => (
                  <li key={k.slug}><Link href={`/urunler?kategori=${k.slug}`}>{k.ad}</Link></li>
                ))}
                <li><Link href="/kendin-tasarla">Kendin Tasarla</Link></li>
              </ul>
            </div>
            <div>
              <h3>Yardım</h3>
              <ul>
                {ayarlar.onlineSatis && <li><Link href="/siparis">Sipariş takibi</Link></li>}
                <li><Link href="/bilgi/kargo-ve-teslimat">Kargo ve teslimat</Link></li>
                <li><Link href="/bilgi/iade-ve-degisim">İade ve değişim</Link></li>
                <li><Link href="/#sss">Sık sorulan sorular</Link></li>
                <li><Link href="/bilgi/iletisim">İletişim</Link></li>
              </ul>
            </div>
            <div>
              <h3>Lavinia House</h3>
              <ul>
                <li><Link href="/bilgi/hakkimizda">Hakkımızda</Link></li>
                <li><Link href="/teklif?tur=kurumsal">Kurumsal siparişler</Link></li>
                <li><Link href="/teklif">Dosyanı yükle, teklif al</Link></li>
              </ul>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", paddingTop: 26, borderTop: "1px solid #333836" }}>
            {ayarlar.onlineSatis ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="payb">VISA</span>
                <span className="payb">Mastercard</span>
                <span className="payb">troy</span>
                <span className="payb">Havale / EFT</span>
                <span className="xs" style={{ marginLeft: 6 }}>
                  256-bit SSL ve 3D Secure ile güvenli ödeme
                </span>
              </div>
            ) : (
              <span className="xs">Online satış çok yakında. Sipariş ve fiyat bilgisi için WhatsApp’tan ya da teklif formundan bize ulaşın.</span>
            )}
            <div className="xs" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link href="/bilgi/kvkk">KVKK Aydınlatma Metni</Link>
              <Link href="/bilgi/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link>
              <Link href="/bilgi/on-bilgilendirme-formu">Ön Bilgilendirme Formu</Link>
              <Link href="/bilgi/gizlilik-ve-cerezler">Gizlilik ve Çerezler</Link>
            </div>
          </div>
          <p className="xs">
            © {new Date().getFullYear()} {ayarlar.unvan || "Lavinia House"}
            {ayarlar.mersisNo && ` · MERSİS: ${ayarlar.mersisNo}`}
            {ayarlar.etbisNo && ` · ETBİS kayıt no: ${ayarlar.etbisNo}`}
          </p>
        </div>
      </footer>
      <a className="wa" href={whatsappLinki(ayarlar.whatsapp)} target={ayarlar.whatsapp ? "_blank" : undefined} rel="noopener" aria-label="WhatsApp’tan bize yazın">
        <MesajIkon />
        <span>WhatsApp’tan yazın</span>
      </a>
    </>
  );
}
