import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { siparisKalemleri, siparisler, siparisOlaylari, urunler } from "@/db/schema";
import { para, tarihSaat } from "@/lib/bicim";
import { musteriDosyasi } from "@/lib/medya";
import type { KisiAlan } from "@/lib/tipler";
import { yoneticiGerekli } from "@/lib/yetki";
import { magazaAyarlari } from "@/lib/veri";
import { whatsappLinki } from "@/components/AltBilgi";
import { LevhaOnizleme, boyutBul, zeminBul } from "@/components/Onizleme";
import { Mesaj } from "../../Mesaj";
import { DURUM_AD, sonrakiAdim } from "../durumlar";
import { TasarimYukle } from "../TasarimYukle";
import { iadeEt, icNotKaydet, iptalEt, kargoyaVer, odemeOnayla, tasarimGonder, teslimEdildi, uretimeAl } from "../eylemler";

type Props = { params: Promise<{ no: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Sipariş #${(await params).no}` };
}

const KARGO = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "Hepsijet", "Trendyol Express", "Kolay Gelsin"];
const BASARI = {
  odeme: "Ödeme onaylandı, müşteriye e-posta gönderildi.",
  tasarim: "Tasarım müşterinin onayına gönderildi.",
  uretim: "Sipariş üretime alındı.",
  kargo: "Kargo bilgisi kaydedildi ve müşteriye gönderildi.",
  teslim: "Teslim edildi olarak işaretlendi. Müşteriye değerlendirme bağlantısı gönderildi.",
  iptal: "Sipariş iptal edildi. Hazır stoklu ürünlerin adedi geri eklendi.",
  iade: "İade olarak işaretlendi.",
  not: "Not kaydedildi.",
};
const HATA = {
  durum: "Bu işlem siparişin şu anki durumunda yapılamaz. Sayfayı yenileyin.",
  kargo: "Kargo firması ve takip numarasını yazın.",
  gorsel: "Tasarım görseli geçersiz, yeniden yükleyin.",
};

