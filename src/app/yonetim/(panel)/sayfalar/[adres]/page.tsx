import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ISARETLER, isaretleriDoldur, sayfaIcerigi, sayfaTanimi } from "@/lib/sayfalar";
import { magazaAyarlari } from "@/lib/veri";
import { yoneticiGerekli } from "@/lib/yetki";
import { SayfaMetni } from "@/components/SayfaMetni";
import { Mesaj } from "../../Mesaj";
import { sayfaKaydet, sayfaSifirla } from "../eylemler";

type Props = { params: Promise<{ adres: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: sayfaTanimi((await params).adres)?.baslik ?? "Sayfa" };
}

export default async function SayfaDuzenle({ params, searchParams }: Props) {
  await yoneticiGerekli();
  const { adres } = await params;
  const sp = await searchParams;
  const t = sayfaTanimi(adres);
  if (!t) notFound();
  const [{ icerik, ozel }, a] = await Promise.all([sayfaIcerigi(adres), magazaAyarlari()]);
  return (
    <>
      <div className="y-top">
        <div>
          <Link className="y-back" href="/yonetim/sayfalar">← Sayfalar</Link>
          <h1 style={{ marginTop: 6 }}>{t.baslik}</h1>
          <p className="y-sub">{t.aciklama}</p>
        </div>
        <Link className="y-btn" href={`/bilgi/${t.adres}`} target="_blank">Mağazada gör ↗</Link>
      </div>
      <Mesaj sp={sp} basari={{ kaydedildi: "Sayfa kaydedildi. Mağazada hemen güncellenir.", sifirlandi: "Sayfa hazır metne döndürüldü." }} />
      {t.yasal && !icerik.trim() && (
        <p className="y-msg y-hata">Bu yasal metin henüz yok. Satışa başlamadan önce bir hukukçuya hazırlatıp buraya yapıştırın.</p>
      )}
      <div className="y-split">
        <form action={sayfaKaydet} className="y-card y-wide" aria-labelledby="h-metin">
          <input type="hidden" name="adres" value={t.adres} />
          <h2 id="h-metin">Metin</h2>
          <textarea className="y-inp" name="icerik" aria-labelledby="h-metin" defaultValue={icerik} rows={22} style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 14, lineHeight: 1.55 }} placeholder={t.yasal ? "Hukukçunuzun hazırladığı metni buraya yapıştırın." : ""} />
          <div className="y-row">
            <button className="y-btn y-pri">Kaydet</button>
          </div>
        </form>
        <aside className="y-narrow">
          <section className="y-card" aria-labelledby="h-yaz">
            <h2 id="h-yaz">Nasıl yazılır?</h2>
            <ul className="y-sm" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>Boş satır bırakınca yeni paragraf başlar.</li>
              <li><code>## Başlık</code> ile ara başlık yazılır.</li>
              <li><code>- madde</code> ile madde işaretli liste yapılır.</li>
              <li>Aşağıdaki işaretler Ayarlar’daki bilgilerle otomatik dolar; bilgi değişince metni yeniden yazmanız gerekmez.</li>
            </ul>
            <p className="y-sm" style={{ lineHeight: 1.9 }}>{ISARETLER.map((i) => <code key={i} style={{ marginRight: 6 }}>{`{${i}}`}</code>)}</p>
          </section>
          {ozel && (
            <details className="y-ac y-sil">
              <summary>{t.varsayilan ? "Hazır metne döndür" : "Metni sil"}</summary>
              <div>
                <form action={sayfaSifirla}>
                  <input type="hidden" name="adres" value={t.adres} />
                  <button className="y-btn y-s y-redf">{t.varsayilan ? "Yazdıklarımı sil, hazır metne dön" : "Metni sil"}</button>
                </form>
              </div>
            </details>
          )}
        </aside>
      </div>
      {icerik.trim() && (
        <section className="y-card" aria-labelledby="h-on">
          <h2 id="h-on">Önizleme (kaydedilmiş hâli)</h2>
          <div className="y-onizleme"><SayfaMetni metin={isaretleriDoldur(icerik, a)} /></div>
        </section>
      )}
    </>
  );
}
