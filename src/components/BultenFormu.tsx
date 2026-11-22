"use client";

import { useState } from "react";
import { useBildirim } from "./Saglayicilar";

export function BultenFormu() {
  const [eposta, setEposta] = useState("");
  const [izin, setIzin] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const bildir = useBildirim();
  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 360px", maxWidth: 480 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!izin) return bildir({ mesaj: "Abone olmak için e-posta izni kutusunu işaretleyin." });
        setGonderiliyor(true);
        const r = await fetch("/api/bulten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eposta, izin }) }).catch(() => null);
        setGonderiliyor(false);
        const d = (await r?.json().catch(() => null)) as { hata?: string } | null;
        if (r?.ok) {
          setEposta("");
          setIzin(false);
          bildir({ mesaj: "Teşekkürler! Bültene abone oldunuz." });
        } else bildir({ mesaj: d?.hata ?? "Şu an abone olunamadı, lütfen tekrar deneyin." });
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <label className="vh" htmlFor="nl-e">
          E-posta adresiniz
        </label>
        <input id="nl-e" className="inp" type="email" required placeholder="E-posta adresiniz" value={eposta} onChange={(e) => setEposta(e.target.value)} style={{ borderColor: "#4A504D", background: "#262A28", color: "#fff" }} />
        <button className="btn pri" disabled={gonderiliyor}>
          Abone ol
        </button>
      </div>
      <label className="xs" style={{ color: "#C9CFCB", display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
        <input type="checkbox" checked={izin} onChange={(e) => setIzin(e.target.checked)} style={{ marginTop: 2, accentColor: "#7C5CC4" }} />
        <span>
          Yeni ürün, kampanya ve indirim duyurularının e-postama gönderilmesine izin veriyorum. <a href="/bilgi/kvkk" style={{ color: "#C9CFCB" }}>KVKK Aydınlatma Metni</a>
        </span>
      </label>
    </form>
  );
}
