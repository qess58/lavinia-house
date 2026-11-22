"use client";

import { useRef, useState } from "react";
import type { Gorsel } from "@/lib/tipler";
import { gorseliKucult } from "@/lib/istemci-yukleme";
import { AnaSlayt } from "@/components/AnaSlayt";
import { TekGorsel } from "../TekGorsel";
import { anasayfaKaydet } from "./eylemler";
import { AZAMI_SLAYT, SLAYT_SURELERI } from "./sabitler";

export function AnasayfaFormu({ baslangic, sure: ilkSure, kurumsalGorsel }: { baslangic: Gorsel[]; sure: number; kurumsalGorsel: string }) {
  const [gorseller, setGorseller] = useState<Gorsel[]>(baslangic);
  const [sure, setSure] = useState(ilkSure);
  const [yukleniyor, setYukleniyor] = useState(0);
  const [hata, setHata] = useState("");
  const [degisti, setDegisti] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);

  const guncelle = (g: Gorsel[]) => {
    setGorseller(g);
    setDegisti(true);
  };
  const tasi = (i: number, yon: number) => {
    const j = i + yon;
    if (j < 0 || j >= gorseller.length) return;
    const g = [...gorseller];
    [g[i], g[j]] = [g[j], g[i]];
    guncelle(g);
  };
  const yukle = async (dosyalar: FileList) => {
    setHata("");
    const liste = [...dosyalar].slice(0, AZAMI_SLAYT - gorseller.length);
    setYukleniyor(liste.length);
    for (const f of liste) {
      const form = new FormData();
      form.append("dosya", await gorseliKucult(f));
      form.append("klasor", "anasayfa");
      const r = await fetch("/yonetim/medya", { method: "POST", body: form }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { yol?: string; hata?: string } | null;
      if (d?.yol) {
        setGorseller((x) => [...x, { yol: d.yol!, alt: "" }]);
        setDegisti(true);
      } else setHata(`${f.name}: ${d?.hata ?? "yüklenemedi."}`);
      setYukleniyor((n) => n - 1);
    }
  };

  return (
    <form action={anasayfaKaydet} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <input type="hidden" name="veri" value={JSON.stringify({ gorseller, sure })} />

      <section className="y-card" aria-labelledby="h-slayt">
        <div>
          <h2 id="h-slayt">Üst bölüm fotoğrafları</h2>
          <p className="y-sub y-sm">
            Ana sayfanın en üstünde, yazıların yanında görünür. Birden çok fotoğraf eklerseniz seçtiğiniz aralıkla sırayla değişir. En fazla {AZAMI_SLAYT} fotoğraf;
            yatay (5:4 ya da 4:3) fotoğraflar en iyi sonucu verir. Fotoğrafın kenarları bu orana göre kırpılabilir.
          </p>
        </div>

        <div className="y-medya">
          {gorseller.map((g, i) => (
            <div className="y-mt" key={g.yol}>
              {i === 0 && <span className="y-cap">İlk açılan</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.yol} alt={g.alt} style={{ aspectRatio: "5 / 4" }} />
              <input
                aria-label={`Fotoğraf ${i + 1} açıklaması`}
                placeholder="Kısa açıklama (ör. Ahşap masa saati)"
                maxLength={160}
                value={g.alt}
                onChange={(e) => guncelle(gorseller.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
              />
              <div className="y-ctl">
                <button type="button" className="y-btn y-s y-gh" onClick={() => tasi(i, -1)} disabled={i === 0} aria-label="Öne al">←</button>
                <button type="button" className="y-btn y-s y-gh" onClick={() => tasi(i, 1)} disabled={i === gorseller.length - 1} aria-label="Sona al">→</button>
                <button type="button" className="y-btn y-s y-gh" style={{ marginLeft: "auto", color: "#B91C1C" }} onClick={() => guncelle(gorseller.filter((_, j) => j !== i))}>Kaldır</button>
              </div>
            </div>
          ))}
          {gorseller.length < AZAMI_SLAYT && (
            <button type="button" className="y-yukle" onClick={() => dosyaRef.current?.click()} disabled={yukleniyor > 0}>
              {yukleniyor > 0 ? `Yükleniyor (${yukleniyor})…` : "+ Fotoğraf ekle"}
              <span className="y-sm y-mut" style={{ fontWeight: 400 }}>JPG, PNG, WEBP · birden çok seçebilirsiniz</span>
            </button>
          )}
        </div>
        <input ref={dosyaRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { if (e.target.files?.length) yukle(e.target.files); e.target.value = ""; }} />
        {hata && <p className="y-msg y-hata">{hata}</p>}

        <div style={{ maxWidth: 260 }}>
          <label className="y-lbl" htmlFor="a-sure">Fotoğraflar kaç saniyede bir değişsin?</label>
          <select id="a-sure" className="y-inp" value={sure} onChange={(e) => { setSure(Number(e.target.value)); setDegisti(true); }}>
            {SLAYT_SURELERI.map((s) => (
              <option key={s} value={s}>{s} saniye</option>
            ))}
          </select>
        </div>

        {gorseller.length > 0 && (
          <div>
            <p className="y-lbl">Önizleme</p>
            <div style={{ maxWidth: 420 }}>
              <AnaSlayt gorseller={gorseller} sure={sure} />
            </div>
          </div>
        )}
      </section>

      <section className="y-card" aria-labelledby="h-kurumsal">
        <div>
          <h2 id="h-kurumsal">“Kurumsal” kartı</h2>
          <p className="y-sub y-sm">Ana sayfadaki kategori kartlarının sonunda, kurumsal teklif sayfasına giden kartın fotoğrafı. Kategori fotoğraflarını Kategoriler sayfasından ekleyebilirsiniz.</p>
        </div>
        <TekGorsel ad="kurumsalGorsel" klasor="anasayfa" mevcut={kurumsalGorsel || null} aciklama="Fotoğraf eklenmezse kart düz renkte görünür." />
      </section>

      <div className="y-row" style={{ position: "sticky", bottom: 0, background: "#F4F5F2", padding: "12px 0" }}>
        <button className="y-btn y-pri" disabled={yukleniyor > 0}>Kaydet ve yayınla</button>
        {degisti && <span className="y-sm y-mut">Kaydedilmemiş değişiklikler var.</span>}
      </div>
    </form>
  );
}
