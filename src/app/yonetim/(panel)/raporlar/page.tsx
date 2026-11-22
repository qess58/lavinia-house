import type { Metadata } from "next";
import Link from "next/link";
import { AYLAR, ayYaz, gunAnahtari, para } from "@/lib/bicim";
import { aylikRapor, oncekiAy } from "@/lib/rapor";
import { yoneticiGerekli } from "@/lib/yetki";
import { SutunGrafik } from "./SutunGrafik";

export const metadata: Metadata = { title: "Raporlar" };

const sayi = new Intl.NumberFormat("tr-TR");

function Fark({ simdi, once, yuzdePuan = false }: { simdi: number | null; once: number | null; yuzdePuan?: boolean }) {
  if (simdi === null || once === null) return <span className="y-fark y-mut">Geçen ay verisi yok</span>;
  if (yuzdePuan) {
    const f = simdi - once;
    if (Math.abs(f) < 0.05) return <span className="y-fark y-mut">Geçen ayla aynı</span>;
    return <span className={`y-fark ${f > 0 ? "y-iyi" : "y-kotu"}`}>{f > 0 ? "▲" : "▼"} {Math.abs(f).toFixed(1).replace(".", ",")} puan <span className="y-mut" style={{ fontWeight: 400 }}>geçen aya göre</span></span>;
  }
  if (!once) return <span className="y-fark y-mut">{simdi ? "Geçen ay yoktu" : "—"}</span>;
  const f = Math.round(((simdi - once) / once) * 100);
  if (f === 0) return <span className="y-fark y-mut">Geçen ayla aynı</span>;
  return <span className={`y-fark ${f > 0 ? "y-iyi" : "y-kotu"}`}>{f > 0 ? "▲" : "▼"} %{Math.abs(f)} <span className="y-mut" style={{ fontWeight: 400 }}>geçen aya göre</span></span>;
}

function Dagilim({ satirlar, bos }: { satirlar: { ad: string; n: number; ek?: string }[]; bos: string }) {
  const toplam = satirlar.reduce((t, s) => t + s.n, 0);
  const enCok = Math.max(1, ...satirlar.map((s) => s.n));
  if (!satirlar.length) return <p className="y-sm y-mut">{bos}</p>;
  return (
    <div className="y-hb">
      {satirlar.map((s) => (
        <div key={s.ad} style={{ display: "contents" }}>
          <span title={s.ad}>{s.ad}</span>
          <span className="y-hbt" aria-hidden="true"><i style={{ width: `${(s.n / enCok) * 100}%` }} /></span>
          <span className="y-v">{s.ek ?? `${sayi.format(s.n)} · %${toplam ? Math.round((s.n / toplam) * 100) : 0}`}</span>
        </div>
      ))}
    </div>
  );
}

