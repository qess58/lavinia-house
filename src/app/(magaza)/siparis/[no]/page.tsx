import type { Metadata } from "next";
import Link from "next/link";
import { magazaAyarlari, siparisGetir } from "@/lib/veri";
import { para, tarihSaat } from "@/lib/bicim";
import { LevhaOnizleme, boyutBul, zeminBul } from "@/components/Onizleme";
import { OnayPaneli } from "@/components/OnayPaneli";
import { TikIkon } from "@/components/Ikonlar";
import { YorumFormu } from "@/components/YorumFormu";
import { db } from "@/db";
import { yorumlar as yorumTablosu } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Siparişim", robots: { index: false } };

type Props = { params: Promise<{ no: string }>; searchParams: Promise<{ t?: string; yeni?: string }> };

const DURUM: Record<string, [string, string, string]> = {
  odeme: ["Ödeme bekleniyor", "#FFF8EC", "#854D0E"],
  yeni: ["Sipariş alındı", "#F1ECF8", "#3A2169"],
  onay: ["Tasarım onayınızı bekliyor", "#F1ECF8", "#3A2169"],
  uretim: ["Üretimde", "#DFF3E3", "#166534"],
  kargo: ["Kargoda", "#D9F2EE", "#0F766E"],
  teslim: ["Teslim edildi", "#DFF3E3", "#166534"],
  iptal: ["İptal edildi", "#FBE5E5", "#B91C1C"],
  iade: ["İade edildi", "#FBE5E5", "#B91C1C"],
};

