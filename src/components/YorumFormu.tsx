"use client";

import { useState } from "react";

type Urun = { id: number; ad: string; yapildi: boolean };

/** Teslim edilen siparişte ürün değerlendirme formu. */
export function YorumFormu({ no, token, urunler, varsayilanAd }: { no: number; token: string; urunler: Urun[]; varsayilanAd: string }) {
  const [gonderilen, setGonderilen] = useState<number[]>(urunler.filter((u) => u.yapildi).map((u) => u.id));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {urunler.map((u) =>
        gonderilen.includes(u.id) ? (
          <p key={u.id} className="sm" style={{ fontWeight: 600 }}>✓ {u.ad}: değerlendirmeniz alındı, teşekkürler!</p>
        ) : (
          <Tek key={u.id} no={no} token={token} urun={u} varsayilanAd={varsayilanAd} bitti={() => setGonderilen((x) => [...x, u.id])} />
        ),
      )}
    </div>
  );
}

function Tek({ no, token, urun, varsayilanAd, bitti }: { no: number; token: string; urun: Urun; varsayilanAd: string; bitti: () => void }) {
  const [puan, setPuan] = useState(0);
  const [metin, setMetin] = useState("");
  const [ad, setAd] = useState(varsayilanAd);
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puan) return setHata("Puan seçin.");
    setBekle(true);
    setHata("");
    const r = await fetch("/api/yorum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ no, token, urunId: urun.id, puan, metin, ad }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { hata?: string } | null;
    setBekle(false);
    if (r?.ok) bitti();
    else setHata(d?.hata ?? "Bağlantı sorunu, tekrar deneyin.");
  };
  return (
    <form onSubmit={gonder} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid #E7E4DE", paddingTop: 14 }}>
      <p style={{ fontWeight: 700 }}>{urun.ad}</p>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 4 }}>
        <legend className="sm" style={{ marginBottom: 4 }}>Puanınız</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setPuan(n)} aria-pressed={puan === n} aria-label={`${n} yıldız`} style={{ fontSize: 28, lineHeight: 1, background: "none", border: 0, cursor: "pointer", color: n <= puan ? "#C58A10" : "#CFCBC3", padding: "2px 3px" }}>★</button>
        ))}
      </fieldset>
      <label className="lbl" htmlFor={`y-m-${urun.id}`}>Yorumunuz</label>
      <textarea id={`y-m-${urun.id}`} className="inp" rows={3} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder="Ürün beklentinizi karşıladı mı? Hediye ettiyseniz nasıl karşılandı?" />
      <label className="lbl" htmlFor={`y-a-${urun.id}`}>Görünecek adınız</label>
      <input id={`y-a-${urun.id}`} className="inp" value={ad} onChange={(e) => setAd(e.target.value)} style={{ maxWidth: 280 }} />
      {hata && <p className="err" role="alert">{hata}</p>}
      <div><button className="btn pri s" disabled={bekle}>{bekle ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}</button></div>
    </form>
  );
}
