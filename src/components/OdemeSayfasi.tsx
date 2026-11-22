"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sepetToplami, type KuponBilgisi } from "@/lib/fiyat";
import { para } from "@/lib/bicim";
import type { MagazaAyarlari } from "@/lib/tipler";
import { useSepet } from "./Saglayicilar";
import { KUPON_ANAHTARI, kuponOku } from "./SepetSayfasi";
import { TikIkon } from "./Ikonlar";

type Ayar = Pick<MagazaAyarlari, "kargoUcreti" | "ucretsizKargoLimiti" | "hediyePaketiUcreti" | "taksit6VadeYuzde">;
const ILLER = ["Adana", "Ankara", "Antalya", "Bursa", "Diyarbakır", "Eskişehir", "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin", "Samsun", "Trabzon", "Diğer"];
const BOS = { ad: "", telefon: "", eposta: "", il: "İstanbul", ilce: "", adres: "", ayniAdres: true, kurumsal: false, unvan: "", vergiDairesi: "", vergiNo: "", hediye: false, hediyeNotu: "" };

export function OdemeSayfasi({ ayarlar, testModu, kartAcik, havaleAcik }: { ayarlar: Ayar; testModu: boolean; kartAcik: boolean; havaleAcik: boolean }) {
  const sepet = useSepet();
  const router = useRouter();
  const [adim, setAdim] = useState<"teslimat" | "odeme">("teslimat");
  const [f, setF] = useState(BOS);
  const [denendi, setDenendi] = useState(false);
  const [odeme, setOdeme] = useState<"kart" | "havale">(kartAcik || !havaleAcik ? "kart" : "havale");
  const [taksit, setTaksit] = useState<1 | 3 | 6>(1);
  const [sozlesme, setSozlesme] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hatalar, setHatalar] = useState<string[]>([]);
  const [kupon, setKupon] = useState<KuponBilgisi | null>(null);
  useEffect(() => setKupon(kuponOku()), []);

  const t = sepetToplami({ araToplam: sepet.araToplam, ayarlar, kupon, hediye: f.hediye, taksit: odeme === "kart" ? taksit : 1 });
  const kisiselVar = sepet.kalemler.some((k) => k.kisisel);
  const set = (k: keyof typeof BOS) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const err = {
    ad: f.ad.trim().length < 2,
    telefon: f.telefon.replace(/\D/g, "").length < 10,
    eposta: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.eposta.trim()),
    adres: f.adres.trim().length < 8,
    kurumsal: f.kurumsal && (!f.unvan.trim() || !f.vergiNo.trim()),
  };
  const g = (k: keyof typeof err) => denendi && err[k];

  if (sepet.hazir && sepet.kalemler.length === 0 && !gonderiliyor)
    return (
      <div className="card" style={{ maxWidth: 560, margin: "40px auto", alignItems: "center", textAlign: "center" }}>
        <h1 style={{ fontSize: 26 }}>Sepetiniz boş</h1>
        <Link className="btn pri" href="/urunler">Ürünlere göz atın</Link>
      </div>
    );

  const devam = () => {
    if (Object.values(err).some(Boolean)) {
      setDenendi(true);
      return;
    }
    setAdim("odeme");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const gonder = async () => {
    if (!sozlesme) {
      setHatalar(["Devam etmek için sözleşmeyi onaylayın."]);
      return;
    }
    setGonderiliyor(true);
    setHatalar([]);
    const govde = {
      kalemler: sepet.kalemler.map((k) => (k.tur === "urun" ? { tur: "urun", urunId: k.urunId, secim: k.secim, kisi: k.kisi, adet: k.adet } : { tur: "studyo", studyo: k.studyo, adet: k.adet })),
      musteri: { ad: f.ad, telefon: f.telefon, eposta: f.eposta },
      adres: { il: f.il, ilce: f.ilce, adres: f.adres },
      fatura: { kurumsal: f.kurumsal, unvan: f.unvan || undefined, vergiDairesi: f.vergiDairesi || undefined, vergiNo: f.vergiNo || undefined, ayniAdres: f.ayniAdres },
      hediye: f.hediye,
      hediyeNotu: f.hediyeNotu || undefined,
      kuponKodu: kupon?.kod,
      odemeYontemi: odeme,
      taksit: odeme === "kart" ? taksit : 1,
      sozlesme: true,
    };
    const r = await fetch("/api/siparis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { no?: number; token?: string; hatalar?: string[] } | null;
    if (r?.ok && d?.no && d.token) {
      sepet.temizle();
      try {
        sessionStorage.removeItem(KUPON_ANAHTARI);
      } catch {}
      router.push(`/siparis/${d.no}?t=${encodeURIComponent(d.token)}&yeni=1`);
      return;
    }
    setGonderiliyor(false);
    setHatalar(d?.hatalar ?? ["Bağlantı sorunu oluştu. Lütfen tekrar deneyin."]);
  };

  const adimlar = [
    { ad: "Sepet", durum: "ok" },
    { ad: "Teslimat", durum: adim === "teslimat" ? "on" : "ok" },
    { ad: "Ödeme", durum: adim === "odeme" ? "on" : "" },
    { ad: "Onay", durum: "" },
  ];

  return (
    <>
      <ol className="steps" aria-label="Sipariş adımları" style={{ marginBottom: 24 }}>
        {adimlar.map((a, i) => (
          <li key={a.ad} className={a.durum} aria-current={a.durum === "on" ? "step" : undefined} style={{ gap: 8 }}>
            {i > 0 && <span className="ln" aria-hidden="true" />}
            <span className="n">{a.durum === "ok" ? "✓" : i + 1}</span>
            {a.ad}
          </li>
        ))}
      </ol>
      <div className="split" style={{ gap: 28 }}>
        <section className="cmain">
          {adim === "teslimat" ? (
            <>
              <h1 style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>Teslimat bilgileri</h1>
              <div className="card" style={{ background: "#FAF9F7" }}>
                <p className="sm"><b>Üye olmadan devam edebilirsiniz.</b> Sipariş takibi için e-posta adresiniz yeterli.</p>
              </div>
              <div className="card">
                <h2 style={{ fontSize: 19 }}>İletişim</h2>
                <div className="fg2">
                  <div><label className="lbl" htmlFor="f-ad">Ad soyad</label><input id="f-ad" className={`inp ${g("ad") ? "bad" : ""}`} autoComplete="name" value={f.ad} onChange={set("ad")} />{g("ad") && <p className="err">Ad soyad gerekli.</p>}</div>
                  <div><label className="lbl" htmlFor="f-tel">Cep telefonu</label><input id="f-tel" className={`inp ${g("telefon") ? "bad" : ""}`} type="tel" autoComplete="tel" placeholder="05__ ___ __ __" value={f.telefon} onChange={set("telefon")} />{g("telefon") && <p className="err">Kargo için telefon gerekli.</p>}</div>
                  <div className="span2"><label className="lbl" htmlFor="f-ep">E-posta</label><input id="f-ep" className={`inp ${g("eposta") ? "bad" : ""}`} type="email" autoComplete="email" value={f.eposta} onChange={set("eposta")} /><p className="hint">Tasarım onayı ve kargo bilgisi bu adrese gelir.</p>{g("eposta") && <p className="err">Geçerli bir e-posta yazın.</p>}</div>
                </div>
                <h2 style={{ fontSize: 19, marginTop: 8 }}>Teslimat adresi</h2>
                <div className="fg2">
                  <div><label className="lbl" htmlFor="f-il">İl</label><select id="f-il" className="inp" value={f.il} onChange={set("il")}>{ILLER.map((i) => <option key={i}>{i}</option>)}</select></div>
                  <div><label className="lbl" htmlFor="f-ilce">İlçe</label><input id="f-ilce" className="inp" value={f.ilce} onChange={set("ilce")} /></div>
                  <div className="span2"><label className="lbl" htmlFor="f-adr">Açık adres</label><textarea id="f-adr" className={`inp ${g("adres") ? "bad" : ""}`} style={{ minHeight: 88 }} autoComplete="street-address" value={f.adres} onChange={set("adres")} placeholder="Mahalle, sokak, bina ve daire no" />{g("adres") && <p className="err">Açık adres gerekli.</p>}</div>
                </div>
                <label className="ck"><input type="checkbox" checked={f.ayniAdres} onChange={() => setF({ ...f, ayniAdres: !f.ayniAdres })} /> Fatura adresim teslimat adresiyle aynı</label>
                <label className="ck" style={{ paddingTop: 0 }}><input type="checkbox" checked={f.kurumsal} onChange={() => setF({ ...f, kurumsal: !f.kurumsal })} /> Kurumsal fatura istiyorum</label>
                {f.kurumsal && (
                  <div className="fg2">
                    <div><label className="lbl" htmlFor="f-un">Firma unvanı</label><input id="f-un" className={`inp ${g("kurumsal") && !f.unvan ? "bad" : ""}`} value={f.unvan} onChange={set("unvan")} /></div>
                    <div><label className="lbl" htmlFor="f-vd">Vergi dairesi</label><input id="f-vd" className="inp" value={f.vergiDairesi} onChange={set("vergiDairesi")} /></div>
                    <div><label className="lbl" htmlFor="f-vn">Vergi numarası</label><input id="f-vn" className={`inp ${g("kurumsal") && !f.vergiNo ? "bad" : ""}`} inputMode="numeric" value={f.vergiNo} onChange={set("vergiNo")} /></div>
                    {g("kurumsal") && <p className="err span2">Unvan ve vergi numarası gerekli.</p>}
                  </div>
                )}
              </div>
              <div className="card">
                <label className="ck" style={{ paddingTop: 0 }}>
                  <input type="checkbox" checked={f.hediye} onChange={() => setF({ ...f, hediye: !f.hediye })} />
                  <span><b>Hediye paketi</b> (+{para(ayarlar.hediyePaketiUcreti)})<span className="sm mut" style={{ display: "block" }}>Fiyat etiketi çıkarılır, notunuz karta yazılır.</span></span>
                </label>
                {f.hediye && <div><label className="lbl" htmlFor="f-hn">Hediye notu</label><textarea id="f-hn" className="inp" style={{ minHeight: 80 }} maxLength={200} value={f.hediyeNotu} onChange={set("hediyeNotu")} placeholder="İyi ki varsın!" /></div>}
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>Ödeme</h1>
              {testModu && <div className="uyari" role="note"><b>Test modu:</b> Ödeme altyapısı henüz bağlanmadı. Kart bilgisi gönderilmez, gerçek ödeme alınmaz.</div>}
              <div className="card">
                {kartAcik && (
                  <>
                <label className={`pm ${odeme === "kart" ? "on" : ""}`}>
                  <input type="radio" name="od" checked={odeme === "kart"} onChange={() => setOdeme("kart")} />
                  <span style={{ flex: 1 }}><b style={{ display: "block" }}>Kredi / banka kartı</b><span className="sm mut">3D Secure ile · taksit seçenekli</span></span>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span className="payb" style={{ border: "1px solid #E7E4DE" }}>VISA</span><span className="payb" style={{ border: "1px solid #E7E4DE" }}>Mastercard</span><span className="payb" style={{ border: "1px solid #E7E4DE" }}>troy</span></span>
                </label>
                {odeme === "kart" && (
                  <>
                    <p className="sm mut">Kart bilgilerinizi bir sonraki adımda bankanızın güvenli ödeme sayfasına girersiniz; Lavinia House kart bilgisi görmez ve saklamaz.</p>
                    <div><span className="lbl">Taksit</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {([1, 3, 6] as const).map((n) => {
                          const tt = sepetToplami({ araToplam: sepet.araToplam, ayarlar, kupon, hediye: f.hediye, taksit: n });
                          return (
                            <label key={n} className={`pm ${taksit === n ? "on" : ""}`} style={{ padding: "12px 16px", alignItems: "center" }}>
                              <input type="radio" name="tk" checked={taksit === n} onChange={() => setTaksit(n)} style={{ margin: 0 }} />
                              <span style={{ flex: 1, fontWeight: 600 }}>{n === 1 ? "Tek çekim" : n === 3 ? "3 taksit · vade farksız" : `6 taksit · %${ayarlar.taksit6VadeYuzde} vade farkı`}</span>
                              <span className="num" style={{ fontWeight: 700 }}>{n === 1 ? para(tt.toplam) : `${n} × ${para(Math.ceil(tt.toplam / n))}`}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                  </>
                )}
                {!kartAcik && <p className="sm mut">Kartla ödeme çok yakında. Şimdilik havale / EFT ile ödeyebilirsiniz.</p>}
                {havaleAcik && (
                <label className={`pm ${odeme === "havale" ? "on" : ""}`}>
                  <input type="radio" name="od" checked={odeme === "havale"} onChange={() => { setOdeme("havale"); setTaksit(1); }} />
                  <span><b style={{ display: "block" }}>Havale / EFT</b><span className="sm mut">IBAN bilgisi sipariş sonrası gösterilir. Ödeme gelince üretime başlarız.</span></span>
                </label>
                )}
                {!kartAcik && !havaleAcik && <p className="err">Şu an online sipariş alamıyoruz. Sipariş için lütfen WhatsApp’tan bize yazın.</p>}
              </div>
              <div className="card">
                <label className="ck" style={{ paddingTop: 0 }}>
                  <input type="checkbox" checked={sozlesme} onChange={() => { setSozlesme(!sozlesme); setHatalar([]); }} />
                  <span><Link href="/bilgi/on-bilgilendirme-formu" target="_blank">Ön Bilgilendirme Formu</Link>’nu ve <Link href="/bilgi/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi</Link>’ni okudum, onaylıyorum.</span>
                </label>
                {kisiselVar && <p className="xs mut">Kişiye özel üretilen ürünlerde cayma hakkı bulunmaz; üretim hatasında ücretsiz yenileriz.</p>}
              </div>
            </>
          )}
          {hatalar.length > 0 && (
            <div className="hata-kutu" role="alert">
              <b>Siparişi tamamlayamadık:</b>
              <ul>{hatalar.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
          {adim === "odeme" && <button className="btn s gh" style={{ alignSelf: "flex-start" }} onClick={() => setAdim("teslimat")}>← Teslimat bilgilerine dön</button>}
          {adim === "teslimat" && <Link className="btn s gh" style={{ alignSelf: "flex-start" }} href="/sepet">← Sepete dön</Link>}
        </section>
        <aside className="cside" aria-label="Sipariş özeti">
          <div className="card">
            <h2 style={{ fontSize: 20 }}>Sipariş özeti</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sepet.kalemler.map((k) => (
                <div className="sl sm" key={k.anahtar} style={{ padding: "2px 0" }}><span>{k.adet} × {k.ad}</span><span className="num">{para(k.birimFiyat * k.adet)}</span></div>
              ))}
            </div>
            <div>
              <div className="sl"><span className="mut">Ara toplam</span><span className="num">{para(t.araToplam)}</span></div>
              <div className="sl"><span className="mut">Kargo</span><span className={`num ${t.kargo ? "" : "ok"}`}>{t.kargo ? para(t.kargo) : "Ücretsiz"}</span></div>
              {t.indirim > 0 && <div className="sl"><span className="mut">Kupon ({kupon?.kod})</span><span className="num ok">−{para(t.indirim)}</span></div>}
              {t.hediyeUcreti > 0 && <div className="sl"><span className="mut">Hediye paketi</span><span className="num">{para(t.hediyeUcreti)}</span></div>}
              {t.vadeFarki > 0 && <div className="sl"><span className="mut">Vade farkı</span><span className="num">{para(t.vadeFarki)}</span></div>}
              <div className="sl" style={{ borderTop: "1px solid #E7E4DE", marginTop: 6, paddingTop: 14, fontSize: 19, fontWeight: 800 }}><span>Toplam</span><span className="num">{para(t.toplam)}</span></div>
              <p className="xs mut">KDV dahil</p>
            </div>
            {adim === "teslimat" ? (
              <button className="btn pri wide" style={{ minHeight: 58, fontSize: 17 }} onClick={devam}>Ödemeye geç</button>
            ) : (
              <button className="btn pri wide" style={{ minHeight: 58, fontSize: 17 }} onClick={gonder} disabled={gonderiliyor}>
                {gonderiliyor ? "Siparişiniz alınıyor…" : odeme === "kart" ? `${para(t.toplam)} öde` : "Siparişi tamamla"}
              </button>
            )}
            <div className="sm mut" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><TikIkon boyut={18} />256-bit SSL ve 3D Secure</span>
              {kisiselVar && <span style={{ display: "flex", gap: 8, alignItems: "center" }}><TikIkon boyut={18} />Tasarım onayınız olmadan üretime başlanmaz</span>}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