export default async function SiparisDetay({ params, searchParams }: Props) {
  await yoneticiGerekli();
  const no = Number((await params).no);
  const sp = await searchParams;
  const d = await db();
  const [s] = Number.isInteger(no) ? await d.select().from(siparisler).where(eq(siparisler.no, no)) : [];
  if (!s) notFound();
  const [kalemler, olaylar, ayar] = await Promise.all([
    d.select().from(siparisKalemleri).where(eq(siparisKalemleri.siparisId, s.id)),
    d.select().from(siparisOlaylari).where(eq(siparisOlaylari.siparisId, s.id)).orderBy(asc(siparisOlaylari.olusturma)),
    magazaAyarlari(),
  ]);
  const urunIdleri = kalemler.map((k) => k.urunId).filter((x): x is number => !!x);
  const urunBilgi = urunIdleri.length ? await d.select({ id: urunler.id, slug: urunler.slug, kisisellestirme: urunler.kisisellestirme }).from(urunler).where(inArray(urunler.id, urunIdleri)) : [];
  const alanlar = new Map<number, KisiAlan[]>(urunBilgi.map((u) => [u.id, u.kisisellestirme]));
  const dosyalar = new Map<string, string | null>();
  for (const k of kalemler)
    for (const a of alanlar.get(k.urunId ?? 0) ?? []) if (a.tip === "dosya" && k.kisi[a.id]) dosyalar.set(`${k.id}-${a.id}`, await musteriDosyasi(k.kisi[a.id]));

  const kisisel = kalemler.some((k) => k.kisisel);
  const [durumAd, durumSinif] = DURUM_AD[s.durum];
  const [adim] = sonrakiAdim(s.durum, s.onayDurumu, kisisel);
  const adimlar = ["Sipariş alındı", ...(kisisel ? ["Tasarım onayı"] : []), "Üretim", "Kargo", "Teslim"];
  const sira: Record<string, number> = kisisel ? { odeme: 0, yeni: 1, onay: 1, uretim: 2, kargo: 3, teslim: 5 } : { odeme: 0, yeni: 1, onay: 1, uretim: 1, kargo: 2, teslim: 4 };
  const simdi = sira[s.durum] ?? 0;
  const kapali = ["teslim", "iptal", "iade"].includes(s.durum);
  const onayKalemi = kalemler.find((k) => k.kisisel && k.tur === "urun");
  const tasarimGonderilebilir = kisisel && ["yeni", "onay"].includes(s.durum);
  const NoGizli = () => <input type="hidden" name="no" value={s.no} />;

  return (
    <>
      <div className="y-top">
        <div>
          <Link className="y-back" href="/yonetim/siparisler">← Siparişler</Link>
          <h1 style={{ marginTop: 6 }}>Sipariş #{s.no} <span className={`y-b ${durumSinif}`} style={{ verticalAlign: "middle", fontSize: 14 }}>{durumAd}</span></h1>
          <p className="y-sub">{tarihSaat(s.olusturma)} · {s.odemeYontemi === "kart" ? `Kart${s.taksit > 1 ? `, ${s.taksit} taksit` : ""}` : "Havale / EFT"} · {kisisel ? "Kişiye özel ürün var" : "Hazır ürünler"}</p>
        </div>
        <Link className="y-btn" href={`/siparis/${s.no}?t=${s.token}`} target="_blank">Müşterinin gördüğü sayfa ↗</Link>
      </div>
      <Mesaj sp={sp} basari={BASARI} hata={HATA} />

      {!["iptal", "iade"].includes(s.durum) && (
        <ol className="y-adim" aria-label="Sipariş durumu">
          {adimlar.map((a, i) => (
            <li key={a} className={i < simdi ? "y-tamam" : i === simdi ? "y-simdi" : ""} aria-current={i === simdi ? "step" : undefined}>
              <span className="y-n">{i < simdi ? "✓" : i + 1}</span>{a}
            </li>
          ))}
        </ol>
      )}

      {!kapali && (
        <section className="y-card" aria-labelledby="h-adim" style={{ borderColor: "#4A2E85", borderWidth: 2 }}>
          <h2 id="h-adim">Sıradaki adım: {adim}</h2>
          {s.durum === "odeme" && (
            <>
              <p className="y-sm">Banka hesabınıza <b>{para(s.toplam)}</b> tutarında, açıklamasında <b>{s.no}</b> yazan bir havale geldiyse onaylayın.</p>
              <form action={odemeOnayla}><NoGizli /><button className="y-btn y-pri">Ödeme geldi, onayla</button></form>
            </>
          )}
          {s.onayDurumu === "duzeltme" && s.onayNotu && (
            <p className="y-note"><b>Müşterinin düzeltme notu:</b> “{s.onayNotu}”</p>
          )}
          {s.durum === "onay" && s.onayDurumu === "bekliyor" && <p className="y-sm">Tasarım (sürüm {s.tasarimSurumu}) müşteriye gönderildi. Müşteri onaylayınca sipariş otomatik olarak üretime geçer.</p>}
          {tasarimGonderilebilir && s.onayDurumu !== "onaylandi" && s.onayDurumu !== "bekliyor" && (
            <form action={tasarimGonder} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <NoGizli />
              <TasarimYukle mevcut={s.tasarimGorseli} />
              <div>
                <label className="y-lbl" htmlFor="t-not">Müşteriye not (isteğe bağlı)</label>
                <input id="t-not" className="y-inp" name="not" placeholder="ör. Yazıyı biraz büyüttük, alt satırı ortaladık." />
              </div>
              <div className="y-row">
                <button className="y-btn y-pri">{s.onayDurumu === "duzeltme" ? "Düzeltilmiş tasarımı gönder" : "Tasarım onayına gönder"}</button>
              </div>
            </form>
          )}
          {tasarimGonderilebilir && s.onayDurumu === "bekliyor" && (
            <details className="y-ac">
              <summary>Tasarımı değiştirip yeniden gönder</summary>
              <div>
                <form action={tasarimGonder} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <NoGizli />
              <TasarimYukle mevcut={s.tasarimGorseli} />
              <div>
                <label className="y-lbl" htmlFor="t-not">Müşteriye not (isteğe bağlı)</label>
                <input id="t-not" className="y-inp" name="not" placeholder="ör. Yazıyı biraz büyüttük, alt satırı ortaladık." />
              </div>
              <div className="y-row">
                <button className="y-btn y-pri">Tasarımı yeniden gönder</button>
              </div>
            </form>
              </div>
            </details>
          )}
          {(s.durum === "yeni" || s.durum === "onay") && (
            <form action={uretimeAl}>
              <NoGizli />
              <button className={`y-btn ${!kisisel || s.onayDurumu === "onaylandi" ? "y-pri" : "y-gh"}`}>{!kisisel || s.onayDurumu === "onaylandi" ? "Üretime al" : "Onay beklemeden üretime al"}</button>
            </form>
          )}
          {(s.durum === "uretim" || s.durum === "kargo" || (s.durum === "yeni" && !kisisel)) && (
            <form action={kargoyaVer} className="y-row" style={{ alignItems: "flex-end" }}>
              <NoGizli />
              <div style={{ flex: "1 1 180px" }}>
                <label className="y-lbl" htmlFor="k-f">Kargo firması</label>
                <select id="k-f" className="y-inp" name="firma" defaultValue={s.kargoFirmasi ?? KARGO[0]}>{KARGO.map((k) => <option key={k}>{k}</option>)}</select>
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label className="y-lbl" htmlFor="k-t">Takip numarası</label>
                <input id="k-t" className="y-inp" name="takipNo" defaultValue={s.takipNo ?? ""} required />
              </div>
              <button className={`y-btn ${s.durum === "kargo" ? "" : "y-pri"}`}>{s.durum === "kargo" ? "Kargo bilgisini güncelle" : "Kargoya ver ve müşteriye bildir"}</button>
            </form>
          )}
          {s.durum === "kargo" && (
            <form action={teslimEdildi}><NoGizli /><button className="y-btn y-pri">Teslim edildi olarak işaretle</button></form>
          )}
        </section>
      )}

      <div className="y-split">
        <div className="y-wide">
          <section className="y-card" aria-labelledby="h-urun">
            <h2 id="h-urun">Ürünler</h2>
            <ul className="y-list">
              {kalemler.map((k) => {
                const kAlanlar = alanlar.get(k.urunId ?? 0) ?? [];
                return (
                  <li key={k.id} style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      <b>{k.adet} × {k.ad}</b>
                      {Object.entries(k.secim).length > 0 && <span className="y-sm">{Object.entries(k.secim).map(([a, v]) => `${a}: ${v}`).join(" · ")}</span>}
                      {k.studyo && <span className="y-sm">{k.ozet}</span>}
                      {kAlanlar.filter((a) => k.kisi[a.id]).map((a) => (
                        <span key={a.id} className="y-sm">
                          <span className="y-mut">{a.baslik}:</span>{" "}
                          {a.tip === "dosya" ? (
                            dosyalar.get(`${k.id}-${a.id}`) ? <a href={`/yonetim/dosya?yol=${encodeURIComponent(dosyalar.get(`${k.id}-${a.id}`)!)}`}>{k.kisi[a.id].split("|")[1] ?? "Dosyayı indir"} ↓</a> : "Dosya bulunamadı"
                          ) : (
                            <b style={a.tip === "font" ? { fontFamily: `'${k.kisi[a.id]}'`, fontWeight: 400, fontSize: 16 } : undefined}>“{k.kisi[a.id]}”</b>
                          )}
                        </span>
                      ))}
                      {k.kisisel && (
                        <span><a className="y-btn y-s" href={`/yonetim/svg?no=${s.no}&kalem=${k.id}`}>SVG indir (LightBurn / RDWorks)</a></span>
                      )}
                    </div>
                    <span className="y-num y-r" style={{ marginLeft: "auto" }}>
                      <b>{para(k.birimFiyat * k.adet)}</b>
                      {k.adet > 1 && <span className="y-sm y-mut" style={{ display: "block" }}>{para(k.birimFiyat)} / adet</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {onayKalemi && s.onayDurumu !== "yok" && (
            <section className="y-card" aria-labelledby="h-tas">
              <div className="y-row y-sp">
                <h2 id="h-tas">Müşteriye gösterilen tasarım</h2>
                <span className="y-b y-b-gri">Sürüm {s.tasarimSurumu} · {{ hazirlaniyor: "Hazırlanıyor", bekliyor: "Onay bekleniyor", duzeltme: "Düzeltme istendi", onaylandi: "Onaylandı", yok: "" }[s.onayDurumu]}</span>
              </div>
              {s.tasarimGorseli ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.tasarimGorseli} alt="Gönderilen tasarım" style={{ width: "100%", maxHeight: 420, objectFit: "contain", background: "#F3EEE6", borderRadius: 10 }} />
              ) : (
                <div style={{ background: "#F3EEE6", borderRadius: 10, padding: 16, display: "flex", justifyContent: "center" }}>
                  <LevhaOnizleme
                    satirlar={(alanlar.get(onayKalemi.urunId ?? 0) ?? []).filter((a) => a.tip === "metin").map((a) => onayKalemi.kisi[a.id] ?? "").filter(Boolean)}
                    fontAilesi={ayar.fontlar.find((f) => Object.values(onayKalemi.kisi).includes(f.ad))?.aile ?? "Inter"}
                    zemin={zeminBul(Object.values(onayKalemi.secim), "Ahşap")}
                    olcu={boyutBul(Object.values(onayKalemi.secim))}
                    etiket="Otomatik önizleme"
                  />
                </div>
              )}
            </section>
          )}

          <section className="y-card" aria-labelledby="h-gec">
            <h2 id="h-gec">Geçmiş</h2>
            <ul className="y-tl">
              {olaylar.map((o) => (
                <li key={o.id}>
                  <time className="y-sm y-mut">{tarihSaat(o.olusturma)}</time>
                  <span>{o.mesaj}{!o.musteriyeGorunur && <span className="y-b y-b-gri" style={{ marginLeft: 6 }}>yalnızca panelde</span>}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="y-narrow">
          <section className="y-card" aria-labelledby="h-mus">
            <h2 id="h-mus">Müşteri</h2>
            <div>
              <b>{s.musteri.ad}</b>
              <a className="y-sm" style={{ display: "block" }} href={`mailto:${s.musteri.eposta}`}>{s.musteri.eposta}</a>
              <a className="y-sm" style={{ display: "block" }} href={`tel:${s.musteri.telefon.replace(/\s/g, "")}`}>{s.musteri.telefon}</a>
            </div>
            <a className="y-btn y-s" href={whatsappLinki(s.musteri.telefon.replace(/^0/, "90"), `Merhaba ${s.musteri.ad}, Lavinia House'tan yazıyoruz. #${s.no} numaralı siparişiniz hakkında:`)} target="_blank" rel="noopener">WhatsApp’tan yaz</a>
            <div>
              <span className="y-lbl">Teslimat adresi</span>
              <p className="y-sm">{s.adres.adres}<br />{s.adres.ilce} / {s.adres.il}</p>
            </div>
            <div>
              <span className="y-lbl">Fatura</span>
              <p className="y-sm">{s.fatura.kurumsal ? <>{s.fatura.unvan}<br />{s.fatura.vergiDairesi} · VKN {s.fatura.vergiNo}</> : "Bireysel"}{!s.fatura.ayniAdres && " · farklı fatura adresi"}</p>
            </div>
            {s.hediye && <p className="y-note"><b>Hediye paketi.</b> {s.hediyeNotu ? `Not kartı: “${s.hediyeNotu}”` : "Not yok."} Faturayı pakete koymayın.</p>}
            {s.takipNo && <p className="y-sm"><span className="y-mut">Kargo:</span> {s.kargoFirmasi} · {s.takipNo}</p>}
          </section>

          <section className="y-card" aria-labelledby="h-odeme">
            <h2 id="h-odeme">Ödeme</h2>
            <div className="y-kv"><span>Ara toplam</span><span>{para(s.araToplam)}</span></div>
            {s.indirim > 0 && <div className="y-kv"><span>İndirim{s.kuponKodu ? ` (${s.kuponKodu})` : ""}</span><span>−{para(s.indirim)}</span></div>}
            <div className="y-kv"><span>Kargo</span><span>{s.kargo ? para(s.kargo) : "Ücretsiz"}</span></div>
            {s.hediyeUcreti > 0 && <div className="y-kv"><span>Hediye paketi</span><span>{para(s.hediyeUcreti)}</span></div>}
            {s.vadeFarki > 0 && <div className="y-kv"><span>Vade farkı</span><span>{para(s.vadeFarki)}</span></div>}
            <div className="y-kv"><span><b>Toplam</b></span><span><b>{para(s.toplam)}</b></span></div>
            <p className="y-sm">{s.odemeDurumu === "odendi" ? "✓ Ödendi" : s.odemeDurumu === "iade" ? "İade edildi" : "Ödeme bekleniyor"}</p>
          </section>

          <section className="y-card" aria-labelledby="h-not">
            <h2 id="h-not">İç not</h2>
            <form action={icNotKaydet} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <NoGizli />
              <textarea className="y-inp" name="not" aria-labelledby="h-not" defaultValue={s.icNot ?? ""} placeholder="Yalnızca panelde görünür" style={{ minHeight: 80 }} />
              <div><button className="y-btn y-s">Notu kaydet</button></div>
            </form>
          </section>

          {!["iptal", "iade"].includes(s.durum) && (
            <details className="y-ac y-sil">
              <summary>{s.durum === "teslim" ? "İade" : "Siparişi iptal et"}</summary>
              <div>
                {s.durum === "teslim" ? (
                  <form action={iadeEt} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <NoGizli />
                    <p className="y-sm">Ürün geri geldiyse ve ücreti iade ettiyseniz işaretleyin. Kart iadesini ödeme altyapısının panelinden yapmanız gerekir.</p>
                    <div><button className="y-btn y-redf">İade edildi olarak işaretle</button></div>
                  </form>
                ) : (
                  <form action={iptalEt} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <NoGizli />
                    <label className="y-lbl" htmlFor="i-n" style={{ marginBottom: 0 }}>Neden (müşteriye iletilir)</label>
                    <input id="i-n" className="y-inp" name="neden" placeholder="ör. Müşterinin isteğiyle" />
                    <p className="y-sm">{s.odemeDurumu === "odendi" ? "Ödenmiş siparişlerde ücret iadesini ödeme altyapısının panelinden ya da havaleyle yapmanız gerekir." : "Ödeme alınmadı."}</p>
                    <div><button className="y-btn y-redf">Siparişi iptal et</button></div>
                  </form>
                )}
              </div>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}
