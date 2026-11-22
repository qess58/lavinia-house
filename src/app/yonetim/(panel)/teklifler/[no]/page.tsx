import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teklifler } from "@/db/schema";
import { tarihSaat } from "@/lib/bicim";
import { yoneticiGerekli } from "@/lib/yetki";
import { whatsappLinki } from "@/components/AltBilgi";
import { Mesaj } from "../../Mesaj";
import { tlYaz } from "../../../ortak";
import { TEKLIF_DURUM } from "../durumlar";
import { teklifDurum, teklifGonder, teklifNot } from "../eylemler";

type Props = { params: Promise<{ no: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Teklif T-${(await params).no}` };
}
const boyut = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default async function TeklifDetay({ params, searchParams }: Props) {
  await yoneticiGerekli();
  const no = Number((await params).no);
  const sp = await searchParams;
  const [t] = Number.isInteger(no) ? await (await db()).select().from(teklifler).where(eq(teklifler.no, no)) : [];
  if (!t) notFound();
  const [dAd, dSinif] = TEKLIF_DURUM[t.durum];
  const satir = (ad: string, deger: React.ReactNode) => (deger ? <div className="y-kv"><span>{ad}</span><span>{deger}</span></div> : null);
  const No = () => <input type="hidden" name="no" value={t.no} />;
  return (
    <>
      <div className="y-top">
        <div>
          <Link className="y-back" href="/yonetim/teklifler">← Teklifler</Link>
          <h1 style={{ marginTop: 6 }}>T-{t.no} <span className={`y-b ${dSinif}`} style={{ verticalAlign: "middle", fontSize: 14 }}>{dAd}</span></h1>
          <p className="y-sub">{tarihSaat(t.olusturma)} · {t.tur === "kurumsal" ? "Kurumsal / toplu" : "Bireysel"}</p>
        </div>
      </div>
      <Mesaj sp={sp} basari={{ gonderildi: "Teklif müşteriye e-postayla gönderildi.", durum: "Durum güncellendi.", not: "Not kaydedildi." }} hata={{ eksik: "Teklif tutarını ve mesajı yazın." }} />
      <div className="y-split">
        <div className="y-wide">
          <section className="y-card" aria-labelledby="h-ist">
            <h2 id="h-ist">İstek</h2>
            <p style={{ whiteSpace: "pre-line" }}>{t.aciklama}</p>
            <div>
              {satir("Malzeme", t.malzeme)}
              {satir("Ölçü", t.olcu)}
              {satir("Adet", t.adet)}
              {satir("İstenen tarih", t.istenenTarih)}
              {satir("Bütçe", t.butce)}
              {satir("Numune", t.numune ? "İstiyor" : "")}
            </div>
            {t.dosyalar.length > 0 && (
              <div>
                <span className="y-lbl">Dosyalar</span>
                <ul className="y-list">
                  {t.dosyalar.map((f) => (
                    <li key={f.yol}><a href={`/yonetim/dosya?yol=${encodeURIComponent(f.yol)}`}>{f.ad} ↓</a><span className="y-sm y-mut">{boyut(f.boyut)}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <form action={teklifGonder} className="y-card" aria-labelledby="h-tk">
            <No />
            <h2 id="h-tk">{t.teklifTutari ? "Teklifi güncelle" : "Teklif gönder"}</h2>
            <div className="y-fg">
              <div>
                <label className="y-lbl" htmlFor="tk-t">Tutar (₺, KDV dahil)</label>
                <input id="tk-t" className="y-inp" name="tutar" inputMode="decimal" defaultValue={tlYaz(t.teklifTutari)} required />
              </div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="tk-m">Mesaj</label>
              <textarea id="tk-m" className="y-inp" name="mesaj" rows={6} required defaultValue={t.yanit ?? `${t.adet} adet ${t.malzeme || "ürün"} için teklifimiz aşağıdadır. Onayınızdan sonra üretim süresi yaklaşık 3–5 iş günüdür.`} />
              <p className="y-hint">Müşteriye e-postayla gider. Tutar mesajın altına otomatik eklenir.</p>
            </div>
            <div><button className="y-btn y-pri">{t.teklifTutari ? "Güncel teklifi gönder" : "Teklifi gönder"}</button></div>
          </form>
        </div>
        <aside className="y-narrow">
          <section className="y-card" aria-labelledby="h-kim">
            <h2 id="h-kim">İletişim</h2>
            <div>
              <b>{t.ad}</b>
              {t.firma && <span className="y-sm" style={{ display: "block" }}>{t.firma}{t.sektor ? ` · ${t.sektor}` : ""}{t.vergiNo ? ` · VKN ${t.vergiNo}` : ""}</span>}
              <a className="y-sm" style={{ display: "block" }} href={`mailto:${t.eposta}`}>{t.eposta}</a>
              {t.telefon && <a className="y-sm" style={{ display: "block" }} href={`tel:${t.telefon.replace(/\s/g, "")}`}>{t.telefon}</a>}
              <span className="y-sm y-mut">Tercih ettiği kanal: {{ eposta: "E-posta", telefon: "Telefon", whatsapp: "WhatsApp" }[t.kanal]}</span>
            </div>
            {t.telefon && <a className="y-btn y-s" href={whatsappLinki(t.telefon.replace(/^0/, "90"), `Merhaba ${t.ad}, Lavinia House'tan yazıyoruz. T-${t.no} numaralı teklif talebiniz hakkında:`)} target="_blank" rel="noopener">WhatsApp’tan yaz</a>}
          </section>
          <form action={teklifDurum} className="y-card" aria-labelledby="h-dur">
            <No />
            <h2 id="h-dur">Durum</h2>
            <select className="y-inp" name="durum" defaultValue={t.durum} aria-labelledby="h-dur">
              {Object.entries(TEKLIF_DURUM).map(([k, [ad]]) => <option key={k} value={k}>{ad}</option>)}
            </select>
            <div><button className="y-btn y-s">Durumu kaydet</button></div>
          </form>
          <form action={teklifNot} className="y-card" aria-labelledby="h-tn">
            <No />
            <h2 id="h-tn">İç not</h2>
            <textarea className="y-inp" name="not" defaultValue={t.icNot ?? ""} aria-labelledby="h-tn" placeholder="Yalnızca panelde görünür" />
            <div><button className="y-btn y-s">Notu kaydet</button></div>
          </form>
        </aside>
      </div>
    </>
  );
}
