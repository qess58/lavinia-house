import Link from "next/link";
import { AramaKutusu } from "./AramaKutusu";
import { SepetRozeti } from "./SepetRozeti";
import { KalpIkon, KisiIkon, MesajIkon, OkAsagi } from "./Ikonlar";

export type MenuKategorisi = { slug: string; ad: string };

export function Logo({ boyut = 44, altYazi = true }: { boyut?: number; altYazi?: boolean }) {
  return (
    <Link className="logo" href="/" aria-label="Lavinia House ana sayfa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lm" src="/logo.png" alt="" width={boyut} height={boyut} style={{ width: boyut, height: boyut }} />
      <span>
        <span className="ln">Lavinia House</span>
        {altYazi && <span className="ls">Mekanik ahşap modeller ve kişiye özel ürünler</span>}
      </span>
    </Link>
  );
}

export function UstBilgi({ bant, kategoriler, satis }: { bant: string; kategoriler: MenuKategorisi[]; satis: boolean }) {
  const menu = [
    ...kategoriler.map((k) => ({ href: `/urunler?kategori=${k.slug}`, ad: k.ad })),
    { href: "/teklif?tur=kurumsal", ad: "Kurumsal" },
  ];
  return (
    <>
      {bant && (
        <div className="band">
          {bant} · {satis ? <Link href="/urunler">Alışverişe başla</Link> : <Link href="/teklif">Teklif al</Link>}
        </div>
      )}
      <header className="hdr">
        <div className="wrap hrow">
          <Logo />
          <AramaKutusu />
          <nav className="ico" aria-label="Hesap ve sepet">
            {satis && (
              <Link className="ib" href="/siparis">
                <KisiIkon />
                <span className="l2">Siparişim</span>
              </Link>
            )}
            <Link className="ib" href="/urunler?favori=1">
              <KalpIkon />
              <span className="l2">Favoriler</span>
            </Link>
            {satis ? (
              <SepetRozeti />
            ) : (
              <Link className="ib" href="/teklif">
                <MesajIkon />
                <span className="l2">Teklif al</span>
              </Link>
            )}
          </nav>
        </div>
        <nav className="wrap nav" aria-label="Kategoriler">
          <div className="mm">
            <Link className="nl" href="/urunler" aria-haspopup="true">
              Tüm ürünler <OkAsagi />
            </Link>
            <div className="mmp">
              <div>
                <b>Kategoriler</b>
                {kategoriler.map((k) => (
                  <Link key={k.slug} href={`/urunler?kategori=${k.slug}`}>{k.ad}</Link>
                ))}
                <Link href="/urunler">Tüm ürünler</Link>
              </div>
              <div>
                <b>Hızlı bulun</b>
                <Link href="/urunler?ozellik=kisisel">Yazı eklenebilen ürünler</Link>
                <Link href="/urunler?ozellik=set">Yapım setleri (kendin kur)</Link>
                <Link href="/urunler?ozellik=hizli">1–2 günde hazır</Link>
                <Link href="/urunler?ozellik=indirim">İndirimdekiler</Link>
              </div>
              <div>
                <b>Size özel üretim</b>
                <Link href="/kendin-tasarla">Kendin tasarla</Link>
                <Link href="/teklif">Dosyanı yükle, teklif al</Link>
                <Link href="/teklif?tur=kurumsal">Kurumsal ve toplu sipariş</Link>
              </div>
            </div>
          </div>
          {menu.map((m) => (
            <Link key={m.href} className="nl" href={m.href}>
              {m.ad}
            </Link>
          ))}
          <Link className="nl hl" href="/kendin-tasarla">
            Kendin Tasarla
          </Link>
          <Link className="nl" href="/teklif">
            Dosyanı Yükle
          </Link>
        </nav>
        <details className="mob wrap" style={{ paddingBottom: 12 }}>
          <summary className="chip" style={{ width: "100%" }}>
            Menü ve kategoriler
          </summary>
          <div style={{ display: "flex", flexDirection: "column", paddingTop: 8 }}>
            <Link className="nl" href="/urunler">Tüm ürünler</Link>
            {menu.map((m) => (
              <Link key={m.href} className="nl" href={m.href}>
                {m.ad}
              </Link>
            ))}
            <Link className="nl hl" href="/kendin-tasarla">Kendin Tasarla</Link>
            <Link className="nl" href="/teklif">Dosyanı Yükle</Link>
            {satis && <Link className="nl" href="/siparis">Sipariş takibi</Link>}
          </div>
        </details>
      </header>
    </>
  );
}
