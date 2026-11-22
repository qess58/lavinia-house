"use client";

import { useState } from "react";

export type Nokta = { etiket: string; kisa: string; deger: number; ek?: string };
type Props = { baslik: string; noktalar: Nokta[]; bicim: "para" | "sayi"; birimAdi: string; etiketAdimi?: number };

const sayi = new Intl.NumberFormat("tr-TR");
const kisaSayi = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

function yaz(v: number, bicim: Props["bicim"]) {
  return bicim === "para" ? `₺${sayi.format(Math.round(v / 100))}` : sayi.format(v);
}
function eksenYaz(v: number, bicim: Props["bicim"], kisa: boolean) {
  const n = bicim === "para" ? v / 100 : v;
  const s = kisa ? kisaSayi.format(n) : sayi.format(n);
  return bicim === "para" ? `₺${s}` : s;
}
/** 0'dan başlayan, 4 eşit aralıklı yuvarlak eksen değerleri. */
function eksen(enCok: number, bicim: Props["bicim"]) {
  const birim = bicim === "para" ? 100 : 1;
  const ham = Math.max(enCok / birim, 4);
  const kaba = ham / 4;
  const kuvvet = 10 ** Math.floor(Math.log10(kaba));
  const adim = [1, 2, 2.5, 5, 10].map((c) => c * kuvvet).find((a) => a >= kaba) ?? 10 * kuvvet;
  const tamAdim = Math.max(1, Math.ceil(adim)) * birim;
  return [0, 1, 2, 3, 4].map((i) => i * tamAdim);
}

/** Tek seri sütun grafik: üzerine gelince / klavyeyle odaklanınca değer gösterir, “Tablo” ile tüm değerler listelenir. */
export function SutunGrafik({ baslik, noktalar, bicim, birimAdi, etiketAdimi = 1 }: Props) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [tablo, setTablo] = useState(false);
  const enCok = Math.max(0, ...noktalar.map((n) => n.deger));
  const tikler = eksen(enCok, bicim);
  const tavan = tikler[4];
  const kisaEksen = tavan / (bicim === "para" ? 100 : 1) >= 10000;
  const toplam = noktalar.reduce((t, n) => t + n.deger, 0);

  return (
    <div className="y-graf">
      <div className="y-row y-sp">
        <h3>{baslik}</h3>
        <div className="y-seg" role="group" aria-label="Görünüm">
          <button type="button" className={!tablo ? "y-on" : ""} aria-pressed={!tablo} onClick={() => setTablo(false)}>Grafik</button>
          <button type="button" className={tablo ? "y-on" : ""} aria-pressed={tablo} onClick={() => setTablo(true)}>Tablo</button>
        </div>
      </div>
      {tablo ? (
        <div className="y-box" style={{ maxHeight: 300, overflow: "auto" }}>
          <table>
            <thead><tr><th>Gün</th><th className="y-r">{birimAdi}</th></tr></thead>
            <tbody>
              {noktalar.map((n) => (
                <tr key={n.etiket}><td>{n.etiket}</td><td className="y-r y-num">{yaz(n.deger, bicim)}{n.ek ? <span className="y-mut"> · {n.ek}</span> : null}</td></tr>
              ))}
              <tr><td><b>Toplam</b></td><td className="y-r y-num"><b>{yaz(toplam, bicim)}</b></td></tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="y-cizim" onMouseLeave={() => setAktif(null)}>
          <div className="y-yax" aria-hidden="true">
            {tikler.map((t, i) => <span key={t} style={{ bottom: `${i * 25}%` }}>{eksenYaz(t, bicim, kisaEksen)}</span>)}
          </div>
          <div className="y-plot">
            {tikler.map((t, i) => <span key={t} className={`y-gl ${i === 0 ? "y-base" : ""}`} style={{ bottom: `${i * 25}%` }} />)}
            <div className="y-cols" role="list" aria-label={baslik}>
              {noktalar.map((n, i) => {
                const h = tavan ? (n.deger / tavan) * 100 : 0;
                return (
                  <button
                    type="button"
                    role="listitem"
                    key={n.etiket}
                    className={`y-slot ${aktif === i ? "y-akt" : ""}`}
                    aria-label={`${n.etiket}: ${yaz(n.deger, bicim)}${n.ek ? `, ${n.ek}` : ""}`}
                    onMouseEnter={() => setAktif(i)}
                    onFocus={() => setAktif(i)}
                    onBlur={() => setAktif(null)}
                  >
                    {n.deger > 0 && <span className="y-bar" style={{ height: `${h}%` }} />}
                    {aktif === i && (
                      <span className="y-tip" style={{ bottom: `calc(${Math.min(h, 82)}% + 10px)` }} role="presentation">
                        <b>{yaz(n.deger, bicim)}</b>
                        {n.ek && <span>{n.ek}</span>}
                        <span className="y-tip-e">{n.etiket}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="y-xl" aria-hidden="true">
            {noktalar.map((n, i) => <span key={n.etiket}>{i % etiketAdimi === 0 || i === noktalar.length - 1 ? n.kisa : ""}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
