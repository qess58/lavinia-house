"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FiltreIkon, KapatIkon, OkAsagi } from "./Ikonlar";

/* Etsy tarzı filtreler: ürünlerin üstünde ince bir çubuk (hızlı seçimler + sıralama)
   ve "Tüm filtreler" ile soldan açılan panel. Ürün ızgarası tam genişlikte kalır. */

type Secenek = { k: string; ad: string; kisa?: string; n?: number };
type Props = {
  kategoriler: Secenek[];
  malzemeler: { ad: string; n: number }[];
  ozellikler: Secenek[];
  araliklar: Secenek[];
  aktifSayisi: number;
};

const SIRALAR = [
  ["oner", "Önerilen"],
  ["cok", "En çok değerlendirilen"],
  ["artan", "Fiyat: düşükten yükseğe"],
  ["azalan", "Fiyat: yüksekten düşüğe"],
  ["puan", "En yüksek puan"],
  ["yeni", "En yeni"],
] as const;
const HIZLI_OZELLIKLER = ["kisisel", "indirim", "hizli", "set"];

function useParametre() {
  const router = useRouter();
  const yol = usePathname();
  const sp = useSearchParams();
  const [bekliyor, gecis] = useTransition();
  const git = (f: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    f(p);
    const s = p.toString();
    gecis(() => router.push(s ? `${yol}?${s}` : yol, { scroll: false }));
  };
  return { sp, git, bekliyor };
}

/** Dışarı tıklanınca / Esc ile kapanan küçük açılır pencere. */
function Acilir({ etiket, aktif, acik, ac, kapat, children }: { etiket: string; aktif: boolean; acik: boolean; ac: () => void; kapat: () => void; children: React.ReactNode }) {
  const kutu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!acik) return;
    const tik = (e: MouseEvent) => !kutu.current?.contains(e.target as Node) && kapat();
    const tus = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    document.addEventListener("mousedown", tik);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("mousedown", tik);
      document.removeEventListener("keydown", tus);
    };
  }, [acik, kapat]);
  return (
    <div className="acl" ref={kutu}>
      <button className={`fchip ${aktif ? "on" : ""}`} aria-expanded={acik} onClick={acik ? kapat : ac}>
        {etiket} <OkAsagi boyut={12} />
      </button>
      {acik && <div className="pop">{children}</div>}
    </div>
  );
}

