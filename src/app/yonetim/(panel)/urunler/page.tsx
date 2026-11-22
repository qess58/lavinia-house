import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { kategoriler, urunler } from "@/db/schema";
import { para } from "@/lib/bicim";
import { satisFiyati } from "@/lib/fiyat";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { urunDurumDegistir } from "./eylemler";

export const metadata: Metadata = { title: "Ürünler" };

type Arama = Promise<Record<string, string | string[] | undefined>>;
const DURUM = { yayinda: ["Yayında", "y-b-yesil"], taslak: ["Taslak", "y-b-gri"], gizli: ["Gizli", "y-b-sari"] } as const;

export default async function UrunlerSayfasi({ searchParams }: { searchParams: Arama }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const tek = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const q = tek("q").trim().toLocaleLowerCase("tr");
  const kat = tek("kategori");
  const durum = tek("durum");
  const d = await db();
  const [liste, kats] = await Promise.all([
    d.select().from(urunler).where(isNull(urunler.silinme)).orderBy(asc(urunler.sira), desc(urunler.id)),
    d.select().from(kategoriler).orderBy(asc(kategoriler.sira)),
  ]);
  const katAd = Object.fromEntries(kats.map((k) => [k.id, k.ad]));
  const goster = liste.filter(
    (u) =>
      (!q || `${u.ad} ${u.slug} ${u.etiketler.join(" ")}`.toLocaleLowerCase("tr").includes(q)) &&
      (!kat || (kat === "yok" ? !u.kategoriId : String(u.kategoriId) === kat)) &&
      (!durum || u.durum === durum),
  );
  const azStok = liste.filter((u) => u.durum === "yayinda" && u.stokTipi === "adet" && u.stok <= 3);
  const geri = `/yonetim/urunler?${new URLSearchParams(Object.entries({ q: tek("q"), kategori: kat, durum }).filter(([, v]) => v)).toString()}`;

  return (
    <>
      <div className="y-top">
        <div>
          <h1>Ürünler</h1>
          <p className="y-sub">{liste.length} ürün · {liste.filter((u) => u.durum === "yayinda").length} tanesi mağazada yayında</p>
        </div>
        <Link className="y-btn y-pri" href="/yonetim/urunler/yeni">+ Yeni ürün</Link>
      </div>
      <Mesaj sp={sp} basari={{ silindi: "Ürün silindi. Geçmiş siparişlerdeki kayıtlar korunur.", durum: "Ürünün durumu güncellendi." }} />
      {azStok.length > 0 && (
        <p className="y-note">
          <b>Stoğu azalan ürünler:</b> {azStok.map((u, i) => (
            <span key={u.id}>{i > 0 && ", "}<Link href={`/yonetim/urunler/${u.id}`}>{u.ad}</Link> ({u.stok})</span>
          ))}
        </p>
      )}
      <form className="y-row" role="search" aria-label="Ürün ara">
        <input className="y-inp" name="q" defaultValue={tek("q")} placeholder="Ürün adı veya etiket" style={{ flex: "1 1 240px", width: "auto" }} aria-label="Ara" />
        <select className="y-inp" name="kategori" defaultValue={kat} style={{ width: "auto" }} aria-label="Kategori">
          <option value="">Tüm kategoriler</option>
          {kats.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
          <option value="yok">Kategorisiz</option>
        </select>
        <select className="y-inp" name="durum" defaultValue={durum} style={{ width: "auto" }} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          <option value="yayinda">Yayında</option>
          <option value="taslak">Taslak</option>
          <option value="gizli">Gizli</option>
        </select>
        <button className="y-btn">Filtrele</button>
        {(q || kat || durum) && <Link className="y-btn y-gh" href="/yonetim/urunler">Temizle</Link>}
      </form>
      <div className="y-box">
        <table>
          <thead>
            <tr><th>Ürün</th><th>Kategori</th><th className="y-r">Fiyat</th><th className="y-r">Stok</th><th>Durum</th><th><span className="y-gizli">İşlem</span></th></tr>
          </thead>
          <tbody>
            {goster.map((u) => {
              const [dAd, dSinif] = DURUM[u.durum];
              return (
                <tr key={u.id}>
                  <td>
                    <Link href={`/yonetim/urunler/${u.id}`} className="y-urun">
                      {u.gorseller[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.gorseller[0].yol} alt="" width={44} height={44} />
                      ) : (
                        <span className="y-ph" style={{ background: u.renk }} aria-hidden="true" />
                      )}
                      <span>
                        <b>{u.ad}</b>
                        <span className="y-sm y-mut" style={{ display: "block" }}>{u.kisisellestirme.length ? "Kişiye özel · " : ""}{u.secenekler.length ? `${u.secenekler.length} seçenek` : "Seçeneksiz"}</span>
                      </span>
                    </Link>
                  </td>
                  <td>{u.kategoriId ? katAd[u.kategoriId] ?? "—" : <span className="y-b y-b-sari">Kategorisiz</span>}</td>
                  <td className="y-r y-num y-nw">
                    {para(satisFiyati(u))}
                    {u.indirimliFiyat && u.indirimliFiyat < u.fiyat && <span className="y-sm y-mut" style={{ display: "block", textDecoration: "line-through" }}>{para(u.fiyat)}</span>}
                  </td>
                  <td className="y-r y-num">{u.stokTipi === "adet" ? <span style={{ color: u.stok <= 3 ? "#B91C1C" : undefined, fontWeight: u.stok <= 3 ? 700 : undefined }}>{u.stok}</span> : <span className="y-sm y-mut">Siparişe üretim</span>}</td>
                  <td><span className={`y-b ${dSinif}`}>{dAd}</span></td>
                  <td className="y-nw">
                    <form action={urunDurumDegistir} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="geri" value={geri} />
                      <input type="hidden" name="durum" value={u.durum === "yayinda" ? "gizli" : "yayinda"} />
                      <button className="y-btn y-s y-gh">{u.durum === "yayinda" ? "Gizle" : "Yayına al"}</button>
                    </form>
                    <Link className="y-btn y-s" href={`/yonetim/urunler/${u.id}`}>Düzenle</Link>
                  </td>
                </tr>
              );
            })}
            {goster.length === 0 && (
              <tr><td colSpan={6} className="y-mut" style={{ padding: 24, textAlign: "center" }}>Bu filtrelere uyan ürün yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
