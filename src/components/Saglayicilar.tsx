"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SepetKalemi, YeniSepetKalemi } from "@/lib/tipler";

/* ---------------- Sepet (tarayıcıda saklanır) ---------------- */

type SepetBaglami = {
  hazir: boolean;
  kalemler: SepetKalemi[];
  adet: number;
  araToplam: number;
  ekle: (k: YeniSepetKalemi) => void;
  adetDegistir: (anahtar: string, adet: number) => void;
  sil: (anahtar: string) => void;
  temizle: () => void;
};

const SepetCtx = createContext<SepetBaglami | null>(null);
const SEPET_ANAHTARI = "lh-sepet-v1";

export function useSepet() {
  const c = useContext(SepetCtx);
  if (!c) throw new Error("useSepet, Saglayicilar içinde kullanılmalı");
  return c;
}

/* ---------------- Bildirim (alt ortada kısa mesaj) ---------------- */

type Bildirim = { mesaj: string; link?: { href: string; yazi: string } };
const BildirimCtx = createContext<(b: Bildirim) => void>(() => {});
export const useBildirim = () => useContext(BildirimCtx);

/* ---------------- Favoriler ---------------- */

const FavoriCtx = createContext<{ favoriler: number[]; degistir: (id: number) => boolean }>({ favoriler: [], degistir: () => false });
export const useFavoriler = () => useContext(FavoriCtx);
const FAVORI_ANAHTARI = "lh-favori-v1";

function oku<T>(anahtar: string, yedek: T): T {
  try {
    const v = localStorage.getItem(anahtar);
    return v ? (JSON.parse(v) as T) : yedek;
  } catch {
    return yedek;
  }
}
function yaz(anahtar: string, deger: unknown) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
  } catch {
    /* gizli sekme vb. */
  }
}

export function Saglayicilar({ children }: { children: ReactNode }) {
  const [kalemler, setKalemler] = useState<SepetKalemi[]>([]);
  const [favoriler, setFavoriler] = useState<number[]>([]);
  const [hazir, setHazir] = useState(false);
  const [bildirim, setBildirim] = useState<Bildirim | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKalemler(oku<SepetKalemi[]>(SEPET_ANAHTARI, []));
    setFavoriler(oku<number[]>(FAVORI_ANAHTARI, []));
    setHazir(true);
    const dinle = (e: StorageEvent) => {
      if (e.key === SEPET_ANAHTARI) setKalemler(oku<SepetKalemi[]>(SEPET_ANAHTARI, []));
    };
    window.addEventListener("storage", dinle);
    return () => window.removeEventListener("storage", dinle);
  }, []);

  const guncelle = useCallback((f: (k: SepetKalemi[]) => SepetKalemi[]) => {
    setKalemler((eski) => {
      const yeni = f(eski);
      yaz(SEPET_ANAHTARI, yeni);
      return yeni;
    });
  }, []);

  const goster = useCallback((b: Bildirim) => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setBildirim(b);
    zamanlayici.current = setTimeout(() => setBildirim(null), 4000);
  }, []);

  const sepet = useMemo<SepetBaglami>(
    () => ({
      hazir,
      kalemler,
      adet: kalemler.reduce((t, k) => t + k.adet, 0),
      araToplam: kalemler.reduce((t, k) => t + k.birimFiyat * k.adet, 0),
      ekle: (k) =>
        guncelle((eski) => {
          // Aynı ürün ve aynı seçimler sepette varsa adedi artır
          const imza = JSON.stringify(k.tur === "urun" ? [k.urunId, k.secim, k.kisi] : [k.studyo]);
          const var_ = eski.find((x) => JSON.stringify(x.tur === "urun" ? [x.urunId, x.secim, x.kisi] : [x.studyo]) === imza);
          if (var_) return eski.map((x) => (x === var_ ? { ...x, adet: x.adet + k.adet } : x));
          return [...eski, { ...k, anahtar: Math.random().toString(36).slice(2, 10) } as SepetKalemi];
        }),
      adetDegistir: (anahtar, adet) => guncelle((eski) => eski.map((x) => (x.anahtar === anahtar ? { ...x, adet: Math.max(1, Math.min(500, adet)) } : x))),
      sil: (anahtar) => guncelle((eski) => eski.filter((x) => x.anahtar !== anahtar)),
      temizle: () => guncelle(() => []),
    }),
    [hazir, kalemler, guncelle],
  );

  const favori = useMemo(
    () => ({
      favoriler,
      degistir: (id: number) => {
        const eklendi = !favoriler.includes(id);
        const yeni = eklendi ? [...favoriler, id] : favoriler.filter((x) => x !== id);
        yaz(FAVORI_ANAHTARI, yeni);
        setFavoriler(yeni);
        return eklendi;
      },
    }),
    [favoriler],
  );

  return (
    <SepetCtx.Provider value={sepet}>
      <FavoriCtx.Provider value={favori}>
        <BildirimCtx.Provider value={goster}>
          {children}
          {bildirim && (
            <div className="toast" role="status">
              <span>{bildirim.mesaj}</span>
              {bildirim.link && <Link href={bildirim.link.href}>{bildirim.link.yazi}</Link>}
            </div>
          )}
        </BildirimCtx.Provider>
      </FavoriCtx.Provider>
    </SepetCtx.Provider>
  );
}
