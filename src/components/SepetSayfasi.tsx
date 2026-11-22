"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sepetToplami, type KuponBilgisi } from "@/lib/fiyat";
import { para } from "@/lib/bicim";
import type { MagazaAyarlari } from "@/lib/tipler";
import { useSepet } from "./Saglayicilar";
import { TikIkon } from "./Ikonlar";

type Ayar = Pick<MagazaAyarlari, "kargoUcreti" | "ucretsizKargoLimiti" | "hediyePaketiUcreti" | "taksit6VadeYuzde">;
export const KUPON_ANAHTARI = "lh-kupon-v1";

export function kuponOku(): KuponBilgisi | null {
  try {
    return JSON.parse(sessionStorage.getItem(KUPON_ANAHTARI) ?? "null");
  } catch {
    return null;
  }
}

export function SepetSayfasi({ ayarlar }: { ayarlar: Ayar }) {
  const sepet = useSepet();
  const [kod, setKod] = useState("");
  const [kupon, setKupon] = useState<KuponBilgisi | null>(null);
  const [mesaj, setMesaj] = useState<{ ok: boolean; metin: string } | null>(null);

  useEffect(() => setKupon(kuponOku()), []);
  const kuponKaydet = (k: KuponBilgisi | null) => {
    setKupon(k);
    try {
      if (k) sessionStorage.setItem(KUPON_ANAHTARI, JSON.stringify(k));
      else sessionStorage.removeItem(KUPON_ANAHTARI);
    } catch {}
  };

  const t = sepetToplami({ araToplam: sepet.araToplam, ayarlar, kupon });
  const kuponGecersiz = kupon && sepet.araToplam < kupon.altLimit;

  if (!sepet.hazir) return <div className="card" style={{ minHeight: 240 }} aria-busy="true" />;

  if (sepet.kalemler.length === 0)
    return (
      <div className="card" style={{ alignItems: "center", textAlign: "center", padding: "56px 24px", gap: 16 }}>
        <h1 style={{ fontSize: 28 }}>Sepetiniz boş</h1>
        <p className="mut">Beğendiğiniz ürünleri sepete ekleyin ya da kendi tasarımınızı yapın.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn pri" href="/urunler">Ürünlere göz atın</Link>
          <Link className="btn" href="/kendin-tasarla">Kendin tasarla</Link>
        </div>
      </div>
    );

  return (
    <div className="split" style={{ gap: 28 }}>
      <section className="cmain">
        <h1 style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>
          Sepetim <span className="mut" style={{ fontWeight: 600, fontSize: 20 }}>({sepet.adet} ürün)</span>
        </h1>
        <div className="card" style={{ gap: 10 }}>
          <p style={{ fontWeight: 600 }}>{t.ucretsizKargoKalan === 0 ? "Tebrikler, kargonuz ücretsiz!" : `Ücretsiz kargo için ${para(t.ucretsizKargoKalan)} daha ekleyin.`}</p>
          <div className="bar" role="img" aria-label={`Ücretsiz kargo ilerlemesi yüzde ${Math.min(100, Math.round((sepet.araToplam / ayarlar.ucretsizKargoLimiti) * 100))}`}>
            <i style={{ width: `${Math.min(100, Math.round((sepet.araToplam / ayarlar.ucretsizKargoLimiti) * 100))}%` }} />
          </div>
        </div>
        <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {sepet.kalemler.map((k) => (
            <div className="it" key={k.anahtar}>
              <span className="ph" style={{ width: 96, height: 96, fontSize: 11, background: k.tur === "urun" ? k.renk ?? "#EDE6DA" : "#E7D6BD" }}>{k.tur === "studyo" ? "Tasarımınız" : "Ürün"}</span>
              <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {k.tur === "urun" ? (
                  <Link href={`/urun/${k.slug}`} style={{ fontWeight: 700, color: "#1C1F1E", textDecoration: "none", fontSize: 17 }}>{k.ad}</Link>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: 17 }}>{k.ad}</span>
                )}
                {k.ozet && <p className="sm mut">{k.ozet}</p>}
                {k.kisisel && <span className="pill" style={{ alignSelf: "flex-start", background: "#DFF3E3", color: "#166534" }}>Ödemeden sonra tasarım onayınıza gelir</span>}
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                  <div className="qty k" role="group" aria-label={`${k.ad} adedi`}>
                    <button aria-label="Azalt" onClick={() => sepet.adetDegistir(k.anahtar, k.adet - 1)} disabled={k.adet <= 1}>−</button>
                    <span>{k.adet}</span>
                    <button aria-label="Artır" onClick={() => sepet.adetDegistir(k.anahtar, k.adet + 1)}>+</button>
                  </div>
                  {k.tur === "urun" && k.kisisel && <Link className="sm" href={`/urun/${k.slug}`} style={{ fontWeight: 600 }}>Yeniden düzenle</Link>}
                  <button className="btn s gh" style={{ color: "#B91C1C" }} onClick={() => sepet.sil(k.anahtar)}>Kaldır</button>
                </div>
              </div>
              <p className="num" style={{ fontWeight: 700, fontSize: 18 }}>{para(k.birimFiyat * k.adet)}</p>
            </div>
          ))}
        </div>
      </section>
      <aside className="cside" aria-label="Sipariş özeti">
        <div className="card">
          <h2 style={{ fontSize: 20 }}>Sipariş özeti</h2>
          <div>
            <div className="sl"><span className="mut">Ara toplam</span><span className="num">{para(t.araToplam)}</span></div>
            <div className="sl"><span className="mut">Kargo</span><span className={`num ${t.kargo ? "" : "ok"}`}>{t.kargo ? para(t.kargo) : "Ücretsiz"}</span></div>
            {t.indirim > 0 && <div className="sl"><span className="mut">Kupon ({kupon?.kod})</span><span className="num ok">−{para(t.indirim)}</span></div>}
            <div className="sl" style={{ borderTop: "1px solid #E7E4DE", marginTop: 6, paddingTop: 14, fontSize: 19, fontWeight: 800 }}><span>Toplam</span><span className="num">{para(t.toplam)}</span></div>
            <p className="xs mut">KDV dahil</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMesaj(null);
              const r = await fetch("/api/kupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kod, araToplam: sepet.araToplam }) }).catch(() => null);
              const d = (await r?.json().catch(() => null)) as { kupon?: KuponBilgisi; hata?: string } | null;
              if (r?.ok && d?.kupon) {
                kuponKaydet(d.kupon);
                setMesaj({ ok: true, metin: "İndirim uygulandı." });
                setKod("");
              } else setMesaj({ ok: false, metin: d?.hata ?? "Kod kontrol edilemedi." });
            }}
          >
            <label className="lbl" htmlFor="kp">İndirim kodu</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="kp" className="inp" style={{ textTransform: "uppercase" }} placeholder="Örn. HOSGELDIN10" value={kod} onChange={(e) => setKod(e.target.value.toUpperCase())} />
              <button className="btn s" style={{ minHeight: 52 }}>Uygula</button>
            </div>
            {mesaj && <p className={mesaj.ok ? "hint ok" : "err"}>{mesaj.metin}</p>}
            {kupon && (
              <p className="hint">
                {kuponGecersiz ? `${kupon.kod} kodu ${para(kupon.altLimit)} ve üzeri sepetlerde geçerli.` : `${kupon.kod} uygulandı.`}{" "}
                <button type="button" className="btn s gh" style={{ minHeight: 30, padding: "0 6px" }} onClick={() => kuponKaydet(null)}>Kaldır</button>
              </p>
            )}
          </form>
          <Link className="btn pri wide" style={{ minHeight: 58, fontSize: 17 }} href="/odeme">Siparişi tamamla</Link>
          <div className="sm mut" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><TikIkon boyut={18} />256-bit SSL ve 3D Secure</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><TikIkon boyut={18} />Kişiye özel ürünlerde üretim öncesi onay</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}><TikIkon boyut={18} />Hazır ürünlerde 14 gün iade</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
