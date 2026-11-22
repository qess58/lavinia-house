"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { Gorsel, KisiAlanTipi } from "@/lib/tipler";
import { kombinasyonlar } from "@/lib/varyant";
import { slugify } from "@/lib/bicim";
import { urunKaydet, type UrunGirdisi } from "./eylemler";
import { kurusa } from "../../ortak";
import { gorseliKucult } from "@/lib/istemci-yukleme";

type Alan = UrunGirdisi["kisisellestirme"][number];
type Props = {
  baslangic: UrunGirdisi;
  kategoriler: { id: number; ad: string }[];
  fontlar: string[];
  malzemeler: string[];
};

const ALAN_TURLERI: { tip: KisiAlanTipi; ad: string; aciklama: string }[] = [
  { tip: "metin", ad: "Yazı", aciklama: "Müşteri isim, tarih gibi bir metin yazar." },
  { tip: "font", ad: "Yazı tipi", aciklama: "Müşteri listeden yazı tipi seçer." },
  { tip: "renk", ad: "Renk", aciklama: "Müşteri yazı / baskı rengini seçer. İlk renk ücretsizdir." },
  { tip: "dosya", ad: "Dosya / logo", aciklama: "Müşteri logo veya çizim yükler." },
];

const yeniId = (tip: string, mevcut: string[]) => {
  for (let i = 1; ; i++) {
    const aday = i === 1 ? tip : `${tip}${i}`;
    if (!mevcut.includes(aday)) return aday;
  }
};

