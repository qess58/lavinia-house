import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { urunler as urunTablosu, yorumlar } from "@/db/schema";
import { magazaAyarlari, magazaKategorileri, yayindakiUrunler } from "@/lib/veri";
import { OneCikanlar } from "@/components/OneCikanlar";
import { jsonLd, kurulusVerisi } from "@/lib/seo";
import { para } from "@/lib/bicim";
import { GozIkon, InstagramIkon, KalkanIkon, KamyonIkon, MesajIkon, TikIkon } from "@/components/Ikonlar";

export default async function AnaSayfa() {
  const d = await db();
  const [urunler, { menu: kategoriler }, sonYorumlar, ayarlar] = await Promise.all([
    yayindakiUrunler(),
    magazaKategorileri(),
    d
      .select({ metin: yorumlar.metin, ad: yorumlar.ad, puan: yorumlar.puan, ornek: yorumlar.ornek, urun: urunTablosu.ad })
      .from(yorumlar)
      .leftJoin(urunTablosu, eq(yorumlar.urunId, urunTablosu.id))
      .where(and(eq(yorumlar.durum, "yayinda")))
      .orderBy(desc(yorumlar.puan), desc(yorumlar.olusturma))
      .limit(3),
    magazaAyarlari(),
  ]);
  const puanli = urunler.filter((u) => u.puan !== null);
  const ortalama = puanli.length ? puanli.reduce((t, u) => t + (u.puan ?? 0) * u.yorumSayisi, 0) / puanli.reduce((t, u) => t + u.yorumSayisi, 0) : null;
  const toplamYorum = puanli.reduce((t, u) => t + u.yorumSayisi, 0);

  const sekmeler = [
    { ad: "Çok satanlar", liste: urunler.filter((u) => u.rozet === "Çok satan").concat(urunler.filter((u) => u.rozet !== "Çok satan")).slice(0, 4) },
    { ad: "Yeni gelenler", liste: [...urunler].sort((a, b) => Number(b.yeni) - Number(a.yeni) || b.id - a.id).slice(0, 4) },
    { ad: "İndirimdekiler", liste: urunler.filter((u) => u.indirimliFiyat && u.indirimliFiyat < u.fiyat).slice(0, 4) },
  ].filter((s) => s.liste.length > 0);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(kurulusVerisi(ayarlar))} />
      <section className="wrap hero" aria-labelledby="h-hero">
        <div className="tx">
          <span className="eb">Lazerle kesilir, atölyemizde üretilir</span>
          <h1 id="h-hero">
            Ahşaptan,
            <br />
            size özel.
          </h1>
          <p style={{ fontSize: 19, color: "#3F4542", maxWidth: 540 }}>Mekanik ahşap modeller, isimlikler ve hediyeler. Kişiye özel her siparişte tasarımı üretimden önce onayınıza sunuyoruz.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn pri" href="/urunler">Ürünleri keşfet</Link>
            {ayarlar.onlineSatis ? <Link className="btn" href="/kendin-tasarla">Kendin tasarla</Link> : <Link className="btn" href="/teklif?tur=kurumsal">Kurumsal teklif al</Link>}
          </div>
          <ul className="chk">
            <li><TikIkon />Üretimden önce tasarım onayı</li>
            <li><TikIkon />{ayarlar.onlineSatis ? "Güvenli ödeme, taksit" : "Kurumsal ve toplu siparişe uygun"}</li>
            <li><TikIkon />2–5 iş gününde kargoda</li>
          </ul>
        </div>
        <div className="vis">
          <div className="ph" style={{ aspectRatio: "5 / 4", borderRadius: 28, fontSize: 15 }}>Ana görsel: ürün veya atölye fotoğrafı (1600 × 1280)</div>
          <div className="float" aria-hidden="true">
            <svg viewBox="0 0 120 80" style={{ width: 96, flex: "0 0 auto", borderRadius: 10, background: "#F3EEE6" }}>
              <rect x="8" y="8" width="104" height="64" rx="8" fill="#D9B98C" stroke="#B08A5B" strokeWidth="1.5" />
              <text x="60" y="46" textAnchor="middle" fontFamily="Great Vibes, cursive" fontSize="20" fill="#3B2A17">Yılmaz Ailesi</text>
            </svg>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>Tasarımınız hazır</p>
              <p className="xs mut">Onaylayınca üretime başlıyoruz</p>
              <span className="pill" style={{ marginTop: 6, background: "#DFF3E3", color: "#166534" }}>Onaylandı</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: "1px solid #E7E4DE", borderBottom: "1px solid #E7E4DE" }} aria-label="Neden Lavinia House">
        <div className="wrap trust" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <div className="ti"><span className="tic"><GozIkon /></span><div><p style={{ fontWeight: 700 }}>Önce görün, sonra üretelim</p><p className="sm mut">Kişiye özel ürünlerde tasarım onayınız alınmadan üretime başlanmaz.</p></div></div>
          {ayarlar.onlineSatis ? (
            <div className="ti"><span className="tic"><KalkanIkon /></span><div><p style={{ fontWeight: 700 }}>Güvenli ödeme</p><p className="sm mut">256-bit SSL ve 3D Secure. Kredi kartına taksit, havale / EFT.</p></div></div>
          ) : (
            <div className="ti"><span className="tic"><KalkanIkon /></span><div><p style={{ fontWeight: 700 }}>Kurumsal ve toplu sipariş</p><p className="sm mut">Logo pano, kapı tabelası, promosyon ürünleri. Faturalı üretim, adet indirimi.</p></div></div>
          )}
          <div className="ti"><span className="tic"><KamyonIkon /></span><div><p style={{ fontWeight: 700 }}>Hızlı üretim ve kargo</p><p className="sm mut">{ayarlar.onlineSatis ? `Her üründe tahmini kargo tarihi yazar. ${para(ayarlar.ucretsizKargoLimiti)} üzeri kargo bedava.` : "Her üründe üretim süresi yazar. Siparişlerinizi atölyemizde hazırlayıp kargoluyoruz."}</p></div></div>
          <div className="ti"><span className="tic"><MesajIkon /></span><div><p style={{ fontWeight: 700 }}>Gerçek insanlarla destek</p><p className="sm mut">WhatsApp’tan yazın, atölyeden biz yanıtlayalım.</p></div></div>
        </div>
      </section>

      <section className="wrap sec" aria-labelledby="h-kat">
        <div className="shd">
          <div><h2 id="h-kat">Ne arıyorsunuz?</h2><p className="mut" style={{ marginTop: 6 }}>Kategoriye göz atın ya da yukarıdan arayın.</p></div>
          <Link className="btn s" href="/urunler">Tüm ürünler</Link>
        </div>
        <div className="grid kats">
          {kategoriler.map((k) => (
            <Link key={k.id} className="cat" href={`/urunler?kategori=${k.slug}`}>
              <span className="ph" style={{ background: k.renk }}>Kategori görseli</span>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span className="hd" style={{ fontWeight: 700, fontSize: 19 }}>{k.ad}</span>
                <span className="sm mut">{k.urunSayisi} ürün</span>
              </span>
            </Link>
          ))}
          <Link className="cat" href="/teklif?tur=kurumsal">
            <span className="ph" style={{ background: "#DCE6EE" }}>Kategori görseli</span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <span className="hd" style={{ fontWeight: 700, fontSize: 19 }}>Kurumsal</span>
              <span className="sm mut">Teklif ile</span>
            </span>
          </Link>
        </div>
      </section>

      {sekmeler.length > 0 && (
        <section className="alt" aria-labelledby="h-urun">
          <div className="wrap sec">
            <OneCikanlar sekmeler={sekmeler} />
          </div>
        </section>
      )}

      <section className="wrap sec" aria-labelledby="h-nasil">
        <div className="shd"><div><h2 id="h-nasil">Kişiye özel sipariş nasıl ilerler?</h2><p className="mut" style={{ marginTop: 6 }}>Her adımda e-postayla haber veriyoruz.</p></div></div>
        <div className="grid g4">
          {[
            ["Seçin ve yazın", "Ürünü seçin; isim, tarih ya da logonuzu ekleyin. Fiyatı anında görürsünüz."],
            ["Tasarımı onaylayın", "Ustalarımız tasarımı hazırlar, size bir önizleme bağlantısı gelir. Onaylarsınız ya da düzeltme istersiniz."],
            ["Atölyede üretelim", "Onayınızdan sonra lazerle keser, temizler ve özenle paketleriz."],
            ["Kapınıza gelsin", "Kargo takip numaranız e-postanıza gelir. Siparişinizi istediğiniz an takip edin."],
          ].map(([b, m], i) => (
            <div className="step" key={b}><span className="sn">{i + 1}</span><h3>{b}</h3><p className="mut">{m}</p></div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: "clamp(48px, 6vw, 88px)" }} aria-label="Kişiye özel ve kurumsal">
        <div className="grid g2">
          <Link className="big" href="/kendin-tasarla" style={{ background: "#1C1F1E", color: "#fff" }}>
            <span className="pill" style={{ alignSelf: "flex-start", background: "#333836", color: "#fff" }}>Tasarım stüdyosu</span>
            <span className="hd" style={{ color: "#fff", fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>Kendin tasarla</span>
            <span style={{ color: "#D7DCD8", maxWidth: 440 }}>Malzemeyi, ölçüyü ve yazıyı seçin; fiyatı anında görün. Gerisini biz halledelim.</span>
            <span className="btn pri" style={{ alignSelf: "flex-start" }}>Tasarlamaya başla</span>
          </Link>
          <Link className="big" href="/teklif" style={{ background: "#F1ECF8", color: "#1C1F1E" }}>
            <span className="pill" style={{ alignSelf: "flex-start", background: "#fff" }}>Bireysel ve kurumsal</span>
            <span className="hd" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>Dosyanı yükle, teklif al</span>
            <span style={{ color: "#3F4542", maxWidth: 440 }}>Çizim, logo ya da fotoğraf gönderin. Firmalar için toplu sipariş ve faturalı üretim yapıyoruz. 1 iş günü içinde dönüyoruz.</span>
            <span className="btn dk" style={{ alignSelf: "flex-start" }}>Teklif iste</span>
          </Link>
        </div>
      </section>

      {sonYorumlar.length > 0 && (
        <section className="alt" aria-labelledby="h-yorum">
          <div className="wrap sec">
            <div className="shd">
              <div><h2 id="h-yorum">Müşterilerimiz ne diyor?</h2><p className="mut" style={{ marginTop: 6 }}>Yorumlar yalnızca ürünü teslim alan müşterilerden alınır.</p></div>
              {ortalama !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="hd num" style={{ fontSize: 40, fontWeight: 800 }}>{ortalama.toFixed(1).replace(".", ",")}</span>
                  <span><span className="st" style={{ fontSize: 18 }} aria-hidden="true">★★★★★</span><span className="sm mut" style={{ display: "block" }}>{toplamYorum} değerlendirme</span></span>
                </div>
              )}
            </div>
            <div className="grid g3">
              {sonYorumlar.map((y, i) => (
                <div className="card" key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="st" aria-label={`5 üzerinden ${y.puan} puan`}>{"★".repeat(y.puan)}</span>
                    {y.ornek && <span className="pill">Örnek yorum</span>}
                  </div>
                  <p style={{ fontSize: 16.5 }}>{y.metin}</p>
                  <p className="sm mut"><b style={{ color: "#1C1F1E" }}>{y.ad}</b>{y.urun ? ` · ${y.urun}` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {ayarlar.instagram && (
        <section className="wrap" aria-labelledby="h-ig" style={{ paddingTop: "clamp(40px, 5vw, 72px)" }}>
          <div className="igband">
            <span className="igi" aria-hidden="true"><InstagramIkon boyut={30} /></span>
            <div style={{ flex: "1 1 280px" }}>
              <h2 id="h-ig" style={{ fontSize: "clamp(22px, 2.4vw, 28px)" }}>Atölyeden yeni işler Instagram’da</h2>
              <p className="mut" style={{ marginTop: 6 }}>Üretim videoları, müşterilerimizin kişiye özel siparişleri ve yeni ürünler. @{ayarlar.instagram}</p>
            </div>
            <a className="btn dk" href={`https://www.instagram.com/${ayarlar.instagram}/`} target="_blank" rel="noopener">Instagram’da takip et</a>
          </div>
        </section>
      )}

      <section className="wrap sec" id="sss" aria-labelledby="h-sss">
        <div className="split">
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 id="h-sss">Sık sorulan sorular</h2>
            <p className="mut">Aradığınızı bulamadıysanız bize yazın; genellikle aynı gün yanıtlıyoruz.</p>
            <Link className="btn s" href="/bilgi/iletisim" style={{ alignSelf: "flex-start" }}>Bize ulaşın</Link>
          </div>
          <div style={{ flex: "2 1 520px", minWidth: 0 }}>
            {[...(ayarlar.onlineSatis ? [] : [VITRIN_SORU]), ...SSS].map(([s, c], i) => (
              <details className="faq" key={s} open={i === 0}>
                <summary>{s}</summary>
                <p className="mut">{c}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

const VITRIN_SORU = [
  "Online sipariş verebilir miyim?",
  "Online satışımız çok yakında açılıyor. Şimdilik ürün sayfasındaki “WhatsApp’tan sipariş ver” düğmesiyle ya da teklif formuyla sipariş alıyoruz; seçimleriniz mesaja otomatik eklenir.",
];

const SSS = [
  ["Siparişim ne zaman kargoya verilir?", "Her ürün sayfasında tahmini kargo tarihi yazar. Hazır ürünler genellikle 1–2 iş gününde, kişiye özel ürünler tasarım onayınızdan sonra 2–5 iş gününde kargoya verilir."],
  ["Tasarımı üretimden önce görebilir miyim?", "Evet. Kişiye özel her siparişte size bir önizleme bağlantısı gönderiyoruz. Onaylamadan üretime başlamıyoruz."],
  ["Kendi çizimimi veya logomu gönderebilir miyim?", "“Dosyanı Yükle” sayfasından SVG, DXF, AI, PDF, PNG veya JPG gönderebilirsiniz. 1 iş günü içinde fiyat ve teslim tarihiyle dönüyoruz."],
  ["İade ve değişim nasıl oluyor?", "Hazır ürünlerde 14 gün içinde iade edebilirsiniz. Kişiye özel ürünlerde üretim hatası varsa ücretsiz yeniliyoruz."],
  ["Firmalar için toplu sipariş alıyor musunuz?", "Evet. Logo pano, kapı tabelası ve promosyon ürünlerinde kurumsal fatura ve adet indirimi uyguluyoruz."],
];
