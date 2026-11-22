"use client";

import Link from "next/link";
import { para } from "@/lib/bicim";
import type { UrunKartVerisi } from "@/lib/veri";
import { useBildirim, useFavoriler, useSepet } from "./Saglayicilar";
import { KalpIkon } from "./Ikonlar";
import { useMagazaModu } from "./MagazaModu";

export type KartUrunu = Pick<
  UrunKartVerisi,
  "id" | "slug" | "ad" | "fiyat" | "indirimliFiyat" | "satis" | "rozet" | "renk" | "gorsel" | "malzeme" | "puan" | "yorumSayisi" | "kisisel" | "secenekVar" | "stokYok" | "kargoYazi" | "ucretsizKargo"
>;

/** Etsy tarzı sade ürün kartı: görsel, başlık, puan, fiyat ve kısa etiketler. Kartın tamamı ürüne gider. */
export function UrunKarti({ u }: { u: KartUrunu }) {
  const { favoriler, degistir } = useFavoriler();
  const sepet = useSepet();
  const bildir = useBildirim();
  const mod = useMagazaModu();
  const fav = favoriler.includes(u.id);
  const indirimde = !!u.indirimliFiyat && u.indirimliFiyat < u.fiyat;
  const yuzde = indirimde ? Math.round((1 - u.indirimliFiyat! / u.fiyat) * 100) : 0;
  const dogrudanEklenir = !u.kisisel && !u.secenekVar && !u.stokYok;
  const href = `/urun/${u.slug}`;

  return (
    <div className="pc">
      <div className="im ph" style={{ background: u.renk }}>
        <Link className="im-a" href={href} tabIndex={-1} aria-hidden="true">
          {u.gorsel ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.gorsel.yol} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="xs">Ürün fotoğrafı</span>
          )}
        </Link>
        {u.rozet && <span className="tag">{u.rozet}</span>}
        <button
          className={`fav ${fav ? "on" : ""}`}
          aria-label={`${u.ad}: ${fav ? "favorilerden çıkar" : "favorilere ekle"}`}
          aria-pressed={fav}
          onClick={() => bildir({ mesaj: degistir(u.id) ? "Favorilere eklendi." : "Favorilerden çıkarıldı." })}
        >
          <KalpIkon boyut={20} dolu={fav} />
        </button>
      </div>
      <Link className="t" href={href}>
        {u.ad}
      </Link>
      {u.puan !== null && (
        <div className="rt" aria-label={`5 üzerinden ${String(u.puan).replace(".", ",")} puan, ${u.yorumSayisi} değerlendirme`}>
          <span className="st" aria-hidden="true">★</span>
          <b aria-hidden="true">{String(u.puan).replace(".", ",")}</b>
          <span aria-hidden="true">({u.yorumSayisi})</span>
        </div>
      )}
      {mod.fiyat ? (
        <div className="fy">
          <span className="pr">{para(u.satis)}</span>
          {indirimde && (
            <>
              <span className="old">{para(u.fiyat)}</span>
              <span className="ind">%{yuzde} indirim</span>
            </>
          )}
        </div>
      ) : (
        <div className="fy"><span className="sm" style={{ fontWeight: 600, color: "#4A2E85" }}>Fiyat için bize ulaşın</span></div>
      )}
      <div className="etk">
        {u.stokYok ? (
          <span className="stok-yok xs">Şu an tükendi</span>
        ) : (
          <>
            {mod.satis && u.ucretsizKargo && <span className="pill yes">Ücretsiz kargo</span>}
            {u.kisisel && <span className="pill">Kişiye özel</span>}
          </>
        )}
      </div>
      {mod.satis && dogrudanEklenir && (
        <button
          className="btn s ekle"
          onClick={() => {
            sepet.ekle({ tur: "urun", urunId: u.id, slug: u.slug, ad: u.ad, secim: {}, kisi: {}, ozet: "", birimFiyat: u.satis, adet: 1, renk: u.renk, kisisel: false });
            bildir({ mesaj: `${u.ad} sepete eklendi.`, link: { href: "/sepet", yazi: "Sepete git →" } });
          }}
        >
          + Sepete ekle
        </button>
      )}
    </div>
  );
}
