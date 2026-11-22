"use client";

import { useEffect, useState } from "react";
import type { Gorsel } from "@/lib/tipler";

/**
 * Ana sayfanın üst bölümündeki fotoğraflar. Birden çok fotoğraf varsa belirlenen aralıkla yumuşak geçişle değişir.
 * Fare üzerindeyken, sekme arka plandayken ya da ziyaretçi "hareketi azalt" ayarını açmışsa durur; durdur/oynat düğmesi vardır.
 */
export function AnaSlayt({ gorseller, sure }: { gorseller: Gorsel[]; sure: number }) {
  const [sira, setSira] = useState(0);
  const [ustunde, setUstunde] = useState(false);
  const [durduruldu, setDurduruldu] = useState(false);
  const [azHareket, setAzHareket] = useState(false);
  const coklu = gorseller.length > 1;

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAzHareket(m.matches);
    const d = () => setAzHareket(m.matches);
    m.addEventListener("change", d);
    return () => m.removeEventListener("change", d);
  }, []);

  useEffect(() => {
    if (!coklu || ustunde || durduruldu || azHareket) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") setSira((s) => (s + 1) % gorseller.length);
    }, Math.max(3, sure) * 1000);
    return () => window.clearInterval(t);
  }, [coklu, ustunde, durduruldu, azHareket, sure, gorseller.length]);

  if (!gorseller.length)
    return (
      <div className="slayt bos">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-512.png" alt="" />
      </div>
    );

  const oynuyor = coklu && !durduruldu && !azHareket;
  return (
    <div
      className="slayt"
      role="region"
      aria-roledescription="slayt gösterisi"
      aria-label="Lavinia House fotoğrafları"
      onMouseEnter={() => setUstunde(true)}
      onMouseLeave={() => setUstunde(false)}
      onFocus={() => setUstunde(true)}
      onBlur={() => setUstunde(false)}
    >
      {gorseller.map((g, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={g.yol}
          src={g.yol}
          alt={g.alt}
          className={i === sira ? "on" : undefined}
          aria-hidden={i !== sira}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          decoding="async"
        />
      ))}
      {coklu && (
        <div className="slayt-alt">
          {gorseller.map((g, i) => (
            <button key={g.yol} type="button" className="nk" aria-label={`${i + 1}. fotoğraf`} aria-current={i === sira} onClick={() => setSira(i)} />
          ))}
          {!azHareket && (
            <button type="button" className="dur" onClick={() => setDurduruldu((d) => !d)} aria-label={oynuyor ? "Slaytı durdur" : "Slaytı oynat"}>
              {oynuyor ? (
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
              ) : (
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