export default async function SiparisSayfasi({ params, searchParams }: Props) {
  const { no } = await params;
  const { t, yeni } = await searchParams;
  const v = t ? await siparisGetir(Number(no), t) : null;
  if (!v)
    return (
      <main className="wrap mainy">
        <div className="card" style={{ maxWidth: 600, margin: "48px auto", textAlign: "center", alignItems: "center" }}>
          <h1 style={{ fontSize: 26 }}>Sipariş bulunamadı</h1>
          <p className="mut">Bağlantı eksik ya da hatalı olabilir. Sipariş numaranız ve e-postanızla arayabilirsiniz.</p>
          <Link className="btn pri" href="/siparis">Siparişimi bul</Link>
        </div>
      </main>
    );

  const { siparis: s, kalemler, olaylar } = v;
  const ayarlar = await magazaAyarlari();
  const [durumAd, durumBg, durumRenk] = DURUM[s.durum] ?? DURUM.yeni;
  const kisiselVar = kalemler.some((k) => k.kisisel);
  const adimlar = ["Sipariş alındı", ...(kisiselVar ? ["Tasarım onayı"] : []), "Üretim", "Kargo", "Teslim"];
  const sira: Record<string, number> = kisiselVar ? { odeme: 0, yeni: 1, onay: 1, uretim: 2, kargo: 3, teslim: 4 } : { odeme: 0, yeni: 1, onay: 1, uretim: 1, kargo: 2, teslim: 3 };
  const simdi = sira[s.durum] ?? 0;
  const onayKalemi = kalemler.find((k) => k.kisisel && k.tur === "urun");
  const yapilan = s.durum === "teslim" ? await (await db()).select({ urunId: yorumTablosu.urunId }).from(yorumTablosu).where(eq(yorumTablosu.siparisId, s.id)) : [];
  const degerlendirilecek = [...new Map(kalemler.filter((k) => k.urunId).map((k) => [k.urunId!, { id: k.urunId!, ad: k.ad, yapildi: yapilan.some((y) => y.urunId === k.urunId) }])).values()];
  const adParca = s.musteri.ad.trim().split(/\s+/);
  const varsayilanAd = adParca.length > 1 ? `${adParca[0]} ${adParca[adParca.length - 1][0]}.` : adParca[0];

  return (
    <main className="wrap mainy">
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        <Link href="/siparis">Sipariş takibi</Link>
        <span aria-hidden="true">›</span>
        <span>#{s.no}</span>
      </nav>

      {yeni && (
        <div className="basari" style={{ marginBottom: 24 }} role="status">
          <span style={{ flex: "0 0 auto" }}><TikIkon boyut={30} /></span>
          <div>
            <p style={{ fontWeight: 800, fontSize: 20 }}>Teşekkürler, siparişiniz alındı!</p>
            <p style={{ color: "#3F4542" }}>Sipariş numaranız <b>#{s.no}</b>. Özeti <b>{s.musteri.eposta}</b> adresine gönderdik. Bu sayfanın bağlantısını saklayın; siparişinizi buradan takip edebilirsiniz.</p>
            {s.odemeYontemi === "havale" && s.odemeDurumu === "bekliyor" && (
              <p className="uyari" style={{ marginTop: 12 }}>
                <b>Havale / EFT bilgileri:</b> Alıcı: {ayarlar.aliciAdi} · IBAN: {ayarlar.iban || "IBAN için bize ulaşın"} · Açıklamaya <b>{s.no}</b> yazın. Ödemeniz gelince e-postayla haber veririz.
              </p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: "clamp(28px, 3vw, 38px)" }}>Sipariş #{s.no}</h1>
          <p className="mut" style={{ marginTop: 6 }}>{tarihSaat(s.olusturma)} · {s.musteri.ad}</p>
        </div>
        <span className="pill" style={{ fontSize: 14, padding: "6px 14px", background: durumBg, color: durumRenk }}>
          {s.onayDurumu === "duzeltme" ? "Tasarım düzeltiliyor" : s.onayDurumu === "hazirlaniyor" && s.durum === "yeni" ? "Tasarımınız hazırlanıyor" : durumAd}
        </span>
      </div>

      {!["iptal", "iade"].includes(s.durum) && (
        <ol className="trk" aria-label="Sipariş durumu" style={{ marginBottom: 28, gridTemplateColumns: `repeat(${adimlar.length}, minmax(0, 1fr))` }}>
          {adimlar.map((a, i) => (
            <li key={a} className={i < simdi || s.durum === "teslim" ? "ok" : i === simdi ? "on" : ""} aria-current={i === simdi ? "step" : undefined}>
              <span className="b" />
              <span>{a}{i === simdi && s.durum !== "teslim" && <small>Şu an</small>}{a === "Kargo" && s.takipNo && <small>{s.kargoFirmasi} · {s.takipNo}</small>}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="split" style={{ gap: 28 }}>
        <section className="cmain">
          {onayKalemi && s.onayDurumu !== "yok" && (
            <div className="card" style={{ gap: 18 }}>
              <h2 style={{ fontSize: 22 }}>
                {s.onayDurumu === "bekliyor" ? "Tasarımınız hazır, onayınızı bekliyor" : s.onayDurumu === "onaylandi" ? "Onayladığınız tasarım" : s.onayDurumu === "duzeltme" ? "Düzeltme isteğiniz alındı" : "Tasarımınız hazırlanıyor"}
              </h2>
              {s.onayDurumu === "hazirlaniyor" ? (
                <p className="mut">Ustalarımız tasarımınızı hazırlıyor. 1 iş günü içinde önizleme e-postanıza ve bu sayfaya gelecek.</p>
              ) : (
                <>
                  <div style={{ background: "#F3EEE6", borderRadius: 20, padding: "clamp(16px, 3vw, 32px)", display: "flex", justifyContent: "center" }}>
                    {s.tasarimGorseli ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.tasarimGorseli} alt={`Sipariş #${s.no} için hazırlanan tasarım`} style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 12 }} />
                    ) : (
                    <LevhaOnizleme
                      satirlar={Object.entries(onayKalemi.kisi).filter(([k]) => ["ust", "alt", "yazi"].includes(k)).map(([, v]) => v)}
                      fontAilesi={ayarlar.fontlar.find((f) => f.ad === onayKalemi.kisi.font)?.aile ?? "Inter"}
                      zemin={zeminBul(Object.values(onayKalemi.secim), "Ahşap")}
                      olcu={boyutBul(Object.values(onayKalemi.secim))}
                      etiket={onayKalemi.secim.Boyut}
                    />
                    )}
                  </div>
                  <div>
                    <div className="kv"><span>Ürün</span><span>{onayKalemi.ad}</span></div>
                    <div className="kv"><span>Seçimler</span><span>{onayKalemi.ozet}</span></div>
                    <div className="kv"><span>Tasarım sürümü</span><span>{s.tasarimSurumu}</span></div>
                  </div>
                  <OnayPaneli no={s.no} token={t!} durum={s.onayDurumu} not={s.onayNotu} />
                </>
              )}
            </div>
          )}
          {s.durum === "teslim" && degerlendirilecek.length > 0 && (
            <div className="card" id="degerlendir">
              <h2 style={{ fontSize: 22 }}>Ürünlerinizi değerlendirin</h2>
              <p className="mut">Yorumunuz diğer müşterilere yol gösterir. Onaylandıktan sonra ürün sayfasında adınızla yayınlanır.</p>
              <YorumFormu no={s.no} token={t!} urunler={degerlendirilecek} varsayilanAd={varsayilanAd} />
            </div>
          )}
          <div className="card">
            <h2 style={{ fontSize: 19 }}>Ürünler</h2>
            {kalemler.map((k) => (
              <div className="it" key={k.id}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <p style={{ fontWeight: 700 }}>{k.adet} × {k.ad}</p>
                  {k.ozet && <p className="sm mut">{k.ozet}</p>}
                </div>
                <p className="num" style={{ fontWeight: 700 }}>{para(k.birimFiyat * k.adet)}</p>
              </div>
            ))}
          </div>
          {olaylar.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 19 }}>Geçmiş</h2>
              <ul className="tl">
                {olaylar.map((o) => (
                  <li key={o.id} className="ok"><span className="d" style={{ width: 12, height: 12, marginTop: 6 }} /><div><p style={{ fontWeight: 600 }}>{o.mesaj}</p><p className="xs mut">{tarihSaat(o.olusturma)}</p></div></li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <aside className="cside" aria-label="Sipariş bilgileri">
          <div className="card">
            <h2 style={{ fontSize: 19 }}>Sipariş özeti</h2>
            <div>
              <div className="kv"><span>Ara toplam</span><span>{para(s.araToplam)}</span></div>
              <div className="kv"><span>Kargo</span><span className={s.kargo ? "" : "ok"}>{s.kargo ? para(s.kargo) : "Ücretsiz"}</span></div>
              {s.indirim > 0 && <div className="kv"><span>İndirim ({s.kuponKodu})</span><span className="ok">−{para(s.indirim)}</span></div>}
              {s.hediyeUcreti > 0 && <div className="kv"><span>Hediye paketi</span><span>{para(s.hediyeUcreti)}</span></div>}
              {s.vadeFarki > 0 && <div className="kv"><span>Vade farkı</span><span>{para(s.vadeFarki)}</span></div>}
              <div className="kv" style={{ fontSize: 17 }}><span style={{ color: "#1C1F1E", fontWeight: 700 }}>Toplam</span><span>{para(s.toplam)}</span></div>
            </div>
            <p className="sm mut">
              {s.odemeYontemi === "kart" ? `Kredi kartı · ${s.taksit > 1 ? `${s.taksit} taksit` : "tek çekim"}` : "Havale / EFT"} · {s.odemeDurumu === "odendi" ? "ödendi" : "ödeme bekleniyor"}
            </p>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 19 }}>Teslimat adresi</h2>
            <p>{s.musteri.ad}<br />{s.adres.adres}<br />{s.adres.ilce ? `${s.adres.ilce} / ` : ""}{s.adres.il}</p>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 19 }}>Yardım</h2>
            <p className="sm mut">Siparişinizle ilgili her soruda atölyeden biz yanıtlıyoruz.</p>
            <a className="btn s" href={ayarlar.whatsapp ? `https://wa.me/${ayarlar.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Merhaba, #${s.no} numaralı siparişim hakkında yazıyorum.`)}` : "/bilgi/iletisim"} style={{ background: "#15803D", borderColor: "#15803D", color: "#fff" }}>WhatsApp’tan yazın</a>
            <Link className="sm" href="/bilgi/iade-ve-degisim">İade ve değişim koşulları</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