export function FiltreCubugu({ kategoriler, malzemeler, ozellikler, araliklar, aktifSayisi }: Props) {
  const { sp, git, bekliyor } = useParametre();
  const [acilir, setAcilir] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const telefon = () => window.matchMedia("(max-width: 860px)").matches;
  const ac = (ad: string) => () => (telefon() ? setPanel(true) : setAcilir(ad));
  const kapat = useCallback(() => setAcilir(null), []);
  const paneliKapat = useCallback(() => setPanel(false), []);

  const ozellikDegistir = (k: string) =>
    git((p) => {
      const v = p.getAll("ozellik");
      p.delete("ozellik");
      (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]).forEach((x) => p.append("ozellik", x));
    });

  const fiyatAktif = !!(sp.get("fiyat") || sp.get("min") || sp.get("max"));
  const malzemeSecili = sp.getAll("malzeme");

  return (
    <>
      <div className="fbar" aria-busy={bekliyor}>
        <button className="fchip ana" onClick={() => { kapat(); setPanel(true); }}>
          <FiltreIkon boyut={18} /> Tüm filtreler{aktifSayisi > 0 && <span className="fbdg">{aktifSayisi}</span>}
        </button>
        <div className="fchips" role="group" aria-label="Hızlı filtreler">
          <Acilir etiket="Fiyat" aktif={fiyatAktif} acik={acilir === "fiyat"} ac={ac("fiyat")} kapat={kapat}>
            <FiyatSecimi araliklar={araliklar} sp={sp} uygula={(f) => { git(f); kapat(); }} />
          </Acilir>
          <Acilir etiket={malzemeSecili.length ? `Malzeme (${malzemeSecili.length})` : "Malzeme"} aktif={malzemeSecili.length > 0} acik={acilir === "malzeme"} ac={ac("malzeme")} kapat={kapat}>
            {malzemeler.map((m) => (
              <label className="frw" key={m.ad}>
                <input
                  type="checkbox"
                  checked={malzemeSecili.includes(m.ad)}
                  onChange={() =>
                    git((p) => {
                      const v = p.getAll("malzeme");
                      p.delete("malzeme");
                      (v.includes(m.ad) ? v.filter((x) => x !== m.ad) : [...v, m.ad]).forEach((x) => p.append("malzeme", x));
                    })
                  }
                />
                {m.ad}
                <span className="c">{m.n}</span>
              </label>
            ))}
          </Acilir>
          {ozellikler
            .filter((o) => HIZLI_OZELLIKLER.includes(o.k))
            .map((o) => {
              const on = sp.getAll("ozellik").includes(o.k);
              return (
                <button key={o.k} className={`fchip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => ozellikDegistir(o.k)} title={o.ad}>
                  {o.kisa ?? o.ad}
                </button>
              );
            })}
        </div>
      </div>
      {panel && <FiltrePaneli {...{ kategoriler, malzemeler, ozellikler, araliklar }} sp={sp} kapat={paneliKapat} uygula={(f) => { git(f); setPanel(false); }} />}
    </>
  );
}

/** Başlığın sağındaki "Kategori" ve "Sırala" seçim kutuları. */
export function ListeSecimleri({ kategoriler, kategori, siralama }: { kategoriler: Secenek[]; kategori: string; siralama: string }) {
  const { git, bekliyor } = useParametre();
  return (
    <div className="fsag" aria-busy={bekliyor}>
      <label className={`fsira ${kategori ? "on" : ""}`}>
        <span className="sm">Kategori:</span>
        <select
          value={kategori}
          onChange={(e) =>
            git((p) => {
              if (e.target.value) p.set("kategori", e.target.value);
              else p.delete("kategori");
            })
          }
        >
          <option value="">Tüm kategoriler</option>
          {kategoriler.map((k) => (
            <option key={k.k} value={k.k}>{`${k.ad} (${k.n})`}</option>
          ))}
        </select>
      </label>
      <label className="fsira">
        <span className="sm">Sırala:</span>
        <select
          value={siralama}
          onChange={(e) =>
            git((p) => {
              if (e.target.value === "oner") p.delete("sirala");
              else p.set("sirala", e.target.value);
            })
          }
        >
          {SIRALAR.map(([k, ad]) => (
            <option key={k} value={k}>{ad}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function FiyatSecimi({ araliklar, sp, uygula }: { araliklar: Secenek[]; sp: URLSearchParams; uygula: (f: (p: URLSearchParams) => void) => void }) {
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 260 }}>
      <label className="frw">
        <input type="radio" name="fy" checked={!sp.get("fiyat") && !sp.get("min") && !sp.get("max")} onChange={() => uygula((p) => { p.delete("fiyat"); p.delete("min"); p.delete("max"); })} />
        Tüm fiyatlar
      </label>
      {araliklar.map((a) => (
        <label className="frw" key={a.k}>
          <input type="radio" name="fy" checked={sp.get("fiyat") === a.k} onChange={() => uygula((p) => { p.set("fiyat", a.k); p.delete("min"); p.delete("max"); })} />
          {a.ad}
        </label>
      ))}
      <form
        style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          uygula((p) => {
            p.delete("fiyat");
            if (min) p.set("min", min); else p.delete("min");
            if (max) p.set("max", max); else p.delete("max");
          });
        }}
      >
        <input className="inp s2" aria-label="En az fiyat" inputMode="numeric" placeholder="En az ₺" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
        <span aria-hidden="true">–</span>
        <input className="inp s2" aria-label="En çok fiyat" inputMode="numeric" placeholder="En çok ₺" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
        <button className="btn s">Uygula</button>
      </form>
    </div>
  );
}

/** Soldan açılan "Tüm filtreler" paneli. Seçimler "Sonuçları göster" ile birlikte uygulanır. */
function FiltrePaneli({ kategoriler, malzemeler, ozellikler, araliklar, sp, kapat, uygula }: Pick<Props, "kategoriler" | "malzemeler" | "ozellikler" | "araliklar"> & { sp: URLSearchParams; kapat: () => void; uygula: (f: (p: URLSearchParams) => void) => void }) {
  const [taslak, setTaslak] = useState(() => ({
    kategori: kategoriler.some((k) => k.k === sp.get("kategori")) ? sp.get("kategori") ?? "" : "",
    fiyat: sp.get("fiyat") ?? "",
    min: sp.get("min") ?? "",
    max: sp.get("max") ?? "",
    malzeme: sp.getAll("malzeme"),
    ozellik: sp.getAll("ozellik"),
    puan: sp.get("puan") === "45",
  }));
  const tog = (anahtar: "malzeme" | "ozellik", v: string) => setTaslak((t) => ({ ...t, [anahtar]: t[anahtar].includes(v) ? t[anahtar].filter((x) => x !== v) : [...t[anahtar], v] }));

  useEffect(() => {
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tus = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    document.addEventListener("keydown", tus);
    return () => {
      document.body.style.overflow = eski;
      document.removeEventListener("keydown", tus);
    };
  }, [kapat]);

  return (
    <div className="fpanel-ort" onClick={(e) => e.target === e.currentTarget && kapat()}>
      <div className="fpanel" role="dialog" aria-modal="true" aria-labelledby="fp-b">
        <div className="fp-ust">
          <h2 id="fp-b" style={{ fontSize: 22 }}>Filtreler</h2>
          <button className="btn s gh" onClick={kapat} aria-label="Kapat"><KapatIkon /></button>
        </div>
        <div className="fp-govde">
          {kategoriler.length > 0 && (
            <fieldset>
              <legend>Kategori</legend>
              <label className="frw"><input type="radio" name="pkat" checked={!taslak.kategori} onChange={() => setTaslak({ ...taslak, kategori: "" })} />Tümü</label>
              {kategoriler.map((k) => (
                <label className="frw" key={k.k}><input type="radio" name="pkat" checked={taslak.kategori === k.k} onChange={() => setTaslak({ ...taslak, kategori: k.k })} />{k.ad}<span className="c">{k.n}</span></label>
              ))}
            </fieldset>
          )}
          <fieldset>
            <legend>Fiyat</legend>
            <label className="frw"><input type="radio" name="pfy" checked={!taslak.fiyat && !taslak.min && !taslak.max} onChange={() => setTaslak({ ...taslak, fiyat: "", min: "", max: "" })} />Tüm fiyatlar</label>
            {araliklar.map((a) => (
              <label className="frw" key={a.k}><input type="radio" name="pfy" checked={taslak.fiyat === a.k} onChange={() => setTaslak({ ...taslak, fiyat: a.k, min: "", max: "" })} />{a.ad}</label>
            ))}
            <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 6 }}>
              <input className="inp" aria-label="En az fiyat" inputMode="numeric" placeholder="En az ₺" value={taslak.min} onChange={(e) => setTaslak({ ...taslak, fiyat: "", min: e.target.value.replace(/\D/g, "") })} />
              <span aria-hidden="true">–</span>
              <input className="inp" aria-label="En çok fiyat" inputMode="numeric" placeholder="En çok ₺" value={taslak.max} onChange={(e) => setTaslak({ ...taslak, fiyat: "", max: e.target.value.replace(/\D/g, "") })} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Malzeme</legend>
            {malzemeler.map((m) => (
              <label className="frw" key={m.ad}><input type="checkbox" checked={taslak.malzeme.includes(m.ad)} onChange={() => tog("malzeme", m.ad)} />{m.ad}<span className="c">{m.n}</span></label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Özellikler</legend>
            {ozellikler.map((o) => (
              <label className="frw" key={o.k}><input type="checkbox" checked={taslak.ozellik.includes(o.k)} onChange={() => tog("ozellik", o.k)} />{o.ad}<span className="c">{o.n}</span></label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Değerlendirme</legend>
            <label className="frw"><input type="checkbox" checked={taslak.puan} onChange={() => setTaslak({ ...taslak, puan: !taslak.puan })} /><span className="st" aria-hidden="true">★</span> 4,5 ve üzeri</label>
          </fieldset>
        </div>
        <div className="fp-alt">
          <button className="btn" onClick={() => setTaslak({ kategori: "", fiyat: "", min: "", max: "", malzeme: [], ozellik: [], puan: false })}>Temizle</button>
          <button
            className="btn pri"
            style={{ flex: 1 }}
            onClick={() =>
              uygula((p) => {
                for (const k of ["kategori", "fiyat", "min", "max", "malzeme", "ozellik", "puan"]) p.delete(k);
                if (taslak.kategori) p.set("kategori", taslak.kategori);
                if (taslak.fiyat) p.set("fiyat", taslak.fiyat);
                if (taslak.min) p.set("min", taslak.min);
                if (taslak.max) p.set("max", taslak.max);
                taslak.malzeme.forEach((m) => p.append("malzeme", m));
                taslak.ozellik.forEach((o) => p.append("ozellik", o));
                if (taslak.puan) p.set("puan", "45");
              })
            }
          >
            Sonuçları göster
          </button>
        </div>
      </div>
    </div>
  );
}