export function UrunFormu({ baslangic, kategoriler, fontlar, malzemeler }: Props) {
  const [v, setV] = useState(baslangic);
  const [hatalar, setHatalar] = useState<string[]>([]);
  const [kaydediliyor, gecis] = useTransition();
  const [yukleniyor, setYukleniyor] = useState(0);
  const [yuklemeHatasi, setYuklemeHatasi] = useState("");
  const [slugElle, setSlugElle] = useState(!!baslangic.id);
  const dosyaRef = useRef<HTMLInputElement>(null);
  const hataRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof UrunGirdisi>(k: K, deger: UrunGirdisi[K]) => setV((x) => ({ ...x, [k]: deger }));
  const kombs = kombinasyonlar(v.secenekler.filter((s) => s.ad.trim() && s.degerler.some((d) => d.ad.trim())).map((s) => ({ ad: s.ad, degerler: s.degerler.filter((d) => d.ad.trim()) })));

  const kaydet = () =>
    gecis(async () => {
      setHatalar([]);
      const sonuc = await urunKaydet(v);
      if (sonuc?.hatalar?.length) {
        setHatalar(sonuc.hatalar);
        requestAnimationFrame(() => hataRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    });

  const yukle = async (dosyalar: FileList) => {
    setYuklemeHatasi("");
    const liste = [...dosyalar].slice(0, 12 - v.gorseller.length);
    setYukleniyor(liste.length);
    for (const f of liste) {
      const form = new FormData();
      form.append("dosya", await gorseliKucult(f));
      form.append("klasor", "urun");
      const r = await fetch("/yonetim/medya", { method: "POST", body: form }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { yol?: string; hata?: string } | null;
      if (d?.yol) setV((x) => ({ ...x, gorseller: [...x.gorseller, { yol: d.yol!, alt: x.ad }] }));
      else setYuklemeHatasi(`${f.name}: ${d?.hata ?? "yüklenemedi."}`);
      setYukleniyor((n) => n - 1);
    }
  };
  const gorselTasi = (i: number, yon: number) => {
    const g = [...v.gorseller];
    const j = i + yon;
    if (j < 0 || j >= g.length) return;
    [g[i], g[j]] = [g[j], g[i]];
    set("gorseller", g);
  };

  const secenekGuncelle = (i: number, f: (s: UrunGirdisi["secenekler"][number]) => UrunGirdisi["secenekler"][number]) =>
    set("secenekler", v.secenekler.map((s, j) => (j === i ? f(s) : s)));
  const alanGuncelle = (i: number, deger: Partial<Alan>) => set("kisisellestirme", v.kisisellestirme.map((a, j) => (j === i ? { ...a, ...deger } : a)));
  const varyant = (k: string) => v.varyantlar[k] ?? { aktif: true, fark: "" };

  const fiyatN = kurusa(v.fiyat) ?? 0;
  const indirimN = kurusa(v.indirimliFiyat) ?? 0;
  const yuzde = fiyatN > 0 && indirimN > 0 && indirimN < fiyatN ? Math.round((1 - indirimN / fiyatN) * 100) : null;
  const seoBaslik = v.seoBaslik || `${v.ad || "Ürün adı"} · Lavinia House`;
  const seoAciklama = v.seoAciklama || v.aciklama.split("\n")[0].slice(0, 160) || "Ürün açıklamasının ilk satırı burada görünür.";

  return (
    <>
      {hatalar.length > 0 && (
        <div className="y-msg y-hata" role="alert" ref={hataRef}>
          <b>Kaydedilemedi:</b>
          <ul className="y-hata-liste">{hatalar.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      )}
      <div className="y-split">
        <div className="y-wide">
          <section className="y-card" aria-labelledby="u-temel">
            <h2 id="u-temel">Temel bilgiler</h2>
            <div>
              <label className="y-lbl" htmlFor="u-ad">Ürün adı</label>
              <input id="u-ad" className="y-inp" value={v.ad} maxLength={120} onChange={(e) => setV((x) => ({ ...x, ad: e.target.value, slug: slugElle ? x.slug : slugify(e.target.value) }))} />
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-ac">Açıklama</label>
              <textarea id="u-ac" className="y-inp" rows={9} value={v.aciklama} onChange={(e) => set("aciklama", e.target.value)} />
              <p className="y-hint">İlk paragraf ürün kartında ve Google’da kısa açıklama olarak kullanılır. Madde için satıra “• ” ile başlayın, paragraf için boş satır bırakın.</p>
            </div>
          </section>

          <section className="y-card" aria-labelledby="u-foto">
            <div className="y-row y-sp">
              <h2 id="u-foto">Fotoğraflar</h2>
              <span className="y-sm y-mut">{v.gorseller.length} / 12 · ilk fotoğraf kapak olur</span>
            </div>
            <div className="y-medya">
              {v.gorseller.map((g: Gorsel, i) => (
                <div className="y-mt" key={g.yol}>
                  {i === 0 && <span className="y-cap">Kapak</span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.yol} alt={g.alt} />
                  <input aria-label={`Fotoğraf ${i + 1} açıklaması`} placeholder="Fotoğraf açıklaması" value={g.alt} onChange={(e) => set("gorseller", v.gorseller.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                  <div className="y-ctl">
                    <button type="button" className="y-btn y-s y-gh" onClick={() => gorselTasi(i, -1)} disabled={i === 0} aria-label="Sola taşı">←</button>
                    <button type="button" className="y-btn y-s y-gh" onClick={() => gorselTasi(i, 1)} disabled={i === v.gorseller.length - 1} aria-label="Sağa taşı">→</button>
                    <button type="button" className="y-btn y-s y-gh" style={{ marginLeft: "auto", color: "#B91C1C" }} onClick={() => set("gorseller", v.gorseller.filter((_, j) => j !== i))} aria-label="Fotoğrafı kaldır">Kaldır</button>
                  </div>
                </div>
              ))}
              {v.gorseller.length < 12 && (
                <button type="button" className="y-yukle" onClick={() => dosyaRef.current?.click()} disabled={yukleniyor > 0}>
                  {yukleniyor > 0 ? `Yükleniyor (${yukleniyor})…` : "+ Fotoğraf ekle"}
                  <span className="y-sm y-mut" style={{ fontWeight: 400 }}>JPG, PNG, WEBP · birden çok seçebilirsiniz</span>
                </button>
              )}
            </div>
            <input ref={dosyaRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { if (e.target.files?.length) yukle(e.target.files); e.target.value = ""; }} />
            {yuklemeHatasi && <p className="y-msg y-hata">{yuklemeHatasi}</p>}
            <p className="y-hint" style={{ marginTop: 0 }}>Büyük fotoğraflar otomatik küçültülür. Kare ve açık zeminli fotoğraflar listede en iyi görünür.</p>
          </section>

          <section className="y-card" aria-labelledby="u-sec">
            <div>
              <h2 id="u-sec">Seçenekler</h2>
              <p className="y-sub y-sm">Malzeme, boyut, renk gibi müşterinin seçeceği özellikler. Fiyat farkı boş kalırsa ücret değişmez; indirim için eksi yazın (ör. -40).</p>
            </div>
            {v.secenekler.map((s, i) => (
              <div className="y-pf" key={i}>
                <div className="y-row">
                  <input className="y-inp" style={{ flex: "1 1 200px", width: "auto" }} placeholder="Seçenek adı (ör. Boyut)" aria-label="Seçenek adı" value={s.ad} onChange={(e) => secenekGuncelle(i, (x) => ({ ...x, ad: e.target.value }))} />
                  <button type="button" className="y-btn y-s y-red" onClick={() => set("secenekler", v.secenekler.filter((_, j) => j !== i))}>Seçeneği sil</button>
                </div>
                <div className="y-deg y-sm y-mut" aria-hidden="true"><span>Değer</span><span>Fiyat farkı (₺)</span><span /></div>
                {s.degerler.map((d, j) => (
                  <div className="y-deg" key={j}>
                    <input className="y-inp y-s" aria-label={`${s.ad || "Seçenek"} değeri ${j + 1}`} placeholder="ör. 30 × 20 cm" value={d.ad} onChange={(e) => secenekGuncelle(i, (x) => ({ ...x, degerler: x.degerler.map((y, k) => (k === j ? { ...y, ad: e.target.value } : y)) }))} />
                    <input className="y-inp y-s" aria-label={`${d.ad || "Değer"} fiyat farkı`} inputMode="decimal" placeholder="0" value={d.fark} onChange={(e) => secenekGuncelle(i, (x) => ({ ...x, degerler: x.degerler.map((y, k) => (k === j ? { ...y, fark: e.target.value } : y)) }))} />
                    <button type="button" className="y-btn y-s y-gh y-ic" aria-label="Değeri sil" disabled={s.degerler.length === 1} onClick={() => secenekGuncelle(i, (x) => ({ ...x, degerler: x.degerler.filter((_, k) => k !== j) }))}>✕</button>
                  </div>
                ))}
                <div><button type="button" className="y-btn y-s" onClick={() => secenekGuncelle(i, (x) => ({ ...x, degerler: [...x.degerler, { ad: "", fark: "" }] }))}>+ Değer ekle</button></div>
              </div>
            ))}
            {v.secenekler.length < 5 && (
              <div><button type="button" className="y-btn" onClick={() => set("secenekler", [...v.secenekler, { ad: "", degerler: [{ ad: "", fark: "" }] }])}>+ Seçenek ekle</button></div>
            )}
            {kombs.length > 1 && kombs.length <= 120 && (
              <details className="y-ac">
                <summary>Kombinasyonlar ({kombs.length}) · satışta olmayanları kapatın</summary>
                <div style={{ padding: 0 }}>
                  <table className="y-vt">
                    <thead><tr><th>Kombinasyon</th><th>Satışta</th><th>Özel fiyat farkı (₺)</th></tr></thead>
                    <tbody>
                      {kombs.map((k) => {
                        const a = varyant(k);
                        return (
                          <tr key={k}>
                            <td className="y-sm">{k}</td>
                            <td><input type="checkbox" checked={a.aktif} aria-label={`${k} satışta`} onChange={(e) => set("varyantlar", { ...v.varyantlar, [k]: { ...a, aktif: e.target.checked } })} /></td>
                            <td><input className="y-inp y-s" style={{ maxWidth: 140 }} inputMode="decimal" placeholder="Otomatik" aria-label={`${k} özel fiyat farkı`} value={a.fark} onChange={(e) => set("varyantlar", { ...v.varyantlar, [k]: { ...a, fark: e.target.value } })} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="y-hint" style={{ padding: "0 14px 14px" }}>“Özel fiyat farkı” doluysa o kombinasyonda seçeneklerin farkları toplanmaz, bu tutar kullanılır.</p>
                </div>
              </details>
            )}
          </section>

          <section className="y-card" aria-labelledby="u-kisi">
            <div>
              <h2 id="u-kisi">Kişiselleştirme</h2>
              <p className="y-sub y-sm">Müşterinin ürün sayfasında dolduracağı alanlar. Alan eklenirse ürün “kişiye özel” olur ve siparişte tasarım onayı adımı açılır.</p>
            </div>
            {v.kisisellestirme.map((a, i) => (
              <div className="y-pf" key={a.id}>
                <div className="y-row y-sp">
                  <b>{ALAN_TURLERI.find((t) => t.tip === a.tip)?.ad} alanı</b>
                  <span className="y-row" style={{ gap: 4 }}>
                    <button type="button" className="y-btn y-s y-gh" disabled={i === 0} aria-label="Yukarı taşı" onClick={() => { const l = [...v.kisisellestirme]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; set("kisisellestirme", l); }}>▲</button>
                    <button type="button" className="y-btn y-s y-gh" disabled={i === v.kisisellestirme.length - 1} aria-label="Aşağı taşı" onClick={() => { const l = [...v.kisisellestirme]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; set("kisisellestirme", l); }}>▼</button>
                    <button type="button" className="y-btn y-s y-red" onClick={() => set("kisisellestirme", v.kisisellestirme.filter((_, j) => j !== i))}>Sil</button>
                  </span>
                </div>
                <div className="y-fg">
                  <div>
                    <label className="y-lbl" htmlFor={`a-b-${a.id}`}>Başlık (müşteri görür)</label>
                    <input id={`a-b-${a.id}`} className="y-inp" value={a.baslik} onChange={(e) => alanGuncelle(i, { baslik: e.target.value })} />
                  </div>
                  <div>
                    <label className="y-lbl" htmlFor={`a-u-${a.id}`}>Ek ücret (₺)</label>
                    <input id={`a-u-${a.id}`} className="y-inp" inputMode="decimal" placeholder="0" value={a.ucret} onChange={(e) => alanGuncelle(i, { ucret: e.target.value })} />
                  </div>
                </div>
                {a.tip === "metin" && (
                  <div className="y-fg">
                    <div>
                      <label className="y-lbl" htmlFor={`a-s-${a.id}`}>Karakter sınırı</label>
                      <input id={`a-s-${a.id}`} className="y-inp" type="number" min={0} max={500} value={a.sinir ?? ""} onChange={(e) => alanGuncelle(i, { sinir: e.target.value ? Number(e.target.value) : undefined })} />
                    </div>
                    <div>
                      <label className="y-lbl" htmlFor={`a-o-${a.id}`}>Örnek yazı</label>
                      <input id={`a-o-${a.id}`} className="y-inp" placeholder="Örn. Yılmaz Ailesi" value={a.ornek ?? ""} onChange={(e) => alanGuncelle(i, { ornek: e.target.value })} />
                    </div>
                  </div>
                )}
                {a.tip === "font" && (
                  <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                    <legend className="y-lbl">Sunulacak yazı tipleri</legend>
                    <div className="y-row">
                      {fontlar.map((f) => (
                        <label className="y-ck" key={f} style={{ marginRight: 12 }}>
                          <input type="checkbox" checked={a.fontlar?.includes(f) ?? false} onChange={(e) => alanGuncelle(i, { fontlar: e.target.checked ? [...(a.fontlar ?? []), f] : (a.fontlar ?? []).filter((x) => x !== f) })} />
                          <span style={{ fontFamily: `'${f}'` }}>{f}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                {a.tip === "renk" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className="y-lbl" style={{ marginBottom: 0 }}>Renkler (ilk renk ücretsiz varsayılan)</span>
                    {(a.renkler ?? []).map((r, j) => (
                      <div className="y-row" key={j}>
                        <input type="color" value={r.hex} aria-label={`${r.ad || "Renk"} kodu`} onChange={(e) => alanGuncelle(i, { renkler: a.renkler!.map((x, k) => (k === j ? { ...x, hex: e.target.value } : x)) })} />
                        <input className="y-inp y-s" style={{ flex: 1, width: "auto" }} placeholder="Renk adı" aria-label="Renk adı" value={r.ad} onChange={(e) => alanGuncelle(i, { renkler: a.renkler!.map((x, k) => (k === j ? { ...x, ad: e.target.value } : x)) })} />
                        <button type="button" className="y-btn y-s y-gh y-ic" aria-label="Rengi sil" onClick={() => alanGuncelle(i, { renkler: a.renkler!.filter((_, k) => k !== j) })}>✕</button>
                      </div>
                    ))}
                    <div><button type="button" className="y-btn y-s" onClick={() => alanGuncelle(i, { renkler: [...(a.renkler ?? []), { ad: "", hex: "#17201C" }] })}>+ Renk ekle</button></div>
                  </div>
                )}
                <label className="y-ck"><input type="checkbox" checked={a.zorunlu} onChange={(e) => alanGuncelle(i, { zorunlu: e.target.checked })} /> Doldurulması zorunlu</label>
              </div>
            ))}
            {v.kisisellestirme.length < 10 && (
              <div className="y-row">
                {ALAN_TURLERI.map((t) => (
                  <button
                    type="button"
                    key={t.tip}
                    className="y-btn y-s"
                    title={t.aciklama}
                    onClick={() =>
                      set("kisisellestirme", [
                        ...v.kisisellestirme,
                        {
                          id: yeniId(t.tip === "metin" ? "yazi" : t.tip === "dosya" ? "logo" : t.tip, v.kisisellestirme.map((x) => x.id)),
                          tip: t.tip,
                          baslik: t.ad,
                          zorunlu: t.tip === "metin" || t.tip === "font",
                          ucret: "",
                          ...(t.tip === "metin" ? { sinir: 20 } : {}),
                          ...(t.tip === "font" ? { fontlar: fontlar.slice(0, 3) } : {}),
                          ...(t.tip === "renk" ? { renkler: [{ ad: "Gravür (yakma)", hex: "#3B2A17" }, { ad: "Siyah", hex: "#17201C" }, { ad: "Beyaz", hex: "#FFFFFF" }] } : {}),
                        },
                      ])
                    }
                  >
                    + {t.ad}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="y-card" aria-labelledby="u-det">
            <h2 id="u-det">Ürün detayları</h2>
            <div className="y-fg">
              <div>
                <label className="y-lbl" htmlFor="u-mal">Malzeme (filtrede kullanılır)</label>
                <input id="u-mal" className="y-inp" list="u-mal-liste" value={v.malzeme} onChange={(e) => set("malzeme", e.target.value)} />
                <datalist id="u-mal-liste">{malzemeler.map((m) => <option key={m} value={m} />)}</datalist>
              </div>
              <div>
                <label className="y-lbl" htmlFor="u-olc">Ölçüler</label>
                <input id="u-olc" className="y-inp" placeholder="ör. 30 × 20 cm · 4 mm" value={v.olculer} onChange={(e) => set("olculer", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-bak">Bakım bilgisi</label>
              <textarea id="u-bak" className="y-inp" rows={2} value={v.bakim} onChange={(e) => set("bakim", e.target.value)} />
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-et">Arama etiketleri</label>
              <input id="u-et" className="y-inp" placeholder="isimlik, kapı, hediye" value={v.etiketler} onChange={(e) => set("etiketler", e.target.value)} />
              <p className="y-hint">Virgülle ayırın. Müşteri bu kelimelerle aradığında ürün bulunur.</p>
            </div>
          </section>

          <section className="y-card" aria-labelledby="u-seo">
            <div>
              <h2 id="u-seo">Google’da görünüm</h2>
              <p className="y-sub y-sm">Boş bırakırsanız ürün adı ve açıklamanın ilk satırı kullanılır.</p>
            </div>
            <div className="y-goog" aria-label="Google sonuç önizlemesi">
              <div className="u">laviniahouse.com › urun › {v.slug || slugify(v.ad) || "urun-adi"}</div>
              <div className="t">{seoBaslik.slice(0, 65)}{seoBaslik.length > 65 ? "…" : ""}</div>
              <div className="d">{seoAciklama.slice(0, 160)}{seoAciklama.length > 160 ? "…" : ""}</div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-sb">Sayfa başlığı</label>
              <input id="u-sb" className="y-inp" maxLength={70} placeholder={`${v.ad || "Ürün adı"} · Lavinia House`} value={v.seoBaslik} onChange={(e) => set("seoBaslik", e.target.value)} />
              <p className={`y-say ${v.seoBaslik.length > 60 ? "y-asim" : ""}`}>{v.seoBaslik.length} / 60 önerilen</p>
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-sa">Açıklama</label>
              <textarea id="u-sa" className="y-inp" rows={2} maxLength={170} value={v.seoAciklama} onChange={(e) => set("seoAciklama", e.target.value)} />
              <p className={`y-say ${v.seoAciklama.length > 160 ? "y-asim" : ""}`}>{v.seoAciklama.length} / 160 önerilen</p>
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-sl">Bağlantı adı</label>
              <input id="u-sl" className="y-inp" value={v.slug} onChange={(e) => { setSlugElle(true); set("slug", e.target.value); }} />
              <p className="y-hint">Yayındaki bir ürünün bağlantı adını değiştirirseniz Google’daki ve paylaşılmış eski bağlantılar çalışmaz.</p>
            </div>
          </section>
        </div>

        <aside className="y-narrow">
          <section className="y-card" aria-labelledby="u-dur">
            <h2 id="u-dur">Durum</h2>
            <select className="y-inp" aria-labelledby="u-dur" value={v.durum} onChange={(e) => set("durum", e.target.value as UrunGirdisi["durum"])}>
              <option value="yayinda">Yayında: mağazada görünür</option>
              <option value="taslak">Taslak: hazırlanıyor, görünmez</option>
              <option value="gizli">Gizli: bağlantıyla açılır, listede yok</option>
            </select>
            {v.id && baslangic.durum !== "taslak" && <Link className="y-sm" href={`/urun/${baslangic.slug}`} target="_blank">Mağazada gör ↗</Link>}
          </section>

          <section className="y-card" aria-labelledby="u-fy">
            <h2 id="u-fy">Fiyat</h2>
            <div className="y-fg" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="y-lbl" htmlFor="u-f">Fiyat (₺)</label>
                <input id="u-f" className="y-inp" inputMode="decimal" value={v.fiyat} onChange={(e) => set("fiyat", e.target.value)} />
              </div>
              <div>
                <label className="y-lbl" htmlFor="u-if">İndirimli (₺)</label>
                <input id="u-if" className="y-inp" inputMode="decimal" placeholder="Yok" value={v.indirimliFiyat} onChange={(e) => set("indirimliFiyat", e.target.value)} />
              </div>
            </div>
            {yuzde !== null && <p className="y-sm" style={{ color: "#166534", fontWeight: 600 }}>Mağazada “%{yuzde} indirim” olarak görünür.</p>}
          </section>

          <section className="y-card" aria-labelledby="u-st">
            <h2 id="u-st">Stok ve hazırlık</h2>
            <label className="y-ck"><input type="radio" name="stokTipi" checked={v.stokTipi === "adet"} onChange={() => set("stokTipi", "adet")} /> Hazır stok: adet takip edilsin</label>
            <label className="y-ck"><input type="radio" name="stokTipi" checked={v.stokTipi === "kapasite"} onChange={() => set("stokTipi", "kapasite")} /> Siparişe üretim: stok takibi yok</label>
            {v.stokTipi === "adet" && (
              <div>
                <label className="y-lbl" htmlFor="u-stok">Stok adedi</label>
                <input id="u-stok" className="y-inp" type="number" min={0} value={v.stok} onChange={(e) => set("stok", Math.max(0, Number(e.target.value) || 0))} />
                <p className="y-hint">Sipariş geldikçe otomatik düşer. 0 olunca “Tükendi” yazar.</p>
              </div>
            )}
            <div className="y-fg" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="y-lbl" htmlFor="u-hmin">En az (iş günü)</label>
                <input id="u-hmin" className="y-inp" type="number" min={0} value={v.hazirlikGunMin} onChange={(e) => set("hazirlikGunMin", Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div>
                <label className="y-lbl" htmlFor="u-hmax">En çok (iş günü)</label>
                <input id="u-hmax" className="y-inp" type="number" min={0} value={v.hazirlikGunMax} onChange={(e) => set("hazirlikGunMax", Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
            <p className="y-hint" style={{ marginTop: -6 }}>Kargoya veriliş tarihi buna göre hesaplanır.</p>
            <div>
              <label className="y-lbl" htmlFor="u-us">Üretim süresi yazısı</label>
              <input id="u-us" className="y-inp" placeholder="2–3 iş günü" value={v.uretimSuresi} onChange={(e) => set("uretimSuresi", e.target.value)} />
            </div>
          </section>

          <section className="y-card" aria-labelledby="u-kat">
            <h2 id="u-kat">Düzen</h2>
            <div>
              <label className="y-lbl" htmlFor="u-k">Kategori</label>
              <select id="u-k" className="y-inp" value={v.kategoriId ?? ""} onChange={(e) => set("kategoriId", e.target.value ? Number(e.target.value) : null)}>
                <option value="">Kategorisiz</option>
                {kategoriler.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
              </select>
            </div>
            <div>
              <label className="y-lbl" htmlFor="u-r">Rozet</label>
              <input id="u-r" className="y-inp" list="u-r-liste" placeholder="Yok" value={v.rozet} onChange={(e) => set("rozet", e.target.value)} />
              <datalist id="u-r-liste"><option value="Çok satan" /><option value="Yeni" /><option value="Sınırlı sayıda" /><option value="El yapımı" /></datalist>
              <p className="y-hint">Ürün fotoğrafının köşesinde görünür. “Yeni” yazılırsa “Yeni gelenler”de öne çıkar.</p>
            </div>
            <label className="y-ck"><input type="checkbox" checked={v.yapimSeti} onChange={(e) => set("yapimSeti", e.target.checked)} /> Yapım seti (kendin kur)</label>
            <label className="y-ck">
              <input type="color" value={v.renk} onChange={(e) => set("renk", e.target.value)} aria-label="Fotoğraf yokken kart rengi" />
              <span className="y-sm">Fotoğraf yokken kart rengi</span>
            </label>
          </section>
        </aside>
      </div>
      <div className="y-sticky">
        <button type="button" className="y-btn y-pri" onClick={kaydet} disabled={kaydediliyor || yukleniyor > 0}>
          {kaydediliyor ? "Kaydediliyor…" : v.id ? "Değişiklikleri kaydet" : "Ürünü oluştur"}
        </button>
        <Link className="y-btn y-gh" href="/yonetim/urunler">Vazgeç</Link>
        {hatalar.length > 0 && <span className="y-sm" style={{ color: "#B91C1C", fontWeight: 600 }}>{hatalar.length} sorun var, yukarıya bakın.</span>}
      </div>
    </>
  );
}
