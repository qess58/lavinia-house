import type { Metadata } from "next";
import { asc, count } from "drizzle-orm";
import { db } from "@/db";
import { bultenAboneleri, yoneticiler } from "@/db/schema";
import { tarihSaat } from "@/lib/bicim";
import { magazaAyarlari } from "@/lib/veri";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { tlYaz } from "../../ortak";
import { ayarlariKaydet, sifreDegistir, yoneticiEkle, yoneticiSil } from "./eylemler";
import { siteAdresi } from "@/lib/site";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function AyarlarSayfasi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ben = await yoneticiGerekli();
  const sp = await searchParams;
  const d = await db();
  const [a, kisiler, [{ abone }]] = await Promise.all([
    magazaAyarlari(),
    d.select().from(yoneticiler).orderBy(asc(yoneticiler.id)),
    d.select({ abone: count() }).from(bultenAboneleri),
  ]);
  const site = siteAdresi("https://laviniahouse.com");
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Ayarlar</h1>
          <p className="y-sub">Kaydettiğiniz bilgiler sitede hemen güncellenir.</p>
        </div>
      </div>
      <Mesaj
        sp={sp}
        basari={{ kaydedildi: "Ayarlar kaydedildi.", sifre: "Şifreniz değiştirildi.", kullanici: "Kullanıcı eklendi. E-postası ve şifresiyle giriş yapabilir.", kaldirildi: "Kullanıcı kaldırıldı." }}
        hata={{
          sayi: "Kargo, limit, hediye paketi ve vade farkı alanlarına geçerli sayılar yazın.",
          iban: "IBAN “TR” ile başlamalı ve 26 karakter olmalı.",
          instagram: "Instagram kullanıcı adı geçersiz. Yalnızca harf, rakam, nokta ve alt çizgi olabilir.",
          google: "Google doğrulama kodu geçersiz. Search Console’daki etiketin tamamını ya da yalnızca content değerini yapıştırın.",
          mevcut: "Mevcut şifreniz hatalı.",
          kisa: "Şifre en az 10 karakter olmalı.",
          ayni: "Yeni şifreler aynı değil.",
          yetki: "Bu işlemi yalnızca mağaza sahibi yapabilir.",
          bilgi: "Ad ve geçerli bir e-posta yazın.",
          eposta: "Bu e-postayla bir kullanıcı zaten var.",
          sonsahip: "Son mağaza sahibi kaldırılamaz.",
        }}
      />
      <form action={ayarlariKaydet} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <section className="y-card" aria-labelledby="h-mod" style={{ borderColor: "#4A2E85", borderWidth: 2 }}>
          <h2 id="h-mod">Satış modu</h2>
          <label className="y-ck" style={{ alignItems: "flex-start" }}>
            <input type="radio" name="onlineSatis" value="vitrin" defaultChecked={!a.onlineSatis} style={{ marginTop: 3 }} />
            <span>
              <b>Vitrin modu (online satış kapalı)</b>
              <span className="y-sm y-mut" style={{ display: "block" }}>Ürünler görünür; sepet ve ödeme yerine “Online satış çok yakında”, “WhatsApp’tan sipariş ver” ve “Teklif iste” çıkar.</span>
            </span>
          </label>
          <label className="y-ck" style={{ alignItems: "flex-start" }}>
            <input type="radio" name="onlineSatis" value="acik" defaultChecked={a.onlineSatis} style={{ marginTop: 3 }} />
            <span>
              <b>Online satış açık</b>
              <span className="y-sm y-mut" style={{ display: "block" }}>Sepet ve ödeme açılır. Kartla ödeme için ödeme altyapısı (sanal POS) bağlı olmalı; bağlı değilse yalnızca havale / EFT alınır.</span>
            </span>
          </label>
          <label className="y-ck">
            <input type="checkbox" name="fiyatGoster" defaultChecked={a.fiyatGoster} />
            Vitrin modunda fiyatları göster
          </label>
        </section>
        <div className="y-grid y-k2">
          <section className="y-card" aria-labelledby="h-mg">
            <h2 id="h-mg">Mağaza ve iletişim</h2>
            <div>
              <label className="y-lbl" htmlFor="a-kb">Üst şerit duyurusu</label>
              <input id="a-kb" className="y-inp" name="kampanyaBandi" defaultValue={a.kampanyaBandi} placeholder="Boş bırakırsanız şerit görünmez" />
              <p className="y-hint">Vitrin modunda kargo kampanyası yerine “Online satış çok yakında” duyurusu çıkar; kendi metninizi yazarsanız o görünür.</p>
            </div>
            <div className="y-fg">
              <div>
                <label className="y-lbl" htmlFor="a-tel">Telefon</label>
                <input id="a-tel" className="y-inp" name="telefon" defaultValue={a.telefon} placeholder="0 5xx xxx xx xx" />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-ep">E-posta</label>
                <input id="a-ep" className="y-inp" name="eposta" type="email" defaultValue={a.eposta} />
              </div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="a-wa">WhatsApp numarası</label>
              <input id="a-wa" className="y-inp" name="whatsapp" defaultValue={a.whatsapp} placeholder="90 5xx xxx xx xx" />
              <p className="y-hint">Sitedeki yeşil WhatsApp düğmesi bu numaraya yazdırır.</p>
            </div>
            <div>
              <label className="y-lbl" htmlFor="a-adr">Adres</label>
              <textarea id="a-adr" className="y-inp" name="adres" defaultValue={a.adres} style={{ minHeight: 60 }} placeholder="Alt bilgide ve Google’daki işletme bilgisinde kullanılır" />
            </div>
          </section>

          <section className="y-card" aria-labelledby="h-sat">
            <h2 id="h-sat">Satıcı bilgileri</h2>
            <p className="y-sm y-mut" style={{ marginTop: -6 }}>Yasal metinlerde, iletişim sayfasında ve alt bilgide gösterilir. Mali müşavirinizden alabilirsiniz.</p>
            <div>
              <label className="y-lbl" htmlFor="a-un">Ticari unvan / ad soyad</label>
              <input id="a-un" className="y-inp" name="unvan" defaultValue={a.unvan} placeholder="ör. Ad Soyad – Lavinia House veya şirket unvanı" />
            </div>
            <div className="y-fg">
              <div>
                <label className="y-lbl" htmlFor="a-vd">Vergi dairesi</label>
                <input id="a-vd" className="y-inp" name="vergiDairesi" defaultValue={a.vergiDairesi} />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-vn">Vergi / TC kimlik no</label>
                <input id="a-vn" className="y-inp" name="vergiNo" defaultValue={a.vergiNo} inputMode="numeric" />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-me">MERSİS no (şirketse)</label>
                <input id="a-me" className="y-inp" name="mersisNo" defaultValue={a.mersisNo} inputMode="numeric" />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-et">ETBİS kayıt no</label>
                <input id="a-et" className="y-inp" name="etbisNo" defaultValue={a.etbisNo} />
              </div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="a-cs">Çalışma saatleri</label>
              <input id="a-cs" className="y-inp" name="calismaSaatleri" defaultValue={a.calismaSaatleri} />
            </div>
          </section>

          <section className="y-card" aria-labelledby="h-kg">
            <h2 id="h-kg">Kargo ve ödeme</h2>
            <div className="y-fg">
              <div>
                <label className="y-lbl" htmlFor="a-ku">Kargo ücreti (₺)</label>
                <input id="a-ku" className="y-inp" name="kargoUcreti" inputMode="decimal" defaultValue={tlYaz(a.kargoUcreti)} />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-kl">Ücretsiz kargo limiti (₺)</label>
                <input id="a-kl" className="y-inp" name="ucretsizKargoLimiti" inputMode="decimal" defaultValue={tlYaz(a.ucretsizKargoLimiti)} />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-hp">Hediye paketi (₺)</label>
                <input id="a-hp" className="y-inp" name="hediyePaketiUcreti" inputMode="decimal" defaultValue={tlYaz(a.hediyePaketiUcreti)} />
              </div>
              <div>
                <label className="y-lbl" htmlFor="a-vd">6 taksit vade farkı (%)</label>
                <input id="a-vd" className="y-inp" name="taksit6VadeYuzde" inputMode="decimal" defaultValue={String(a.taksit6VadeYuzde).replace(".", ",")} />
              </div>
            </div>
            <div>
              <label className="y-lbl" htmlFor="a-al">Havale alıcı adı</label>
              <input id="a-al" className="y-inp" name="aliciAdi" defaultValue={a.aliciAdi} />
            </div>
            <div>
              <label className="y-lbl" htmlFor="a-ib">IBAN</label>
              <input id="a-ib" className="y-inp" name="iban" defaultValue={a.iban} placeholder="TR00 0000 0000 0000 0000 0000 00" />
              <p className="y-hint">Havale seçen müşteriye sipariş sonrası ve e-postada gösterilir.</p>
            </div>
          </section>

          <section className="y-card" aria-labelledby="h-ig">
            <h2 id="h-ig">Instagram</h2>
            <div>
              <label className="y-lbl" htmlFor="a-ig">Kullanıcı adı</label>
              <input id="a-ig" className="y-inp" name="instagram" defaultValue={a.instagram} placeholder="laviniahouse" />
              <p className="y-hint">Yazınca sitenin alt bilgisine ve ana sayfaya Instagram bağlantısı eklenir.</p>
            </div>
            <div className="y-note">
              <b>Instagram profilinize bu bağlantıyı koyun:</b>
              <br />
              <code>{site.replace(/^https?:\/\//, "")}/instagram</code>
              <br />
              Bu bağlantıdan gelenleri Raporlar’da “Instagram” kaynağı olarak ayrı görürsünüz.
            </div>
          </section>

          <section className="y-card" aria-labelledby="h-go">
            <h2 id="h-go">Google Search Console</h2>
            <div>
              <label className="y-lbl" htmlFor="a-go">Doğrulama kodu</label>
              <input id="a-go" className="y-inp" name="googleDogrulama" defaultValue={a.googleDogrulama} placeholder='<meta name="google-site-verification" content="…">' />
            </div>
            <ol className="y-sm" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>search.google.com/search-console adresine Google hesabınızla girin.</li>
              <li>“URL ön eki” seçip sitenizin adresini yazın.</li>
              <li>Doğrulama yöntemlerinden “HTML etiketi”ni seçin, etiketi kopyalayıp buraya yapıştırın ve kaydedin.</li>
              <li>Search Console’a dönüp “Doğrula”ya basın. Sonra “Site haritaları”na <code>sitemap.xml</code> yazıp gönderin.</li>
            </ol>
          </section>
        </div>
        <div className="y-sticky">
          <button className="y-btn y-pri">Ayarları kaydet</button>
        </div>
      </form>

      <div className="y-grid y-k2">
        <form action={sifreDegistir} className="y-card" id="hesap" aria-labelledby="h-sf">
          <h2 id="h-sf">Şifremi değiştir</h2>
          <input className="y-gizli" type="email" name="kullanici" autoComplete="username" value={ben.eposta} readOnly tabIndex={-1} aria-hidden="true" />
          <div>
            <label className="y-lbl" htmlFor="s-m">Mevcut şifre</label>
            <input id="s-m" className="y-inp" name="mevcut" type="password" autoComplete="current-password" required />
          </div>
          <div className="y-fg">
            <div>
              <label className="y-lbl" htmlFor="s-y">Yeni şifre</label>
              <input id="s-y" className="y-inp" name="yeni" type="password" autoComplete="new-password" minLength={10} required />
            </div>
            <div>
              <label className="y-lbl" htmlFor="s-y2">Yeni şifre (tekrar)</label>
              <input id="s-y2" className="y-inp" name="yeni2" type="password" autoComplete="new-password" minLength={10} required />
            </div>
          </div>
          <div><button className="y-btn">Şifreyi değiştir</button></div>
        </form>

        <section className="y-card" aria-labelledby="h-bl">
          <h2 id="h-bl">Bülten aboneleri</h2>
          <p><span className="y-stat">{abone}</span> <span className="y-mut">kişi e-posta izni verdi</span></p>
          <p className="y-sm y-mut">Bu kişilere kampanya e-postası göndermeden önce İleti Yönetim Sistemi’ne (İYS) kayıt olmanız ve izinleri oraya yüklemeniz gerekir. Listeyi aşağıdan indirebilirsiniz.</p>
          <div><a className="y-btn y-s" href="/yonetim/bulten-indir">Listeyi indir (CSV)</a></div>
        </section>

        <section className="y-card" id="kullanicilar" aria-labelledby="h-ku">
          <h2 id="h-ku">Panel kullanıcıları</h2>
          <ul className="y-list">
            {kisiler.map((k) => (
              <li key={k.id}>
                <span style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <b>{k.ad}</b> <span className="y-b y-b-gri">{k.rol === "sahip" ? "Sahip" : "Personel"}</span>
                  <span className="y-sm y-mut" style={{ display: "block" }}>{k.eposta} · Son giriş: {k.sonGiris ? tarihSaat(k.sonGiris) : "hiç"}</span>
                </span>
                {ben.rol === "sahip" && k.id !== ben.id && (
                  <form action={yoneticiSil}>
                    <input type="hidden" name="id" value={k.id} />
                    <button className="y-btn y-s y-red">Kaldır</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {ben.rol === "sahip" && (
            <details className="y-ac">
              <summary>+ Kullanıcı ekle</summary>
              <div>
                <form action={yoneticiEkle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="y-fg">
                    <div><label className="y-lbl" htmlFor="k-ad">Ad</label><input id="k-ad" className="y-inp" name="ad" required /></div>
                    <div><label className="y-lbl" htmlFor="k-ep">E-posta</label><input id="k-ep" className="y-inp" name="eposta" type="email" required autoComplete="off" /></div>
                  </div>
                  <div className="y-fg">
                    <div><label className="y-lbl" htmlFor="k-sf">Geçici şifre</label><input id="k-sf" className="y-inp" name="sifre" type="text" minLength={10} required autoComplete="off" /></div>
                    <div><label className="y-lbl" htmlFor="k-rl">Rol</label><select id="k-rl" className="y-inp" name="rol"><option value="personel">Personel</option><option value="sahip">Sahip (kullanıcı ekleyip çıkarabilir)</option></select></div>
                  </div>
                  <p className="y-hint" style={{ marginTop: 0 }}>Şifreyi kişiye kendiniz iletin; ilk girişten sonra Ayarlar’dan değiştirebilir.</p>
                  <div><button className="y-btn y-pri">Kullanıcıyı ekle</button></div>
                </form>
              </div>
            </details>
          )}
        </section>
      </div>
    </>
  );
}
