"use client";

import { useState } from "react";
import { para } from "@/lib/bicim";

type Yorum = { id: number; ad: string; puan: number; metin: string; yanit: string | null; ornek: boolean };
type Props = {
  aciklama: string;
  olculer: string;
  bakim: string;
  kisisel: boolean;
  yorumlar: Yorum[];
  puan: number | null;
  kargoUcreti: number;
  ucretsizKargoLimiti: number;
};

export function UrunSekmeleri({ aciklama, olculer, bakim, kisisel, yorumlar, puan, kargoUcreti, ucretsizKargoLimiti }: Props) {
  const sekmeler = [
    { k: "aciklama", ad: "Açıklama" },
    ...(olculer || bakim ? [{ k: "olcu", ad: "Ölçüler ve bakım" }] : []),
    { k: "yorum", ad: `Değerlendirmeler (${yorumlar.length})` },
    { k: "kargo", ad: "Kargo ve iade" },
  ];
  const [aktif, setAktif] = useState("aciklama");
  const dagilim = [5, 4, 3, 2, 1].map((y) => ({ y, n: yorumlar.filter((x) => x.puan === y).length }));

  return (
    <section style={{ paddingTop: 64 }} aria-label="Ürün bilgileri" id="bilgi">
      <div className="tabs" role="tablist">
        {sekmeler.map((s) => (
          <button key={s.k} className={`tab ${aktif === s.k ? "on" : ""}`} role="tab" aria-selected={aktif === s.k} onClick={() => setAktif(s.k)}>
            {s.ad}
          </button>
        ))}
      </div>
      <div style={{ padding: "28px 0", maxWidth: 860 }} role="tabpanel">
        {aktif === "aciklama" && (
          <div className="prose">
            {aciklama.split("\n\n").map((p, i) =>
              p.trim().startsWith("•") ? (
                <ul key={i} style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.split("\n").map((l) => <li key={l}>{l.replace(/^•\s*/, "")}</li>)}
                </ul>
              ) : (
                <p key={i}>{p}</p>
              ),
            )}
          </div>
        )}
        {aktif === "olcu" && (
          <div className="prose">
            {olculer && <p><b>Ölçüler:</b> {olculer}</p>}
            {bakim && <p><b>Bakım:</b> {bakim}</p>}
          </div>
        )}
        {aktif === "yorum" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {puan === null ? (
              <p className="mut">Bu ürün için henüz değerlendirme yok. Ürünü teslim aldıktan sonra size değerlendirme bağlantısı gönderiyoruz.</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <p className="hd num" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{String(puan).replace(".", ",")}</p>
                    <p className="st" aria-hidden="true">★★★★★</p>
                    <p className="sm mut">{yorumlar.length} değerlendirme</p>
                  </div>
                  <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {dagilim.map((d) => (
                      <div key={d.y} style={{ display: "flex", gap: 10, alignItems: "center" }} className="sm">
                        <span style={{ width: 60 }}>{d.y} yıldız</span>
                        <span className="bar mor" style={{ flex: 1 }}><i style={{ width: `${Math.round((d.n / yorumlar.length) * 100)}%` }} /></span>
                        <span className="mut num" style={{ width: 30, textAlign: "right" }}>{d.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {yorumlar.map((y) => (
                  <div className="card" key={y.id}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="st" aria-label={`5 üzerinden ${y.puan} puan`}>{"★".repeat(y.puan)}</span>
                      {y.ornek && <span className="pill">Örnek yorum</span>}
                    </div>
                    <p>{y.metin}</p>
                    <p className="sm mut">{y.ad}</p>
                    {y.yanit && <p className="sm" style={{ background: "#FAF9F7", borderRadius: 10, padding: "10px 12px" }}><b>Lavinia House yanıtı:</b> {y.yanit}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {aktif === "kargo" && (
          <div className="prose">
            <p><b>Kargo:</b> {para(ucretsizKargoLimiti)} ve üzeri siparişlerde ücretsiz, altında {para(kargoUcreti)}. Takip numarası e-postanıza gelir.</p>
            {kisisel ? (
              <>
                <p><b>İade:</b> Kişiye özel üretilen ürünlerde cayma hakkı yoktur. Üretim hatası veya kargo hasarında ürünü ücretsiz yeniden üretiriz.</p>
                <p><b>Değişiklik:</b> Tasarımı onaylamadan önce istediğiniz kadar düzeltme isteyebilirsiniz.</p>
              </>
            ) : (
              <p><b>İade:</b> Teslimattan sonra 14 gün içinde, kullanılmamış ürünü iade edebilirsiniz.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
