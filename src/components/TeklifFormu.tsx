"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TikIkon, YukleIkon } from "./Ikonlar";
import { bulutaYukle, rastgeleKimlik, yuklemeBilgisi } from "@/lib/istemci-yukleme";
import { guvenliAd, TEKLIF_DOSYASI, uzanti } from "@/lib/yukleme-kurallari";

type Tur = "bireysel" | "kurumsal";
const BOS = { aciklama: "", malzeme: "Emin değilim, önerin", olcu: "", adet: "1", istenenTarih: "", firma: "", sektor: "Otel ve turizm", vergiNo: "", butce: "Belirtmek istemiyorum", numune: false, ad: "", eposta: "", telefon: "", kanal: "eposta" as "eposta" | "telefon" | "whatsapp", kvkk: false };
const KANAL = [["eposta", "E-posta"], ["telefon", "Telefon"], ["whatsapp", "WhatsApp"]] as const;
const KANAL_YAZI = { eposta: "e-postayla", telefon: "telefonla", whatsapp: "WhatsApp’tan" };
const boyut = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function TeklifFormu({ baslangic, onDolum = "", adet = "" }: { baslangic: Tur; onDolum?: string; adet?: string }) {
  const [tur, setTur] = useState<Tur>(baslangic);
  const [v, setV] = useState({ ...BOS, aciklama: onDolum, adet: adet || (baslangic === "kurumsal" ? "50" : "1") });
  const [dosyalar, setDosyalar] = useState<File[]>([]);
  const [surukle, setSurukle] = useState(false);
  const [denendi, setDenendi] = useState(false);
  const [hatalar, setHatalar] = useState<string[]>([]);
  const [bekle, setBekle] = useState(false);
  const [ilerleme, setIlerleme] = useState<string>("");
  const [tamam, setTamam] = useState<{ no: number } | null>(null);
  const girdi = useRef<HTMLInputElement>(null);
  // Doğrudan depoya yüklenmiş dosyalar: form tekrar gönderilirse aynı dosya yeniden yüklenmez.
  const yuklenmis = useRef(new Map<File, string>());
  const klasor = useRef("");
  const sayac = useRef(0);
  const kur = tur === "kurumsal";
  const set = (k: keyof typeof BOS) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const err = {
    aciklama: v.aciklama.trim().length < 3,
    ad: v.ad.trim().length < 2,
    eposta: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.eposta.trim()),
    firma: kur && !v.firma.trim(),
    kvkk: !v.kvkk,
  };
  const g = (k: keyof typeof err) => denendi && err[k];
  const ekle = (liste: FileList | null) => liste && setDosyalar((d) => [...d, ...Array.from(liste)].slice(0, 10));

  if (tamam)
    return (
      <div className="card" style={{ maxWidth: 720, margin: "24px auto", alignItems: "center", textAlign: "center", padding: "44px 28px", gap: 16 }}>
        <span style={{ width: 72, height: 72, borderRadius: "50%", background: "#DFF3E3", display: "flex", alignItems: "center", justifyContent: "center" }}><TikIkon boyut={38} /></span>
        <h1 style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>Talebiniz alındı</h1>
        <p style={{ fontSize: 17 }}>Talep numaranız <b>T-{tamam.no}</b>. {dosyalar.length ? `${dosyalar.length} dosyanızı ve talebinizi` : "Talebinizi"} inceleyip <b>1 iş günü içinde</b> fiyat ve teslim tarihiyle {KANAL_YAZI[v.kanal]} döneceğiz.</p>
        <p className="sm mut">Teklifi onaylarsanız size bir ödeme bağlantısı gelir; ödeme sonrası tasarımı yine onayınıza sunarız.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn pri" href="/">Ana sayfaya dön</Link>
          <button className="btn" onClick={() => { setTamam(null); setDosyalar([]); setV({ ...BOS }); setDenendi(false); yuklenmis.current.clear(); klasor.current = ""; }}>Yeni talep oluştur</button>
        </div>
      </div>
    );

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(err).some(Boolean)) {
      setDenendi(true);
      return;
    }
    const sorunlu = dosyalar.flatMap((f) =>
      !TEKLIF_DOSYASI.uzantilar.includes(uzanti(f.name)) ? [`${f.name}: bu dosya türü kabul edilmiyor.`] : f.size > TEKLIF_DOSYASI.azami ? [`${f.name}: dosya 50 MB'tan büyük.`] : [],
    );
    if (sorunlu.length) return setHatalar(sorunlu);
    setBekle(true);
    setHatalar([]);
    const form = new FormData();
    form.append("tur", tur);
    for (const [k, x] of Object.entries(v)) {
      if (!kur && ["firma", "sektor", "vergiNo", "butce", "numune"].includes(k)) continue;
      if (typeof x === "boolean") { if (x) form.append(k, "1"); }
      else if (x) form.append(k, x);
    }
    // Canlı sitede (Vercel) dosyalar önce doğrudan depoya yüklenir, forma yalnızca adresleri eklenir.
    const bilgi = dosyalar.length ? await yuklemeBilgisi() : { bulut: false };
    if (bilgi.bulut && bilgi.erisim) {
      const liste: { anahtar: string; ad: string }[] = [];
      for (const [i, f] of dosyalar.entries()) {
        let anahtar = yuklenmis.current.get(f);
        if (!anahtar) {
          klasor.current ||= rastgeleKimlik();
          anahtar = `yuklemeler/gelen/${klasor.current}/${++sayac.current}-${guvenliAd(f.name, 110)}`;
          setIlerleme(`Dosya yükleniyor (${i + 1}/${dosyalar.length})…`);
          try {
            await bulutaYukle(anahtar, f, bilgi.erisim, (y) => setIlerleme(`Dosya yükleniyor (${i + 1}/${dosyalar.length}) · %${Math.round(y)}`));
          } catch {
            setIlerleme("");
            setBekle(false);
            return setHatalar([`${f.name} yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.`]);
          }
          yuklenmis.current.set(f, anahtar);
        }
        liste.push({ anahtar, ad: f.name });
      }
      form.append("yuklenen", JSON.stringify(liste));
      setIlerleme("");
    } else dosyalar.forEach((f) => form.append("dosya", f));
    const r = await fetch("/api/teklif", { method: "POST", body: form }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { no?: number; hatalar?: string[] } | null;
    setBekle(false);
    if (r?.ok && d?.no) {
      setTamam({ no: d.no });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setHatalar(d?.hatalar ?? ["Bağlantı sorunu oluştu, tekrar deneyin."]);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, maxWidth: 760 }}>
        <h1 style={{ fontSize: "clamp(28px, 3vw, 42px)" }}>Aklınızdakini biz üretelim</h1>
        <p style={{ fontSize: 18, color: "#3F4542" }}>Çiziminizi, logonuzu ya da bir fotoğrafı yükleyin, birkaç bilgi verin. 1 iş günü içinde fiyat ve teslim tarihiyle dönüyoruz; teklif ücretsizdir ve sizi bağlamaz.</p>
        <div className="tabsel" role="tablist" aria-label="Talep türü" style={{ alignSelf: "flex-start" }}>
          <button type="button" className={!kur ? "on" : ""} role="tab" aria-selected={!kur} onClick={() => setTur("bireysel")}>Bireysel</button>
          <button type="button" className={kur ? "on" : ""} role="tab" aria-selected={kur} onClick={() => { setTur("kurumsal"); if (v.adet === "1") setV({ ...v, adet: "50" }); }}>Kurumsal / toplu</button>
        </div>
      </div>
      <div className="split" style={{ gap: 32 }}>
        <form className="cmain" onSubmit={gonder} noValidate>
          <div className="card">
            <h2 style={{ fontSize: 20 }}>1. Dosyalarınız</h2>
            <div
              className={`dz ${surukle ? "on" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setSurukle(true); }}
              onDragLeave={() => setSurukle(false)}
              onDrop={(e) => { e.preventDefault(); setSurukle(false); ekle(e.dataTransfer.files); }}
            >
              <YukleIkon />
              <p style={{ fontWeight: 700, fontSize: 17 }}>Dosyaları buraya sürükleyin</p>
              <p className="sm mut">SVG, DXF, AI, PDF, PNG, JPG · dosya başına en fazla 50 MB</p>
              <input ref={girdi} type="file" multiple hidden accept=".svg,.dxf,.ai,.pdf,.png,.jpg,.jpeg,.eps,.cdr,.webp,.heic,.xlsx,.xls,.csv" onChange={(e) => { ekle(e.target.files); e.target.value = ""; }} />
              <button type="button" className="btn s dk" onClick={() => girdi.current?.click()}>Bilgisayardan / telefondan seç</button>
            </div>
            {dosyalar.map((f, i) => (
              <div className="fl" key={`${f.name}-${i}`}>
                <span className="fx">{f.name.split(".").pop()?.toUpperCase().slice(0, 4)}</span>
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p><p className="xs mut">{boyut(f.size)}</p></div>
                <button type="button" className="btn s gh" style={{ color: "#B91C1C" }} onClick={() => setDosyalar((d) => d.filter((_, j) => j !== i))} aria-label={`${f.name} kaldır`}>Kaldır</button>
              </div>
            ))}
            <p className="xs mut">Dosyanız yok mu? Sorun değil, fikrinizi aşağıda anlatın; çizimi biz yapalım.</p>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 20 }}>2. Ne yaptırmak istiyorsunuz?</h2>
            <div>
              <label className="lbl" htmlFor="t-a">Açıklama</label>
              <textarea id="t-a" className={`inp ${g("aciklama") ? "bad" : ""}`} value={v.aciklama} onChange={set("aciklama")} placeholder={kur ? "Örn. Otelimizin 120 odası için siyah pleksi kapı numarası, kurumsal fontumuzla." : "Örn. Kafemizin logosunu duvara asmak için pleksiden kestirmek istiyorum."} />
              {g("aciklama") && <p className="err">Kısaca ne istediğinizi yazın.</p>}
            </div>
            <div className="fg2">
              <div><label className="lbl" htmlFor="t-m">Malzeme</label><select id="t-m" className="inp" value={v.malzeme} onChange={set("malzeme")}>{["Emin değilim, önerin", "Ahşap (kayın kontrplak)", "MDF", "Şeffaf pleksi", "Renkli pleksi", "Ayna pleksi", "Bambu"].map((m) => <option key={m}>{m}</option>)}</select></div>
              <div><label className="lbl" htmlFor="t-e">Yaklaşık ölçü (cm)</label><input id="t-e" className="inp" placeholder="Örn. 50 × 50" value={v.olcu} onChange={set("olcu")} /></div>
              <div><label className="lbl" htmlFor="t-ad">Adet</label><input id="t-ad" className="inp" inputMode="numeric" value={v.adet} onChange={(e) => setV({ ...v, adet: e.target.value.replace(/\D/g, "") })} /></div>
              <div><label className="lbl" htmlFor="t-t">İstediğiniz tarih</label><input id="t-t" className="inp" type="date" value={v.istenenTarih} onChange={set("istenenTarih")} /><p className="hint">İsteğe bağlı</p></div>
            </div>
          </div>

          {kur && (
            <div className="card">
              <h2 style={{ fontSize: 20 }}>Firma bilgileri</h2>
              <div className="fg2">
                <div><label className="lbl" htmlFor="t-f">Firma adı</label><input id="t-f" className={`inp ${g("firma") ? "bad" : ""}`} value={v.firma} onChange={set("firma")} />{g("firma") && <p className="err">Firma adı gerekli.</p>}</div>
                <div><label className="lbl" htmlFor="t-s">Sektör</label><select id="t-s" className="inp" value={v.sektor} onChange={set("sektor")}>{["Otel ve turizm", "Mimarlık ve iç mimarlık", "Restoran ve kafe", "Ofis ve kurumsal", "Eğitim", "Etkinlik ve organizasyon", "Diğer"].map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label className="lbl" htmlFor="t-v">Vergi numarası</label><input id="t-v" className="inp" inputMode="numeric" value={v.vergiNo} onChange={set("vergiNo")} /><p className="hint">Faturalı teklif için, isteğe bağlı</p></div>
                <div><label className="lbl" htmlFor="t-b">Yaklaşık bütçe</label><select id="t-b" className="inp" value={v.butce} onChange={set("butce")}>{["Belirtmek istemiyorum", "5.000 ₺ altı", "5.000 – 20.000 ₺", "20.000 – 50.000 ₺", "50.000 ₺ üzeri"].map((b) => <option key={b}>{b}</option>)}</select></div>
              </div>
              <label className="ck"><input type="checkbox" checked={v.numune} onChange={() => setV({ ...v, numune: !v.numune })} /> Seri üretimden önce numune istiyorum</label>
            </div>
          )}

          <div className="card">
            <h2 style={{ fontSize: 20 }}>3. Size nasıl ulaşalım?</h2>
            <div className="fg2">
              <div><label className="lbl" htmlFor="t-n">Ad soyad</label><input id="t-n" className={`inp ${g("ad") ? "bad" : ""}`} autoComplete="name" value={v.ad} onChange={set("ad")} />{g("ad") && <p className="err">Adınızı yazın.</p>}</div>
              <div><label className="lbl" htmlFor="t-p">Telefon</label><input id="t-p" className="inp" type="tel" autoComplete="tel" value={v.telefon} onChange={set("telefon")} placeholder="05__ ___ __ __" /></div>
              <div className="span2"><label className="lbl" htmlFor="t-ep">E-posta</label><input id="t-ep" className={`inp ${g("eposta") ? "bad" : ""}`} type="email" autoComplete="email" value={v.eposta} onChange={set("eposta")} />{g("eposta") && <p className="err">Teklifi gönderebilmemiz için geçerli bir e-posta yazın.</p>}</div>
            </div>
            <div>
              <span className="lbl">Teklifi nasıl almak istersiniz?</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {KANAL.map(([k, ad]) => (
                  <button type="button" key={k} className={`chip ${v.kanal === k ? "on" : ""}`} aria-pressed={v.kanal === k} onClick={() => setV({ ...v, kanal: k })}>{ad}</button>
                ))}
              </div>
            </div>
            <label className="ck">
              <input type="checkbox" checked={v.kvkk} onChange={() => setV({ ...v, kvkk: !v.kvkk })} />
              <span>Bilgilerimin teklif hazırlamak için işlenmesine dair <Link href="/bilgi/kvkk" target="_blank">KVKK Aydınlatma Metni</Link>’ni okudum.</span>
            </label>
            {g("kvkk") && <p className="err" role="alert">Devam etmek için onay kutusunu işaretleyin.</p>}
            {hatalar.length > 0 && <div className="hata-kutu" role="alert"><ul style={{ margin: 0 }}>{hatalar.map((h) => <li key={h}>{h}</li>)}</ul></div>}
            <button className="btn pri" style={{ minHeight: 58, fontSize: 17, alignSelf: "flex-start" }} disabled={bekle}>{bekle ? ilerleme || "Gönderiliyor…" : "Teklif iste"}</button>
            {denendi && Object.values(err).some(Boolean) && <p className="err">Eksik alanlar kırmızıyla işaretlendi.</p>}
          </div>
        </form>
        <aside className="cside" aria-label="Bilgi">
          <div className="card">
            <h2 style={{ fontSize: 19 }}>Nasıl işliyor?</h2>
            <ol className="st3">
              <li><span className="n">1</span><div><p style={{ fontWeight: 700 }}>Talebinizi gönderin</p><p className="sm mut">Dosya, ölçü ve adet bilgisini paylaşın.</p></div></li>
              <li><span className="n">2</span><div><p style={{ fontWeight: 700 }}>1 iş gününde teklif</p><p className="sm mut">Fiyat, malzeme önerisi ve teslim tarihi.</p></div></li>
              <li><span className="n">3</span><div><p style={{ fontWeight: 700 }}>Onaylayın, üretelim</p><p className="sm mut">Ödeme bağlantısıyla ödeyin; tasarım onayınızdan sonra üretime başlarız.</p></div></li>
            </ol>
          </div>
          {kur && (
            <div className="card" style={{ background: "#1C1F1E", borderColor: "#1C1F1E", color: "#fff" }}>
              <h2 style={{ fontSize: 19, color: "#fff" }}>Firmalar için</h2>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, color: "#D7DCD8" }}>
                <li>Kurumsal fatura</li><li>Adet arttıkça indirim</li><li>Seri üretim öncesi numune</li><li>Teslimatı parça parça planlama</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
