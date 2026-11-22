"use client";

import { useState } from "react";
import { UrunKarti, type KartUrunu } from "./UrunKarti";

export function OneCikanlar({ sekmeler }: { sekmeler: { ad: string; liste: KartUrunu[] }[] }) {
  const [aktif, setAktif] = useState(0);
  return (
    <>
      <div className="shd">
        <h2 id="h-urun">Öne çıkanlar</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="tablist" aria-label="Ürün listesi">
          {sekmeler.map((s, i) => (
            <button key={s.ad} className={`chip ${i === aktif ? "on" : ""}`} role="tab" aria-selected={i === aktif} onClick={() => setAktif(i)}>
              {s.ad}
            </button>
          ))}
        </div>
      </div>
      <div className="grid g4" role="tabpanel">
        {sekmeler[aktif].liste.map((u) => (
          <UrunKarti key={u.id} u={u} />
        ))}
      </div>
    </>
  );
}
