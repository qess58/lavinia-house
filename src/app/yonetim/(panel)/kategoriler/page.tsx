import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, isNull } from "drizzle-orm";
import { db } from "@/db";
import { kategoriler, urunler } from "@/db/schema";
import { yoneticiGerekli } from "@/lib/yetki";
import { kategoriEkle, kategoriGuncelle, kategoriMenuDegistir, kategoriSil, kategoriTasi } from "../../eylemler";
import { TekGorsel } from "../TekGorsel";

export const metadata: Metadata = { title: "Kategoriler" };

const BASARI: Record<string, string> = {
  eklendi: "Kategori eklendi. Mağazada hemen görünür.",
  kaydedildi: "Değişiklikler kaydedildi.",
  sira: "Sıralama güncellendi.",
  silindi: "Kategori silindi.",
};
const HATA: Record<string, string> = {
  ad: "Kategori adı boş olamaz (en fazla 60 karakter).",
  "slug-gecersiz": "Bağlantı adı yalnızca küçük harf, rakam ve tire içerebilir (ör. ev-ve-dekor).",
  "slug-var": "Bu bağlantı adı başka bir kategoride kullanılıyor.",
  yok: "Kategori bulunamadı. Sayfayı yenileyip tekrar deneyin.",
};

type Arama = Promise<Record<string, string | string[] | undefined>>;

