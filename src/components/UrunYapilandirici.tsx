"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { urunBirimFiyati, varyantAnahtari, type FiyatUrunu } from "@/lib/fiyat";
import { para } from "@/lib/bicim";
import type { Gorsel, KisiAlan } from "@/lib/tipler";
import { useBildirim, useFavoriler, useSepet } from "./Saglayicilar";
import { LevhaOnizleme, boyutBul, zeminBul } from "./Onizleme";
import { KalpIkon, KalkanIkon, KamyonIkon, MesajIkon, YenileIkon } from "./Ikonlar";
import { useMagazaModu } from "./MagazaModu";
import { waLinki } from "@/lib/whatsapp";
import { bulutaYukle, rastgeleKimlik, yuklemeBilgisi } from "@/lib/istemci-yukleme";
import { guvenliAd, MUSTERI_DOSYASI, uzanti } from "@/lib/yukleme-kurallari";

export type YapilandiriciUrunu = FiyatUrunu & {
  id: number;
  slug: string;
  ad: string;
  malzeme: string;
  renk: string;
  gorseller: Gorsel[];
  stokYok: boolean;
};

type Props = {
  urun: YapilandiriciUrunu;
  puan: number | null;
  yorumSayisi: number;
  kategori: string | null;
  kargoTarihi: string;
  uretimSuresi: string;
  fontlar: { ad: string; aile: string }[];
  ucretsizKargoLimiti: number;
  whatsapp: string;
};

function ilkSecim(u: YapilandiriciUrunu) {
  const s: Record<string, string> = {};
  for (const o of u.secenekler) s[o.ad] = o.degerler.find((d) => d.fark === 0)?.ad ?? o.degerler[0]?.ad ?? "";
  if (u.varyantlar[varyantAnahtari(u.secenekler, s)]?.aktif === false) {
    // ilk satıştaki kombinasyonu bul
    const tara = (i: number, acc: Record<string, string>): Record<string, string> | null => {
      if (i === u.secenekler.length) return u.varyantlar[varyantAnahtari(u.secenekler, acc)]?.aktif === false ? null : acc;
      for (const d of u.secenekler[i].degerler) {
        const r = tara(i + 1, { ...acc, [u.secenekler[i].ad]: d.ad });
        if (r) return r;
      }
      return null;
    };
    return tara(0, {}) ?? s;
  }
  return s;
}

function ilkKisi(alanlar: KisiAlan[]) {
  const k: Record<string, string> = {};
  for (const a of alanlar) {
    if (a.tip === "font") k[a.id] = a.fontlar?.[0] ?? "";
    else if (a.tip === "renk") k[a.id] = a.renkler?.[0]?.ad ?? "";
    else k[a.id] = "";
  }
  return k;
}

