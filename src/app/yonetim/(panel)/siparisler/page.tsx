import type { Metadata } from "next";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { siparisKalemleri, siparisler } from "@/db/schema";
import { para, tarihSaat } from "@/lib/bicim";
import type { SiparisDurumu } from "@/lib/tipler";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { DURUM_AD, sonrakiAdim } from "./durumlar";

export const metadata: Metadata = { title: "Siparişler" };

const SEKMELER: { k: string; ad: string; durumlar?: SiparisDurumu[] }[] = [
  { k: "", ad: "Açık siparişler", durumlar: ["odeme", "yeni", "onay", "uretim", "kargo"] },
  { k: "odeme", ad: "Ödeme bekleyen", durumlar: ["odeme"] },
  { k: "yeni", ad: "Yeni", durumlar: ["yeni"] },
  { k: "onay", ad: "Tasarım onayında", durumlar: ["onay"] },
  { k: "uretim", ad: "Üretimde", durumlar: ["uretim"] },
  { k: "kargo", ad: "Kargoda", durumlar: ["kargo"] },
  { k: "teslim", ad: "Teslim edilen", durumlar: ["teslim"] },
  { k: "iptal", ad: "İptal / iade", durumlar: ["iptal", "iade"] },
  { k: "tumu", ad: "Tümü" },
];

type Arama = Promise<Record<string, string | string[] | undefined>>;

export default async function SiparislerSayfasi({ searchParams }: { searchParams: Arama }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const tek = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const sekme = SEKMELER.find((s) => s.k === tek("durum")) ?? SEKMELER[0];
  const q = tek("q").trim().toLocaleLowerCase("tr").replace(/^#/, "");
  const d = await db();
  const tum = await d.select().from(siparisler).orderBy(desc(siparisler.olusturma)).limit(1000);
  const kalemler = tum.length ? await d.select().from(siparisKalemleri).where(inArray(siparisKalemleri.siparisId, tum.map((s) => s.id))) : [];
  const kalemMap = new Map<number, typeof kalemler>();
  for (const k of kalemler) kalemMap.set(k.siparisId, [...(kalemMap.get(k.siparisId) ?? []), k]);

  const say = (s: (typeof SEKMELER)[number]) => (s.durumlar ? tum.filter((x) => s.durumlar!.includes(x.durum)).length : tum.length);
  const liste = tum.filter(
    (s) =>
      (!sekme.durumlar || sekme.durumlar.includes(s.durum)) &&
      (!q || String(s.no) === q || `${s.musteri.ad} ${s.musteri.eposta} ${s.musteri.telefon}`.toLocaleLowerCase("tr").includes(q)),
  );

  return (
    <>
      <div className="y-top">
        <div>
          <h1>Siparişler</h1>
          <p className="y-sub">Durumu değiştirdiğinizde müşteriye otomatik e-posta gider.</p>
        </div>
        <form className="y-row" role="search" aria-label="Sipariş ara">
          {sekme.k && <input type="hidden" name="durum" value={sekme.k} />}
          <input className="y-inp" name="q" defaultValue={tek("q")} placeholder="Sipariş no, ad, e-posta, telefon" style={{ width: 280 }} aria-label="Ara" />
          <button className="y-btn">Ara</button>
        </form>
      </div>
      <Mesaj sp={sp} basari={{}} hata={{ yok: "Sipariş bulunamadı." }} />
      <nav className="y-tab-row" aria-label="Durum">
        {SEKMELER.map((s) => (
          <Link key={s.k} className={s === sekme ? "y-on" : ""} href={s.k ? `/yonetim/siparisler?durum=${s.k}` : "/yonetim/siparisler"} aria-current={s === sekme ? "page" : undefined}>
            {s.ad} <small>{say(s)}</small>
          </Link>
        ))}
      </nav>
      <div className="y-box">
        <table>
          <thead>
            <tr><th>Sipariş</th><th>Müşteri</th><th>Ürünler</th><th>Ödeme</th><th className="y-r">Tutar</th><th>Durum</th><th>Sıradaki adım</th></tr>
          </thead>
          <tbody>
            {liste.map((s) => {
              const k = kalemMap.get(s.id) ?? [];
              const kisisel = k.some((x) => x.kisisel);
              const [adim, acil] = sonrakiAdim(s.durum, s.onayDurumu, kisisel);
              const [dAd, dSinif] = DURUM_AD[s.durum];
              return (
                <tr key={s.id}>
                  <td className="y-nw">
                    <Link href={`/yonetim/siparisler/${s.no}`}><b>#{s.no}</b></Link>
                    <span className="y-sm y-mut" style={{ display: "block" }}>{tarihSaat(s.olusturma)}</span>
                  </td>
                  <td>{s.musteri.ad}<span className="y-sm y-mut" style={{ display: "block" }}>{s.adres.il}</span></td>
                  <td style={{ maxWidth: 280 }}>
                    {k.slice(0, 2).map((x) => <span key={x.id} style={{ display: "block" }} className="y-sm">{x.adet} × {x.ad}</span>)}
                    {k.length > 2 && <span className="y-sm y-mut">+{k.length - 2} ürün daha</span>}
                    {kisisel && <span className="y-b y-b-mor" style={{ marginTop: 4 }}>Kişiye özel</span>}
                  </td>
                  <td className="y-sm">{s.odemeYontemi === "kart" ? `Kart${s.taksit > 1 ? ` · ${s.taksit} taksit` : ""}` : "Havale / EFT"}<span style={{ display: "block" }} className={s.odemeDurumu === "odendi" ? "" : "y-mut"}>{s.odemeDurumu === "odendi" ? "Ödendi" : s.odemeDurumu === "iade" ? "İade edildi" : "Bekleniyor"}</span></td>
                  <td className="y-r y-num y-nw"><b>{para(s.toplam)}</b></td>
                  <td><span className={`y-b ${dSinif}`}>{dAd}</span></td>
                  <td className="y-sm" style={{ fontWeight: acil ? 600 : 400, color: acil ? "#17201C" : "#5B635E" }}>
                    {acil ? <Link href={`/yonetim/siparisler/${s.no}`}>{adim} →</Link> : adim}
                  </td>
                </tr>
              );
            })}
            {liste.length === 0 && <tr><td colSpan={7} className="y-mut" style={{ padding: 24, textAlign: "center" }}>{q ? "Aramanıza uyan sipariş yok." : "Bu bölümde sipariş yok."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
