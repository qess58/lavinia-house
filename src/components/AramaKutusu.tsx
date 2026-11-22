"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AraIkon } from "./Ikonlar";

type Sonuc = { ad: string; tur: string; href: string };
const POPULER: Sonuc[] = ["isimlik", "mekanik saat", "düğün", "kesme tahtası"].map((q) => ({ ad: q, tur: "Popüler arama", href: `/urunler?q=${encodeURIComponent(q)}` }));

export function AramaKutusu() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [acik, setAcik] = useState(false);
  const [sonuclar, setSonuclar] = useState<Sonuc[]>([]);
  const kapat = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setSonuclar([]);
      return;
    }
    const kontrol = new AbortController();
    const z = setTimeout(() => {
      fetch(`/api/ara?q=${encodeURIComponent(t)}`, { signal: kontrol.signal })
        .then((r) => r.json())
        .then((d: { sonuclar: Sonuc[] }) => setSonuclar(d.sonuclar))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(z);
      kontrol.abort();
    };
  }, [q]);

  const liste = q.trim().length >= 2 ? sonuclar : POPULER;
  const ara = () => {
    setAcik(false);
    router.push(q.trim() ? `/urunler?q=${encodeURIComponent(q.trim())}` : "/urunler");
  };

  return (
    <form
      className="srch"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        ara();
      }}
    >
      <label className="vh" htmlFor="hq">
        Ürün ara
      </label>
      <input
        id="hq"
        type="search"
        placeholder="Ne arıyorsunuz? Örn. isimlik, saat, harita"
        value={q}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setAcik(true);
        }}
        onFocus={() => {
          if (kapat.current) clearTimeout(kapat.current);
          setAcik(true);
        }}
        onBlur={() => {
          kapat.current = setTimeout(() => setAcik(false), 200);
        }}
        onKeyDown={(e) => e.key === "Escape" && setAcik(false)}
      />
      <button className="go" type="submit" aria-label="Ara">
        <AraIkon />
      </button>
      {acik && (
        <div className="sugg">
          <p className="xs mut" style={{ padding: "6px 14px", fontWeight: 600 }}>
            {q.trim().length >= 2 ? "Sonuçlar" : "Popüler aramalar"}
          </p>
          {liste.map((o) => (
            <Link key={o.href + o.ad} href={o.href} onClick={() => setAcik(false)}>
              <span>{o.ad}</span>
              <span className="sm mut">{o.tur}</span>
            </Link>
          ))}
          {q.trim().length >= 2 && liste.length === 0 && (
            <p className="sm" style={{ padding: "10px 14px" }}>
              Sonuç bulunamadı. <Link href="/teklif">Aradığınızı biz üretelim</Link>
            </p>
          )}
        </div>
      )}
    </form>
  );
}
