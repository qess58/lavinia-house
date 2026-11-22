"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OnayDurumu } from "@/lib/tipler";
import { TikIkon } from "./Ikonlar";

export function OnayPaneli({ no, token, durum, not }: { no: number; token: string; durum: OnayDurumu; not: string | null }) {
  const router = useRouter();
  const [yaziyor, setYaziyor] = useState(false);
  const [metin, setMetin] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);

  const gonder = async (karar: "onay" | "duzeltme") => {
    if (karar === "duzeltme" && metin.trim().length < 3) {
      setHata("Lütfen istediğiniz değişikliği yazın.");
      return;
    }
    setBekle(true);
    setHata("");
    const r = await fetch(`/api/siparis/${no}/onay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, karar, not: metin }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { hata?: string } | null;
    setBekle(false);
    if (r?.ok) router.refresh();
    else setHata(d?.hata ?? "Bağlantı sorunu oluştu, tekrar deneyin.");
  };

  if (durum === "onaylandi")
    return (
      <div className="basari">
        <span style={{ flex: "0 0 auto" }}><TikIkon boyut={30} /></span>
        <div><p style={{ fontWeight: 700, fontSize: 17 }}>Teşekkürler, tasarımı onayladınız.</p><p style={{ color: "#3F4542" }}>Siparişiniz üretimde. Kargo takip numarası e-postanıza gelecek.</p></div>
      </div>
    );

  if (durum === "duzeltme")
    return (
      <div className="uyari" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 17 }}>Notunuz ustamıza iletildi.</p>
        <p style={{ color: "#3F4542" }}>Güncellenmiş tasarım en geç 1 iş günü içinde e-postanıza ve bu sayfaya gelir.</p>
        {not && <p className="sm" style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}><b>Notunuz:</b> {not}</p>}
      </div>
    );

  return (
    <>
      <div style={{ background: "#FAF9F7", borderRadius: 16, padding: "16px 18px" }}>
        <p style={{ fontWeight: 700 }}>Onaylamadan önce kontrol edin</p>
        <p className="sm mut">İsimlerin yazımı, Türkçe karakterler ve ölçü doğru mu? Onayladıktan sonra üretime başlarız ve değişiklik yapılamaz.</p>
      </div>
      {!yaziyor ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn pri" style={{ flex: "1 1 240px", minHeight: 58, fontSize: 17 }} disabled={bekle} onClick={() => gonder("onay")}>
            Tasarımı onaylıyorum
          </button>
          <button className="btn" style={{ flex: "1 1 200px", minHeight: 58 }} onClick={() => setYaziyor(true)}>
            Düzeltme istiyorum
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #E7E4DE", paddingTop: 18 }}>
          <label className="lbl" htmlFor="dz-n" style={{ margin: 0 }}>Neyi değiştirelim?</label>
          <textarea id="dz-n" className={`inp ${hata ? "bad" : ""}`} value={metin} onChange={(e) => { setMetin(e.target.value); setHata(""); }} placeholder="Örn. “Ailesi” yazısı biraz daha büyük olsun." />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn dk" disabled={bekle} onClick={() => gonder("duzeltme")}>Düzeltme notunu gönder</button>
            <button className="btn gh" onClick={() => setYaziyor(false)}>Vazgeç</button>
          </div>
        </div>
      )}
      {hata && <p className="err" role="alert">{hata}</p>}
    </>
  );
}
