"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiparisSorgu() {
  const router = useRouter();
  const [no, setNo] = useState("");
  const [eposta, setEposta] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setHata("");
        setBekle(true);
        const r = await fetch("/api/siparis/bul", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ no, eposta }) }).catch(() => null);
        const d = (await r?.json().catch(() => null)) as { no?: number; token?: string; hata?: string } | null;
        setBekle(false);
        if (r?.ok && d?.no && d.token) router.push(`/siparis/${d.no}?t=${encodeURIComponent(d.token)}`);
        else setHata(d?.hata ?? "Bağlantı sorunu oluştu, tekrar deneyin.");
      }}
    >
      <div className="fg2">
        <div><label className="lbl" htmlFor="q-no">Sipariş numarası</label><input id="q-no" className="inp" inputMode="numeric" required placeholder="Örn. 1052" value={no} onChange={(e) => setNo(e.target.value)} /></div>
        <div><label className="lbl" htmlFor="q-ep">E-posta</label><input id="q-ep" className="inp" type="email" required autoComplete="email" value={eposta} onChange={(e) => setEposta(e.target.value)} /></div>
      </div>
      {hata && <p className="err" role="alert">{hata}</p>}
      <button className="btn dk" style={{ alignSelf: "flex-start" }} disabled={bekle}>{bekle ? "Aranıyor…" : "Siparişi bul"}</button>
    </form>
  );
}
