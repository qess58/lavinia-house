"use client";

import Link from "next/link";
import { useFavoriler, useSepet } from "./Saglayicilar";
import { UrunKarti, type KartUrunu } from "./UrunKarti";

export function UrunIzgarasi({ urunler, favoriModu = false }: { urunler: KartUrunu[]; favoriModu?: boolean }) {
  const { favoriler } = useFavoriler();
  const { hazir } = useSepet();
  const liste = favoriModu ? urunler.filter((u) => favoriler.includes(u.id)) : urunler;

  if (favoriModu && hazir && liste.length === 0)
    return (
      <div className="card" style={{ alignItems: "center", textAlign: "center", padding: "48px 24px" }}>
        <h2 style={{ fontSize: 22 }}>Henüz favoriniz yok</h2>
        <p className="mut">Beğendiğiniz ürünlerdeki kalp simgesine dokunun, burada toplansın.</p>
        <Link className="btn pri" href="/urunler">Ürünlere göz atın</Link>
      </div>
    );

  if (liste.length === 0)
    return (
      <div className="card" style={{ alignItems: "center", textAlign: "center", padding: "48px 24px" }}>
        <h2 style={{ fontSize: 22 }}>Bu seçimlere uyan ürün yok</h2>
        <p className="mut">Filtrelerden birini kaldırmayı deneyin ya da aradığınızı bize anlatın.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn" href="/urunler">Filtreleri temizle</Link>
          <Link className="btn pri" href="/teklif">Aradığınızı biz üretelim</Link>
        </div>
      </div>
    );

  return (
    <div className="pgrid">
      {liste.map((u) => (
        <UrunKarti key={u.id} u={u} />
      ))}
    </div>
  );
}