export default async function RaporlarSayfasi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const buAy = gunAnahtari().slice(0, 7);
  const istenen = (Array.isArray(sp.ay) ? sp.ay[0] : sp.ay) ?? "";
  const ay = /^\d{4}-\d{2}$/.test(istenen) && istenen <= buAy ? istenen : buAy;
  const r = await aylikRapor(ay);
  const o = r.ozet;
  const secenekler = Array.from({ length: 12 }, (_, i) => oncekiAy(buAy, i));
  const gunEtiket = (g: string) => {
    const [, m, gun] = g.split("-").map(Number);
    return `${gun} ${AYLAR[m - 1]}`;
  };
  const enCokAdet = Math.max(1, ...r.urunler.map((u) => u.adet));

  return (
    <>
      <div className="y-top">
        <div>
          <h1>Raporlar</h1>
          <p className="y-sub">Ciroya ödemesi alınmış siparişler sayılır; iptal, iade ve ödeme bekleyen havaleler hariçtir.</p>
        </div>
        <a className="y-btn" href={`/yonetim/rapor-indir?ay=${ay}`}>Excel’e aktar (CSV)</a>
      </div>

      <form className="y-row" aria-label="Dönem">
        <label className="y-lbl" htmlFor="r-ay" style={{ marginBottom: 0 }}>Ay</label>
        <select id="r-ay" className="y-inp" name="ay" defaultValue={ay} style={{ width: "auto" }}>
          {secenekler.map((a) => <option key={a} value={a}>{ayYaz(a)}{a === buAy ? " (bu ay)" : ""}</option>)}
        </select>
        <button className="y-btn">Göster</button>
        <span className="y-sm y-mut">Karşılaştırma: {ayYaz(r.onceki)}</span>
      </form>

      <div className="y-kpi">
        <div className="y-card"><span className="y-sm y-mut">Ciro</span><span className="y-deg-v">{para(o.ciro)}</span><Fark simdi={o.ciro} once={o.oCiro} /></div>
        <div className="y-card"><span className="y-sm y-mut">Sipariş</span><span className="y-deg-v">{sayi.format(o.siparis)}</span><Fark simdi={o.siparis} once={o.oSiparis} /></div>
        <div className="y-card"><span className="y-sm y-mut">Satılan ürün</span><span className="y-deg-v">{sayi.format(o.adet)} adet</span><Fark simdi={o.adet} once={o.oAdet} /></div>
        <div className="y-card"><span className="y-sm y-mut">Ortalama sepet</span><span className="y-deg-v">{para(o.ortalama)}</span><Fark simdi={o.ortalama} once={o.oOrtalama} /></div>
        <div className="y-card"><span className="y-sm y-mut">Ziyaretçi</span><span className="y-deg-v">{sayi.format(o.ziyaretci)}</span><Fark simdi={o.ziyaretci} once={o.oZiyaretci} /></div>
        <div className="y-card">
          <span className="y-sm y-mut">Satışa dönüşme</span>
          <span className="y-deg-v">{o.donusum === null ? "—" : `%${o.donusum.toFixed(1).replace(".", ",")}`}</span>
          <Fark simdi={o.donusum} once={o.oDonusum} yuzdePuan />
        </div>
      </div>
      {(o.iptal > 0 || o.odemeBekleyen > 0) && (
        <p className="y-sm y-mut">Bu ay ayrıca {o.iptal > 0 && `${o.iptal} iptal / iade`}{o.iptal > 0 && o.odemeBekleyen > 0 && " ve "}{o.odemeBekleyen > 0 && <Link href="/yonetim/siparisler?durum=odeme">{o.odemeBekleyen} ödeme bekleyen havale</Link>} var; bunlar yukarıdaki sayılara dahil değil.</p>
      )}

      <section className="y-card" aria-labelledby="h-urs">
        <div className="y-row y-sp">
          <h2 id="h-urs">Hangi üründen kaç tane sattık · {ayYaz(ay)}</h2>
          <span className="y-sm y-mut">{r.urunler.length} farklı ürün</span>
        </div>
        {r.urunler.length === 0 ? (
          <p className="y-mut y-sm">Bu ay henüz satış yok.</p>
        ) : (
          <div className="y-box">
            <table>
              <thead><tr><th>#</th><th>Ürün</th><th style={{ width: "34%" }}><span className="y-gizli">Adet grafiği</span></th><th className="y-r">Adet</th><th className="y-r">Sipariş</th><th className="y-r">Tutar</th></tr></thead>
              <tbody>
                {r.urunler.map((u, i) => (
                  <tr key={`${u.urunId ?? u.ad}`}>
                    <td className="y-mut y-num">{i + 1}</td>
                    <td>{u.urunId ? <Link href={`/yonetim/urunler/${u.urunId}`}>{u.ad}</Link> : u.ad}</td>
                    <td><span className="y-hbt" style={{ display: "block" }} aria-hidden="true"><i style={{ width: `${(u.adet / enCokAdet) * 100}%` }} /></span></td>
                    <td className="y-r y-num"><b>{sayi.format(u.adet)}</b></td>
                    <td className="y-r y-num">{u.siparis}</td>
                    <td className="y-r y-num y-nw">{para(u.ciro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="y-hint" style={{ marginTop: 0 }}>Tutar, ürünlerin satış fiyatıdır; kargo, kupon indirimi ve hediye paketi hariçtir.</p>
      </section>

      <div className="y-grid y-k2">
        <section className="y-card">
          <SutunGrafik
            baslik="Günlük ciro"
            bicim="para"
            birimAdi="Ciro"
            etiketAdimi={5}
            noktalar={r.gunluk.map((g) => ({ etiket: gunEtiket(g.gun), kisa: String(Number(g.gun.slice(8))), deger: g.ciro, ek: `${g.siparis} sipariş` }))}
          />
        </section>
        <section className="y-card">
          <SutunGrafik
            baslik="Günlük ziyaretçi"
            bicim="sayi"
            birimAdi="Ziyaretçi"
            etiketAdimi={5}
            noktalar={r.gunluk.map((g) => ({ etiket: gunEtiket(g.gun), kisa: String(Number(g.gun.slice(8))), deger: g.ziyaretci, ek: `${sayi.format(g.goruntuleme)} sayfa görüntüleme` }))}
          />
        </section>
      </div>

      <div className="y-grid y-k3">
        <section className="y-card" aria-labelledby="h-kay">
          <h2 id="h-kay">Ziyaretçiler nereden geldi</h2>
          <Dagilim satirlar={r.kaynaklar.map((k) => ({ ad: k.deger, n: k.n }))} bos="Henüz ziyaret kaydı yok." />
          <p className="y-hint" style={{ marginTop: 0 }}>Instagram profilinize <code>/instagram</code> bağlantısını koyarsanız oradan gelenler burada ayrı görünür.</p>
        </section>
        <section className="y-card" aria-labelledby="h-cih">
          <h2 id="h-cih">Cihaz</h2>
          <Dagilim satirlar={r.cihazlar.map((k) => ({ ad: k.deger, n: k.n }))} bos="Henüz ziyaret kaydı yok." />
        </section>
        <section className="y-card" aria-labelledby="h-bak">
          <h2 id="h-bak">En çok bakılan ürünler</h2>
          <Dagilim satirlar={r.bakilan.map((b) => ({ ad: b.ad, n: b.goruntuleme, ek: `${sayi.format(b.goruntuleme)} bakış · ${b.satilan} satış` }))} bos="Henüz ürün sayfası ziyareti yok." />
        </section>
      </div>

      <section className="y-card">
        <SutunGrafik
          baslik="Son 12 ay ciro"
          bicim="para"
          birimAdi="Ciro"
          noktalar={r.aylik.map((a) => ({ etiket: ayYaz(a.ay), kisa: AYLAR[Number(a.ay.slice(5)) - 1].slice(0, 3), deger: a.ciro, ek: `${a.siparis} sipariş · ${sayi.format(a.ziyaretci)} ziyaretçi` }))}
        />
      </section>
      <p className="y-sm y-mut">
        Ziyaretçi sayacı çerez kullanmaz: aynı kişi aynı gün içinde bir kez sayılır, farklı günlerde gelirse her gün ayrı sayılır. Panele giriş yaptığınız
        tarayıcıdan yaptığınız ziyaretler sayılmaz. Arama motoru botları sayılmaz.
      </p>
    </>
  );
}
