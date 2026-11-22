import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { kuponlar } from "@/db/schema";
import { para } from "@/lib/bicim";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { kuponAktif, kuponEkle, kuponSil } from "./eylemler";

export const metadata: Metadata = { title: "Kuponlar" };

export default async function KuponlarSayfasi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const liste = await (await db()).select().from(kuponlar).orderBy(asc(kuponlar.kod));
  const simdi = Date.now();
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Kuponlar</h1>
          <p className="y-sub">Müşteriler kodu sepette yazar. Instagram’da paylaşacağınız kampanyalar için ayrı kod açarsanız kaç kişinin kullandığını görürsünüz.</p>
        </div>
      </div>
      <Mesaj
        sp={sp}
        basari={{ eklendi: "Kupon oluşturuldu.", kaydedildi: "Kupon güncellendi.", silindi: "Kupon silindi." }}
        hata={{ kod: "Kod en az 3 harf veya rakam olmalı.", deger: "İndirim değeri geçersiz (yüzde için 1–90).", var: "Bu kod zaten var." }}
      />
      <div className="y-split">
        <div className="y-wide">
          <div className="y-box">
            <table>
              <thead><tr><th>Kod</th><th>İndirim</th><th>Koşul</th><th>Kullanım</th><th>Durum</th><th><span className="y-gizli">İşlem</span></th></tr></thead>
              <tbody>
                {liste.map((k) => {
                  const dolmus = (k.sonKullanma && k.sonKullanma.getTime() < simdi) || (k.kullanimSiniri !== null && k.kullanim >= k.kullanimSiniri);
                  return (
                    <tr key={k.kod}>
                      <td><b style={{ fontFamily: "ui-monospace, monospace" }}>{k.kod}</b></td>
                      <td className="y-nw">{k.tur === "yuzde" ? `%${k.deger}` : para(k.deger)}</td>
                      <td className="y-sm">{k.altLimit ? `${para(k.altLimit)} ve üzeri` : "Alt limit yok"}{k.sonKullanma && <span style={{ display: "block" }} className="y-mut">Son gün: {k.sonKullanma.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>}</td>
                      <td className="y-num">{k.kullanim}{k.kullanimSiniri !== null && ` / ${k.kullanimSiniri}`}</td>
                      <td><span className={`y-b ${!k.aktif ? "y-b-gri" : dolmus ? "y-b-sari" : "y-b-yesil"}`}>{!k.aktif ? "Kapalı" : dolmus ? "Süresi / sınırı dolmuş" : "Geçerli"}</span></td>
                      <td className="y-nw">
                        <form action={kuponAktif} style={{ display: "inline" }}>
                          <input type="hidden" name="kod" value={k.kod} />
                          <input type="hidden" name="aktif" value={k.aktif ? "0" : "1"} />
                          <button className="y-btn y-s y-gh">{k.aktif ? "Kapat" : "Aç"}</button>
                        </form>
                        {k.kullanim === 0 && (
                          <form action={kuponSil} style={{ display: "inline" }}>
                            <input type="hidden" name="kod" value={k.kod} />
                            <button className="y-btn y-s y-red">Sil</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {liste.length === 0 && <tr><td colSpan={6} className="y-mut" style={{ padding: 24, textAlign: "center" }}>Henüz kupon yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="y-narrow">
          <form action={kuponEkle} className="y-card" aria-labelledby="h-yk">
            <h2 id="h-yk">Yeni kupon</h2>
            <div>
              <label className="y-lbl" htmlFor="k-kod">Kod</label>
              <input id="k-kod" className="y-inp" name="kod" required placeholder="ör. INSTAGRAM15" style={{ textTransform: "uppercase" }} />
            </div>
            <div className="y-fg" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="y-lbl" htmlFor="k-tur">Tür</label>
                <select id="k-tur" className="y-inp" name="tur"><option value="yuzde">Yüzde (%)</option><option value="tutar">Tutar (₺)</option></select>
              </div>
              <div>
                <label className="y-lbl" htmlFor="k-d">Değer</label>
                <input id="k-d" className="y-inp" name="deger" inputMode="decimal" required placeholder="15" />
              </div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="k-al">En az sepet tutarı (₺)</label>
              <input id="k-al" className="y-inp" name="altLimit" inputMode="decimal" placeholder="Yok" />
            </div>
            <div className="y-fg" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="y-lbl" htmlFor="k-sk">Son gün</label>
                <input id="k-sk" className="y-inp" name="sonKullanma" type="date" />
              </div>
              <div>
                <label className="y-lbl" htmlFor="k-ks">Kullanım sınırı</label>
                <input id="k-ks" className="y-inp" name="kullanimSiniri" type="number" min={1} placeholder="Sınırsız" />
              </div>
            </div>
            <button className="y-btn y-pri">Kupon oluştur</button>
          </form>
        </aside>
      </div>
    </>
  );
}
