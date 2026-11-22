"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Her sayfa açılışında sunucuya kısa bir bildirim gönderir. Çerez kullanmaz. Yönetim panelini açmış tarayıcılar sayılmaz. */
export function ZiyaretSayaci() {
  const yol = usePathname();
  useEffect(() => {
    try {
      if (localStorage.getItem("lh-yonetici") === "1") return;
    } catch {}
    let ilk = false;
    try {
      ilk = !sessionStorage.getItem("lh-sayac");
      sessionStorage.setItem("lh-sayac", "1");
    } catch {}
    const p = new URLSearchParams(location.search);
    const govde = JSON.stringify({ yol, ref: ilk ? document.referrer : "", utm: ilk ? p.get("utm_source") ?? p.get("kaynak") ?? "" : "" });
    const blob = new Blob([govde], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/ziyaret", blob)) fetch("/api/ziyaret", { method: "POST", body: govde, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [yol]);
  return null;
}
