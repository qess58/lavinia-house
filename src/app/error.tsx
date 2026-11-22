"use client";

import Link from "next/link";
import { useEffect } from "react";

// Beklenmeyen bir sunucu / sayfa hatasında gösterilen sayfa.
export default function Hata({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" }}>
      <div style={{ maxWidth: 520, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        <h1 style={{ fontSize: "clamp(26px, 3vw, 34px)" }}>Bir şeyler ters gitti</h1>
        <p className="mut">Sayfa yüklenirken bir sorun oluştu. Sepetiniz kaybolmadı. Lütfen tekrar deneyin; sorun sürerse WhatsApp’tan bize yazın.</p>
        {error.digest && <p className="xs mut">Hata kodu: {error.digest}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn pri" onClick={() => reset()}>Tekrar dene</button>
          <Link className="btn" href="/">Ana sayfaya dön</Link>
        </div>
      </div>
    </main>
  );
}