export function UrunYapilandirici({ urun: u, puan, yorumSayisi, kategori, kargoTarihi, uretimSuresi, fontlar, ucretsizKargoLimiti, whatsapp }: Props) {
  const sepet = useSepet();
  const bildir = useBildirim();
  const mod = useMagazaModu();
  const { favoriler, degistir } = useFavoriler();
  const [secim, setSecim] = useState(() => ilkSecim(u));
  const [kisi, setKisi] = useState(() => ilkKisi(u.kisisellestirme));
  const [adet, setAdet] = useState(1);
  const [gorsel, setGorsel] = useState(0);
  const [hatalar, setHatalar] = useState<string[]>([]);
  const [cekmece, setCekmece] = useState(false);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const dosyaRef = useRef<Record<string, HTMLInputElement | null>>({});

  const sonuc = useMemo(() => urunBirimFiyati(u, secim, kisi), [u, secim, kisi]);
  const metinAlanlari = u.kisisellestirme.filter((a) => a.tip === "metin");
  const fontAlani = u.kisisellestirme.find((a) => a.tip === "font");
  const renkAlani = u.kisisellestirme.find((a) => a.tip === "renk");
  const dosyaAlani = u.kisisellestirme.find((a) => a.tip === "dosya");
  const onizlemeVar = metinAlanlari.length > 0;
  const fontAilesi = (ad: string) => fontlar.find((f) => f.ad === ad)?.aile ?? "Inter, sans-serif";
  const indirimde = !!u.indirimliFiyat && u.indirimliFiyat < u.fiyat;
  const toplam = sonuc.birim * adet;
  const fav = favoriler.includes(u.id);
  const kisisel = u.kisisellestirme.length > 0;
  const kombinasyonKapali = (secenekAdi: string, deger: string) =>
    u.varyantlar[varyantAnahtari(u.secenekler, { ...secim, [secenekAdi]: deger })]?.aktif === false;

  const gorseller = [...(onizlemeVar ? [{ ad: "Canlı önizleme", yol: "" }] : []), ...(u.gorseller.length ? u.gorseller.map((g, i) => ({ ad: g.alt || `Fotoğraf ${i + 1}`, yol: g.yol })) : [1, 2, 3].map((i) => ({ ad: `Fotoğraf ${i}`, yol: "" })))];
  const seciliGorsel = gorseller[Math.min(gorsel, gorseller.length - 1)];

  const ozet = () => {
    const parca = [
      ...u.secenekler.map((o) => secim[o.ad]),
      metinAlanlari.map((a) => kisi[a.id]?.trim()).filter(Boolean).length ? `“${metinAlanlari.map((a) => kisi[a.id]?.trim()).filter(Boolean).join(" / ")}”` : "",
      fontAlani ? kisi[fontAlani.id] : "",
      dosyaAlani && kisi[dosyaAlani.id] ? `Dosya: ${kisi[dosyaAlani.id].split("|")[1]}` : "",
    ];
    return parca.filter(Boolean).join(" · ");
  };

  const sepeteEkle = () => {
    if (sonuc.hatalar.length) {
      setHatalar(sonuc.hatalar);
      document.getElementById("kisisel-alanlar")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setHatalar([]);
    sepet.ekle({ tur: "urun", urunId: u.id, slug: u.slug, ad: u.ad, secim, kisi, ozet: ozet(), birimFiyat: sonuc.birim, adet, renk: u.renk, kisisel });
    setCekmece(true);
  };

  const dosyaYukle = async (alan: KisiAlan, f: File) => {
    if (!MUSTERI_DOSYASI.uzantilar.includes(uzanti(f.name))) return bildir({ mesaj: "PNG, JPG, SVG, WEBP veya PDF yükleyin." });
    if (f.size > MUSTERI_DOSYASI.azami) return bildir({ mesaj: "Dosya 20 MB'tan büyük olamaz." });
    setYukleniyor(alan.id);
    // Canlı sitede (Vercel) dosya doğrudan depoya yüklenir; bilgisayarda sunucuya gönderilir.
    const bilgi = await yuklemeBilgisi();
    if (bilgi.bulut && bilgi.erisim) {
      const id = rastgeleKimlik();
      const tamam = await bulutaYukle(`yuklemeler/musteri/${id}-${guvenliAd(f.name, 100)}`, f, bilgi.erisim).then(() => true, () => false);
      setYukleniyor(null);
      if (tamam) setKisi((k) => ({ ...k, [alan.id]: `${id}|${f.name}` }));
      else bildir({ mesaj: "Dosya yüklenemedi, tekrar deneyin." });
      return;
    }
    const form = new FormData();
    form.append("dosya", f);
    const r = await fetch("/api/yukle", { method: "POST", body: form }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { id?: string; ad?: string; hata?: string } | null;
    setYukleniyor(null);
    if (r?.ok && d?.id) setKisi((k) => ({ ...k, [alan.id]: `${d.id}|${d.ad}` }));
    else bildir({ mesaj: d?.hata ?? "Dosya yüklenemedi, tekrar deneyin." });
  };

  // Vitrin modunda müşterinin seçimleri WhatsApp mesajına ve teklif formuna eklenir.
  const talepMetni = () => {
    const satirlar = [
      `Merhaba, "${u.ad}" için sipariş / fiyat bilgisi almak istiyorum.`,
      ...u.secenekler.map((o) => `${o.ad}: ${secim[o.ad]}`),
      ...u.kisisellestirme.filter((a) => kisi[a.id]?.trim()).map((a) => `${a.baslik}: ${a.tip === "dosya" ? kisi[a.id].split("|")[1] : kisi[a.id].trim()}`),
      `Adet: ${adet}`,
    ];
    return satirlar.join("\n");
  };
  const teklifLinki = () => `/teklif?urun=${encodeURIComponent(u.slug)}&not=${encodeURIComponent(talepMetni().split("\n").slice(1).join("\n"))}`;

  const sepetSonra = sepet.araToplam;
  const kalan = Math.max(0, ucretsizKargoLimiti - sepetSonra);

  return (
    <div className="split" style={{ gap: "clamp(28px, 4vw, 56px)" }}>
      <section className="gal" aria-label="Ürün görselleri">
        <div className="stage" style={{ background: seciliGorsel?.yol ? "#F3EEE6" : onizlemeVar && gorsel === 0 ? "#F3EEE6" : u.renk }}>
          {onizlemeVar && gorsel === 0 ? (
            <>
              <span className="live">
                <i />
                Canlı önizleme
              </span>
              <LevhaOnizleme
                satirlar={metinAlanlari.map((a) => kisi[a.id]?.trim() ?? "")}
                fontAilesi={fontAilesi(fontAlani ? kisi[fontAlani.id] : "")}
                zemin={zeminBul(Object.values(secim), u.malzeme)}
                yaziRengi={renkAlani ? renkAlani.renkler?.find((r) => r.ad === kisi[renkAlani.id])?.hex : undefined}
                olcu={boyutBul(Object.values(secim))}
                logo={!!(dosyaAlani && kisi[dosyaAlani.id])}
                etiket={u.secenekler.find((o) => o.ad === "Boyut") ? secim.Boyut : undefined}
              />
            </>
          ) : seciliGorsel?.yol ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seciliGorsel.yol} alt={seciliGorsel.ad} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="mut" style={{ fontWeight: 600 }}>
              {seciliGorsel?.ad} (ürün fotoğrafı eklenecek)
            </span>
          )}
        </div>
        <div className="thumbs" role="group" aria-label="Görsel seç">
          {gorseller.slice(0, 5).map((g, i) => (
            <button key={i} className={`th ${i === gorsel ? "on" : ""}`} aria-pressed={i === gorsel} onClick={() => setGorsel(i)} style={g.yol ? { backgroundImage: `url(${g.yol})`, backgroundSize: "cover" } : undefined}>
              {g.yol ? <span className="vh">{g.ad}</span> : g.ad}
            </button>
          ))}
        </div>
        {onizlemeVar && <p className="xs mut">Önizleme yaklaşık görünümdür. Siparişten sonra ustalarımız tasarımı hazırlayıp onayınıza sunar.</p>}
      </section>

      <section className="info" aria-labelledby="h-ad">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {kategori && <span className="pill">{kategori}</span>}
          {kisisel && <span className="pill" style={{ background: "#DFF3E3", color: "#166534" }}>Üretimden önce tasarım onayı</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 id="h-ad" style={{ fontSize: "clamp(28px, 3vw, 38px)" }}>{u.ad}</h1>
          {puan !== null && (
            <a className="rt" href="#bilgi" style={{ textDecoration: "none" }}>
              <span className="st" aria-hidden="true">★★★★★</span>
              <b style={{ color: "#1C1F1E" }}>{String(puan).replace(".", ",")}</b>
              <span style={{ textDecoration: "underline" }}>{yorumSayisi} değerlendirme</span>
            </a>
          )}
        </div>
        {mod.fiyat ? (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="hd num" style={{ fontSize: 34, fontWeight: 800 }} aria-live="polite">{para(toplam)}</span>
            {indirimde && adet === 1 && sonuc.birim === u.indirimliFiyat && <span className="old" style={{ fontSize: 18 }}>{para(u.fiyat)}</span>}
            {adet > 1 && <span className="mut">{para(sonuc.birim)} × {adet} adet</span>}
          </div>
          <p className="sm mut" style={{ marginTop: 4 }}>{mod.satis ? `KDV dahil · Kredi kartına 3 taksit: 3 × ${para(Math.ceil(toplam / 300) * 100)}` : "KDV dahil"}</p>
        </div>
        ) : (
          <p style={{ fontWeight: 700, color: "#4A2E85", fontSize: 18 }}>Fiyat için bize ulaşın</p>
        )}

        {u.secenekler.map((o) => (
          <div className="opt" key={o.ad}>
            <div className="ol"><b>{o.ad}</b><span className="sm mut">{secim[o.ad]}</span></div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(o.degerler.length, 3)}, minmax(0, 1fr))`, gap: 10 }}>
              {o.degerler.map((d) => {
                const kapali = kombinasyonKapali(o.ad, d.ad);
                return (
                  <button key={d.ad} className={`ch2 ${secim[o.ad] === d.ad ? "on" : ""}`} aria-pressed={secim[o.ad] === d.ad} disabled={kapali} onClick={() => { setSecim((s) => ({ ...s, [o.ad]: d.ad })); setGorsel(0); }}>
                    <b>{d.ad}</b>
                    <span>{kapali ? "Bu seçimle yok" : d.fark ? (d.fark > 0 ? "+" : "−") + para(Math.abs(d.fark)) : "Fiyat farkı yok"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {kisisel && (
          <div className="kis" id="kisisel-alanlar" aria-labelledby="h-kis">
            <h2 id="h-kis" style={{ fontSize: 20 }}>Kişiselleştirin</h2>
            {u.kisisellestirme.map((a) => {
              const deger = kisi[a.id] ?? "";
              const ek = a.ucret ? ` · ${a.zorunlu ? "" : "isteğe bağlı, "}+${para(a.ucret)}` : a.zorunlu ? " · zorunlu" : " · isteğe bağlı";
              if (a.tip === "metin")
                return (
                  <div key={a.id}>
                    <div className="ol">
                      <label className="lbl" htmlFor={`k-${a.id}`} style={{ margin: 0 }}>{a.baslik} <span className="mut" style={{ fontWeight: 500 }}>{ek}</span></label>
                      {a.sinir && <span className="xs mut">{deger.length} / {a.sinir}</span>}
                    </div>
                    <input
                      id={`k-${a.id}`}
                      className={`inp ${hatalar.some((h) => h.startsWith(a.baslik)) ? "bad" : ""}`}
                      style={{ marginTop: 7 }}
                      maxLength={a.sinir}
                      value={deger}
                      placeholder={a.ornek}
                      onChange={(e) => { setKisi((k) => ({ ...k, [a.id]: e.target.value })); setGorsel(0); setHatalar([]); }}
                    />
                  </div>
                );
              if (a.tip === "font")
                return (
                  <div className="opt" key={a.id}>
                    <span className="lbl" style={{ margin: 0 }}>{a.baslik}</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(a.fontlar ?? []).map((f) => (
                        <button key={f} className={`chip ${deger === f ? "on" : ""}`} aria-pressed={deger === f} onClick={() => { setKisi((k) => ({ ...k, [a.id]: f })); setGorsel(0); }} style={{ fontFamily: fontAilesi(f), fontSize: /Vibes|Pacifico/.test(f) ? 20 : 15, fontWeight: 500 }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              if (a.tip === "renk")
                return (
                  <div className="opt" key={a.id}>
                    <div className="ol"><span className="lbl" style={{ margin: 0 }}>{a.baslik}</span><span className="sm mut">{deger}</span></div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(a.renkler ?? []).map((r, i) => (
                        <button key={r.ad} className={`swc ${deger === r.ad ? "on" : ""}`} aria-pressed={deger === r.ad} onClick={() => { setKisi((k) => ({ ...k, [a.id]: r.ad })); setGorsel(0); }}>
                          <i style={{ background: r.hex }} />
                          {r.ad}{i > 0 && a.ucret ? ` +${para(a.ucret)}` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              return (
                <div className="ol" style={{ alignItems: "center" }} key={a.id}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{a.baslik} <span className="mut" style={{ fontWeight: 500 }}>{ek}</span></p>
                    <p className="xs mut">PNG, JPG, SVG, WEBP veya PDF · en fazla 20 MB</p>
                  </div>
                  <input ref={(el) => { dosyaRef.current[a.id] = el; }} type="file" accept=".png,.jpg,.jpeg,.svg,.webp,.pdf" hidden onChange={(e) => e.target.files?.[0] && dosyaYukle(a, e.target.files[0])} />
                  {deger ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="sm ok" style={{ fontWeight: 700 }}>{deger.split("|")[1]} eklendi</span>
                      <button className="btn s gh" onClick={() => setKisi((k) => ({ ...k, [a.id]: "" }))}>Kaldır</button>
                    </span>
                  ) : (
                    <button className="btn s" disabled={yukleniyor === a.id} onClick={() => dosyaRef.current[a.id]?.click()}>{yukleniyor === a.id ? "Yükleniyor…" : "Dosya seç"}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hatalar.length > 0 && (
          <div className="hata-kutu" role="alert">
            <b>Sepete eklemeden önce:</b>
            <ul>{hatalar.map((h) => <li key={h}>{h}</li>)}</ul>
          </div>
        )}

        {mod.satis ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="qty" role="group" aria-label="Adet">
            <button aria-label="Azalt" onClick={() => setAdet((a) => Math.max(1, a - 1))} disabled={adet <= 1}>−</button>
            <span aria-live="polite">{adet}</span>
            <button aria-label="Artır" onClick={() => setAdet((a) => Math.min(500, a + 1))}>+</button>
          </div>
          <button className="btn pri" style={{ flex: "1 1 220px", minHeight: 58, fontSize: 17 }} onClick={sepeteEkle} disabled={u.stokYok}>
            {u.stokYok ? "Şu an tükendi" : `Sepete ekle · ${para(toplam)}`}
          </button>
          <button
            className={`fav ${fav ? "on" : ""}`}
            style={{ position: "static", width: 58, height: 58, boxShadow: "none", border: "1.5px solid #CFCBC3" }}
            aria-label={fav ? "Favorilerden çıkar" : "Favorilere ekle"}
            aria-pressed={fav}
            onClick={() => bildir({ mesaj: degistir(u.id) ? "Favorilere eklendi." : "Favorilerden çıkarıldı." })}
          >
            <KalpIkon dolu={fav} />
          </button>
        </div>
        ) : (
          <div className="vitrin">
            <p style={{ fontWeight: 700, fontSize: 17 }}>Online satış çok yakında</p>
            <p className="sm" style={{ color: "#3F4542" }}>Bu ürünü şimdiden sipariş vermek ya da fiyat almak için bize yazın. Yukarıdaki seçimleriniz mesaja otomatik eklenir.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div className="qty" role="group" aria-label="Adet">
                <button aria-label="Azalt" onClick={() => setAdet((a) => Math.max(1, a - 1))} disabled={adet <= 1}>−</button>
                <span aria-live="polite">{adet}</span>
                <button aria-label="Artır" onClick={() => setAdet((a) => Math.min(500, a + 1))}>+</button>
              </div>
              <button
                className={`fav ${fav ? "on" : ""}`}
                style={{ position: "static", width: 58, height: 58, boxShadow: "none", border: "1.5px solid #CFCBC3" }}
                aria-label={fav ? "Favorilerden çıkar" : "Favorilere ekle"}
                aria-pressed={fav}
                onClick={() => bildir({ mesaj: degistir(u.id) ? "Favorilere eklendi." : "Favorilerden çıkarıldı." })}
              >
                <KalpIkon dolu={fav} />
              </button>
            </div>
            <a className="btn wa-btn" style={{ width: "100%", minHeight: 58, fontSize: 17 }} href={waLinki(mod.whatsapp, talepMetni())} target="_blank" rel="noopener">
              <MesajIkon boyut={20} renk="#fff" /> WhatsApp’tan sipariş ver
            </a>
            <Link className="btn wide" href={teklifLinki()}>Teklif iste (toplu ve kurumsal)</Link>
          </div>
        )}

        <div className="dlv">
          <span style={{ flex: "0 0 auto" }}><KamyonIkon boyut={26} renk="#15803D" /></span>
          <div>
            <p style={{ fontWeight: 700 }}>{mod.satis ? `Bugün sipariş verirseniz ${kargoTarihi} kargoda` : `Üretim süresi: ${uretimSuresi}`}</p>
            <p className="sm" style={{ color: "#3F4542" }}>
              {kisisel ? `Tasarımınız 1 iş günü içinde onayınıza gelir. Onaydan sonra ${uretimSuresi} içinde kargoya veririz.` : `Hazırlık süresi ${uretimSuresi}.`}
              {mod.satis && ` Sepetiniz ${para(ucretsizKargoLimiti)}’yi geçerse kargo bedava.`}
            </p>
          </div>
        </div>

        {mod.fiyat && (
        <details style={{ borderTop: "1px solid #E7E4DE", borderBottom: "1px solid #E7E4DE", padding: "4px 0" }}>
          <summary style={{ cursor: "pointer", minHeight: 48, display: "flex", alignItems: "center", fontWeight: 700 }}>Fiyat dökümü</summary>
          <div style={{ paddingBottom: 12 }}>
            {sonuc.dokum.map((d, i) => (
              <div className="dl" key={i}><span className="mut">{d.ad}</span><span className="num">{i > 0 && d.tutar > 0 ? "+" : ""}{para(d.tutar)}</span></div>
            ))}
            <div className="dl" style={{ fontWeight: 700, borderTop: "1px solid #E7E4DE", marginTop: 4, paddingTop: 10 }}><span>Birim fiyat</span><span className="num">{para(sonuc.birim)}</span></div>
          </div>
        </details>
        )}

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }} className="sm">
          {mod.satis && <span style={{ display: "flex", gap: 8, alignItems: "center" }}><KalkanIkon boyut={20} renk="#5B3A9E" />3D Secure ile güvenli ödeme</span>}
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}><YenileIkon renk="#5B3A9E" />{kisisel ? "Üretim hatasında ücretsiz yenileme" : "14 gün içinde iade"}</span>
          <a href={whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Merhaba, "${u.ad}" hakkında bir sorum var.`)}` : "/bilgi/iletisim"} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
            <MesajIkon boyut={20} renk="#15803D" />Sorunuz mu var? Yazın
          </a>
        </div>
      </section>

      {cekmece && (
        <div className="drw" role="dialog" aria-modal="true" aria-labelledby="dr-t" onClick={(e) => e.target === e.currentTarget && setCekmece(false)}>
          <div className="pn">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="dr-t" style={{ fontSize: 22 }}>Sepete eklendi</h2>
              <button className="btn s gh" onClick={() => setCekmece(false)}>Kapat ✕</button>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <span className="ph" style={{ width: 84, height: 84, flex: "0 0 auto", fontSize: 11, background: u.renk }}>Ürün</span>
              <div>
                <p style={{ fontWeight: 700 }}>{u.ad}</p>
                <p className="sm mut">{ozet()}</p>
                <p className="sm" style={{ marginTop: 4 }}>{adet} adet · <b>{para(toplam)}</b></p>
              </div>
            </div>
            <div style={{ background: "#F6F4F0", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <p className="sm" style={{ fontWeight: 600 }}>{kalan === 0 ? "Kargonuz ücretsiz." : `Ücretsiz kargo için ${para(kalan)} daha ekleyin.`}</p>
              <span className="bar"><i style={{ width: `${Math.min(100, Math.round((sepetSonra / ucretsizKargoLimiti) * 100))}%` }} /></span>
            </div>
            <Link className="btn pri wide" href="/sepet">Sepete git ve öde</Link>
            <button className="btn wide" onClick={() => setCekmece(false)}>Alışverişe devam et</button>
            {kisisel && <p className="xs mut" style={{ textAlign: "center" }}>Tasarımınızı ödeme sonrası onayınıza sunacağız.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