export default async function KategorilerSayfasi({ searchParams }: { searchParams: Arama }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const tek = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const d = await db();
  const [liste, sayilar] = await Promise.all([
    d.select().from(kategoriler).orderBy(asc(kategoriler.sira), asc(kategoriler.id)),
    d.select({ kategoriId: urunler.kategoriId, n: count() }).from(urunler).where(isNull(urunler.silinme)).groupBy(urunler.kategoriId),
  ]);
  const urunSayisi = Object.fromEntries(sayilar.map((s) => [s.kategoriId ?? 0, s.n]));
  const kategorisiz = urunSayisi[0] ?? 0;
  const basari = BASARI[tek("ok")];
  const hata = HATA[tek("hata")];
  const acik = Number(tek("ac")) || null;

  return (
    <>
      <div className="y-top">
        <div>
          <h1>Kategoriler</h1>
          <p className="y-sub">Buradaki sıra; üst menüde, alt bilgide, ana sayfada ve ürün listesindeki seçim kutusunda kullanılır.</p>
        </div>
        <Link className="y-btn" href="/urunler" target="_blank">Mağazada gör ↗</Link>
      </div>

      {basari && <p className="y-msg y-basari" role="status">{basari}</p>}
      {hata && <p className="y-msg y-hata" role="alert">{hata}</p>}

      <div className="y-split">
        <section className="y-wide" aria-labelledby="h-liste">
          <div className="y-box">
            <div className="y-row y-sp" style={{ padding: "14px 18px", borderBottom: "1px solid #E2E4DF" }}>
              <h2 id="h-liste">{liste.length} kategori</h2>
              {kategorisiz > 0 && <span className="y-b y-b-sari">{kategorisiz} ürün kategorisiz</span>}
            </div>
            {liste.length === 0 ? (
              <p className="y-mut" style={{ padding: 18 }}>Henüz kategori yok. Sağdaki formdan ilk kategorinizi ekleyin.</p>
            ) : (
              <ul className="y-kat" style={{ margin: 0, padding: 0 }}>
                {liste.map((k, i) => {
                  const n = urunSayisi[k.id] ?? 0;
                  const digerleri = liste.filter((x) => x.id !== k.id);
                  return (
                    <li key={k.id}>
                      <div className="y-kr">
                        <form action={kategoriTasi} className="y-sir">
                          <input type="hidden" name="id" value={k.id} />
                          <button name="yon" value="yukari" disabled={i === 0} aria-label={`${k.ad} yukarı taşı`}>▲</button>
                          <button name="yon" value="asagi" disabled={i === liste.length - 1} aria-label={`${k.ad} aşağı taşı`}>▼</button>
                        </form>
                        <div className="y-ad">
                          <span className="y-renk" style={{ background: k.renk }} aria-hidden="true" />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block" }}>{k.ad}</b>
                            <span className="y-mut y-sm">/urunler?kategori={k.slug}</span>
                          </span>
                        </div>
                        <span className={`y-b ${n ? "y-b-gri" : "y-b-sari"}`}>{n ? `${n} ürün` : "Boş"}</span>
                        <form action={kategoriMenuDegistir} className="y-row" style={{ gap: 8 }}>
                          <input type="hidden" name="id" value={k.id} />
                          <input type="hidden" name="menude" value={k.menude ? "0" : "1"} />
                          <span className="y-sm" id={`m-${k.id}`}>Menüde</span>
                          <button className={`y-sw ${k.menude ? "y-on" : ""}`} role="switch" aria-checked={k.menude} aria-labelledby={`m-${k.id}`} title={k.menude ? "Menüden kaldır" : "Menüde göster"} />
                        </form>
                      </div>
                      <div className="y-kbtn">
                        <details className="y-ac" open={acik === k.id}>
                          <summary>Düzenle</summary>
                          <div>
                            <form action={kategoriGuncelle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              <input type="hidden" name="id" value={k.id} />
                              <div className="y-fg">
                                <div>
                                  <label className="y-lbl" htmlFor={`ad-${k.id}`}>Kategori adı</label>
                                  <input id={`ad-${k.id}`} className="y-inp" name="ad" defaultValue={k.ad} maxLength={60} required />
                                </div>
                                <div>
                                  <label className="y-lbl" htmlFor={`sl-${k.id}`}>Bağlantı adı</label>
                                  <input id={`sl-${k.id}`} className="y-inp" name="slug" defaultValue={k.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
                                </div>
                              </div>
                              <p className="y-hint" style={{ marginTop: -6 }}>Bağlantı adını değiştirirseniz bu kategoriye verilmiş eski bağlantılar çalışmaz.</p>
                              <div>
                                <label className="y-lbl" htmlFor={`ac-${k.id}`}>Kısa açıklama</label>
                                <textarea id={`ac-${k.id}`} className="y-inp" name="aciklama" defaultValue={k.aciklama} maxLength={300} style={{ minHeight: 70 }} />
                              </div>
                              <div>
                                <p className="y-lbl">Ana sayfa kart fotoğrafı</p>
                                <TekGorsel ad="gorsel" klasor="kategori" mevcut={k.gorsel} aciklama="Fotoğraf eklenmezse bu kategorideki ilk fotoğraflı ürün, o da yoksa kart rengi kullanılır." />
                              </div>
                              <div className="y-row" style={{ gap: 18 }}>
                                <label className="y-ck">
                                  <input type="color" name="renk" defaultValue={k.renk} aria-label="Kart rengi" />
                                  <span className="y-sm">Ana sayfa kart rengi</span>
                                </label>
                                <label className="y-ck">
                                  <input type="checkbox" name="menude" defaultChecked={k.menude} />
                                  Menüde göster
                                </label>
                              </div>
                              <div><button className="y-btn y-pri">Kaydet</button></div>
                            </form>
                          </div>
                        </details>
                        <details className="y-ac y-sil">
                          <summary>Sil</summary>
                          <div>
                            <form action={kategoriSil} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <input type="hidden" name="id" value={k.id} />
                              {n > 0 ? (
                                <div>
                                  <label className="y-lbl" htmlFor={`h-${k.id}`}>Bu kategorideki {n} ürün nereye taşınsın?</label>
                                  <select id={`h-${k.id}`} className="y-inp" name="hedef" defaultValue={digerleri[0]?.id ?? ""}>
                                    {digerleri.map((x) => (
                                      <option key={x.id} value={x.id}>{x.ad}</option>
                                    ))}
                                    <option value="">Hiçbir kategoriye (kategorisiz bırak)</option>
                                  </select>
                                  <p className="y-hint">Ürünler silinmez, yalnızca kategorisi değişir.</p>
                                </div>
                              ) : (
                                <p className="y-sm">Bu kategoride ürün yok.</p>
                              )}
                              <div><button className="y-btn y-redf">“{k.ad}” kategorisini sil</button></div>
                            </form>
                          </div>
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="y-narrow">
          <form action={kategoriEkle} className="y-card" aria-labelledby="h-yeni">
            <h2 id="h-yeni">Yeni kategori</h2>
            <div>
              <label className="y-lbl" htmlFor="y-ad">Kategori adı</label>
              <input id="y-ad" className="y-inp" name="ad" maxLength={60} required placeholder="Örn. Hediyelik" />
              <p className="y-hint">Bağlantı adı otomatik oluşur, sonra değiştirebilirsiniz.</p>
            </div>
            <div>
              <label className="y-lbl" htmlFor="y-ac">Kısa açıklama (isteğe bağlı)</label>
              <textarea id="y-ac" className="y-inp" name="aciklama" maxLength={300} style={{ minHeight: 70 }} />
            </div>
            <div>
              <p className="y-lbl">Kart fotoğrafı (isteğe bağlı)</p>
              <TekGorsel ad="gorsel" klasor="kategori" mevcut={null} />
            </div>
            <div className="y-row" style={{ gap: 18 }}>
              <label className="y-ck">
                <input type="color" name="renk" defaultValue="#EDE6DA" aria-label="Kart rengi" />
                <span className="y-sm">Kart rengi</span>
              </label>
              <label className="y-ck">
                <input type="checkbox" name="menude" defaultChecked />
                Menüde göster
              </label>
            </div>
            <button className="y-btn y-pri">Kategori ekle</button>
          </form>
          <div className="y-note">
            <b>Nasıl görünür?</b> “Menüde göster” açık olan kategoriler üst menüde, alt bilgide ve ana sayfada yer alır. İçinde yayında ürün olan her
            kategori ürün listesindeki “Kategori” seçim kutusunda çıkar. Ürünlerin kategorisi ürün düzenleme ekranından seçilir.
          </div>
        </aside>
      </div>
    </>
  );
}
