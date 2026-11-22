"use client";

import Link from "next/link";
import { useState } from "react";
import { STUDYO_OLCU, studyoBirimFiyati } from "@/lib/fiyat";
import { para, tl } from "@/lib/bicim";
import type { Kalinlik, MalzemeGorunum, StudyoSecimi } from "@/lib/tipler";
import { useBildirim, useSepet } from "./Saglayicilar";
import { useMagazaModu } from "./MagazaModu";
import { waLinki } from "@/lib/whatsapp";

type Malzeme = { id: number; ad: string; aciklama: string; cm2Kurus: number; kalinliklar: Kalinlik[]; gorunum: MalzemeGorunum; aktif: boolean };
const KAL_IPUCU: Record<number, string> = { 3: "İnce · küçük işler", 4: "Dengeli", 5: "Sağlam", 6: "En sağlam · dış mekân" };
const HAZIR = [[20, 15], [30, 20], [40, 30], [60, 40]] as const;
const SEKIL = [
  { k: "dikdortgen", ad: "Dikdörtgen" },
  { k: "yuvarlak", ad: "Yuvarlak köşe" },
  { k: "oval", ad: "Oval" },
] as const;

export function Studyo({ malzemeler, fontlar, whatsapp }: { malzemeler: Malzeme[]; fontlar: { ad: string; aile: string }[]; whatsapp: string }) {
  const sepet = useSepet();
  const bildir = useBildirim();
  const mod = useMagazaModu();
  const [malzemeId, setMalzemeId] = useState(malzemeler[0]?.id ?? 0);
  const m = malzemeler.find((x) => x.id === malzemeId) ?? malzemeler[0];
  const [kalinlik, setKalinlik] = useState(m?.kalinliklar[1]?.mm ?? m?.kalinliklar[0]?.mm ?? 3);
  const [en, setEn] = useState("30");
  const [boy, setBoy] = useState("20");
  const [sekil, setSekil] = useState<StudyoSecimi["sekil"]>("yuvarlak");
  const [aski, setAski] = useState(true);
  const [yazi, setYazi] = useState("");
  const [font, setFont] = useState(fontlar[fontlar.length - 1]?.ad ?? "");
  const [islem, setIslem] = useState<StudyoSecimi["islem"]>("gravur");
  const [gorsel, setGorsel] = useState(false);
  const [adet, setAdet] = useState(1);

  if (!m) return <p className="mut">Şu an tasarım stüdyosunda kullanılabilir malzeme yok.</p>;

  const k = m.kalinliklar.find((x) => x.mm === kalinlik) ?? m.kalinliklar[0];
  const nEn = Number(en), nBoy = Number(boy);
  const fiyat = studyoBirimFiyati(m, k.mm, nEn, nBoy);
  const hata = fiyat.hatalar.length > 0;
  const e2 = hata ? 30 : nEn, b2 = hata ? 20 : nBoy;
  const sc = Math.min(400 / e2, 280 / b2);
  const w = e2 * sc, h = b2 * sc, x = 260 - w / 2, y = 196 - h / 2;
  const metin = yazi.trim() || "Yazınız";
  const f = fontlar.find((x) => x.ad === font);
  const katsayi = /Vibes/.test(font) ? 0.42 : /Montserrat/.test(font) ? 0.6 : 0.55;
  const fs = Math.min(h * 0.32, (w * 0.82) / (Math.max(metin.length, 4) * katsayi));
  const g = m.gorunum;

  const secim: StudyoSecimi = { malzemeId: m.id, kalinlikMm: k.mm, en: nEn, boy: nBoy, sekil, yazi: yazi.trim(), font, islem, aski, gorsel };
  const ozet = `${e2} × ${b2} cm · ${m.ad} ${k.mm} mm · ${islem === "kesim" ? "kesim" : "gravür"}${yazi.trim() ? ` · “${yazi.trim()}” · ${font}` : ""}`;

  return (
    <div className="split" style={{ gap: "clamp(24px, 3vw, 44px)" }}>
      <section className="st-canvas" aria-label="Önizleme">
        <div className="st-board">
          <svg viewBox="0 0 520 400" role="img" aria-label={`Tasarım önizlemesi, ${e2} × ${b2} cm`} style={{ width: "100%", height: "100%" }}>
            {sekil === "oval" ? (
              <ellipse cx={260} cy={196} rx={w / 2} ry={h / 2} fill={g.zemin} stroke={g.kenar} strokeWidth={3} opacity={g.saydamlik ?? 1} />
            ) : (
              <rect x={x} y={y} width={w} height={h} rx={sekil === "yuvarlak" ? Math.min(w, h) * 0.12 : 0} fill={g.zemin} stroke={g.kenar} strokeWidth={3} opacity={g.saydamlik ?? 1} />
            )}
            {aski && <circle cx={260} cy={y + Math.min(18, h * 0.12)} r={6} fill="#F3EEE6" stroke={g.kenar} strokeWidth={1.5} />}
            <text x={260} y={196 + (gorsel ? h * 0.08 : 0)} textAnchor="middle" dominantBaseline="middle" fontFamily={f?.aile ?? "Inter"} fontSize={Math.round(fs)} fill={islem === "kesim" ? "#F3EEE6" : g.yazi}>
              {metin}
            </text>
            {gorsel && <rect x={238} y={y + h * 0.16} width={44} height={44} rx={8} fill="none" stroke={g.yazi} strokeWidth={2} strokeDasharray="5 4" />}
            <path d={`M${x} ${y + h + 22} H${x + w}`} stroke="#6B5A42" strokeWidth={1.2} />
            <text x={260} y={y + h + 40} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={13} fontWeight={600} fill="#6B5A42">{e2} cm</text>
            <path d={`M${x - 22} ${y} V${y + h}`} stroke="#6B5A42" strokeWidth={1.2} />
            <text x={x - 38} y={196} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={13} fontWeight={600} fill="#6B5A42" transform={`rotate(-90 ${x - 38} 196)`}>{b2} cm</text>
          </svg>
        </div>
        <p className="xs mut">Önizleme ölçeklidir ama yaklaşıktır. Ahşabın damarı ve tonu her parçada farklıdır.</p>
      </section>

      <section className="st-panel" aria-label="Seçenekler">
        <div className="stp">
          <div className="sh"><span className="n">1</span><b>Malzeme</b><span className="v">{m.ad}</span></div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
            {malzemeler.map((x) => (
              <button key={x.id} className={`mc ${x.id === m.id ? "on" : ""}`} aria-pressed={x.id === m.id} onClick={() => { setMalzemeId(x.id); if (!x.kalinliklar.some((kk) => kk.mm === kalinlik)) setKalinlik(x.kalinliklar[0].mm); }}>
                <i style={{ background: x.gorunum.zemin }} />
                <span style={{ display: "block" }}><b>{x.ad}</b><span>{x.aciklama}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div className="stp">
          <div className="sh"><span className="n">2</span><b>Kalınlık</b><span className="v">{k.mm} mm</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {m.kalinliklar.map((x) => (
              <button key={x.mm} className={`chip ${x.mm === k.mm ? "on" : ""}`} aria-pressed={x.mm === k.mm} onClick={() => setKalinlik(x.mm)}>
                {x.mm} mm{KAL_IPUCU[x.mm] ? ` · ${KAL_IPUCU[x.mm]}` : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="stp">
          <div className="sh"><span className="n">3</span><b>Ölçü</b><span className="v">{en || "?"} × {boy || "?"} cm</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HAZIR.map(([a, b]) => (
              <button key={`${a}x${b}`} className={`chip ${nEn === a && nBoy === b ? "on" : ""}`} style={{ minHeight: 42 }} onClick={() => { setEn(String(a)); setBoy(String(b)); }}>
                {a} × {b}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div><label className="lbl" htmlFor="s-en">En (cm)</label><input id="s-en" className={`inp ${nEn < STUDYO_OLCU.min || nEn > STUDYO_OLCU.max ? "bad" : ""}`} inputMode="numeric" value={en} onChange={(e) => setEn(e.target.value.replace(/\D/g, "").slice(0, 3))} /></div>
            <div><label className="lbl" htmlFor="s-boy">Boy (cm)</label><input id="s-boy" className={`inp ${nBoy < STUDYO_OLCU.min || nBoy > STUDYO_OLCU.max ? "bad" : ""}`} inputMode="numeric" value={boy} onChange={(e) => setBoy(e.target.value.replace(/\D/g, "").slice(0, 3))} /></div>
          </div>
          {hata && (
            <p className="err" role="alert">
              Ölçü {STUDYO_OLCU.min} ile {STUDYO_OLCU.max} cm arasında olmalı. Daha büyüğü için <Link href="/teklif">teklif isteyin</Link>.
            </p>
          )}
        </div>
        <div className="stp">
          <div className="sh"><span className="n">4</span><b>Şekil</b><span className="v">{SEKIL.find((s) => s.k === sekil)?.ad}</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SEKIL.map((s) => (
              <button key={s.k} className={`chip ${s.k === sekil ? "on" : ""}`} aria-pressed={s.k === sekil} onClick={() => setSekil(s.k)}>{s.ad}</button>
            ))}
          </div>
          <label className="ck" style={{ paddingTop: 4 }}><input type="checkbox" checked={aski} onChange={() => setAski(!aski)} /> Askı deliği açılsın</label>
        </div>
        <div className="stp">
          <div className="sh"><span className="n">5</span><b>Yazı</b><span className="v">{yazi.length} / 40</span></div>
          <label className="vh" htmlFor="s-yz">Yazılacak metin</label>
          <input id="s-yz" className="inp" maxLength={40} value={yazi} onChange={(e) => setYazi(e.target.value)} placeholder="Örn. Atölye Kahve" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {fontlar.map((x) => (
              <button key={x.ad} className={`chip ${x.ad === font ? "on" : ""}`} aria-pressed={x.ad === font} onClick={() => setFont(x.ad)} style={{ fontFamily: x.aile, fontSize: /Vibes|Pacifico/.test(x.ad) ? 20 : 15, fontWeight: 500 }}>
                {x.ad}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }} role="group" aria-label="İşleme türü">
            {[["gravur", "Gravür", "Yazı yüzeye işlenir"], ["kesim", "Kesim", "Harfler oyularak kesilir"]].map(([kk, ad, alt]) => (
              <button key={kk} className={`mc ${islem === kk ? "on" : ""}`} aria-pressed={islem === kk} onClick={() => setIslem(kk as StudyoSecimi["islem"])}>
                <span style={{ display: "block" }}><b>{ad}</b><span>{alt}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div className="stp">
          <div className="sh"><span className="n">6</span><b>Görsel veya logo</b><span className="v">İsteğe bağlı</span></div>
          <p className="sm mut">Logonuzu veya çiziminizi siparişten sonra e-postayla ya da WhatsApp’tan gönderebilirsiniz; tasarıma biz yerleştiririz.</p>
          <label className="ck" style={{ paddingTop: 0 }}><input type="checkbox" checked={gorsel} onChange={() => setGorsel(!gorsel)} /> Tasarıma görsel / logo eklenecek</label>
        </div>
        <div className="pricebox" aria-live="polite">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p className="sm" style={{ color: "#C9CFCB" }}>{mod.fiyat ? (mod.satis ? "Toplam fiyat · KDV dahil" : "Tahmini fiyat · KDV dahil") : "Fiyat"}</p>
              <p className="hd num" style={{ color: "#fff", fontSize: mod.fiyat ? 38 : 22, fontWeight: 800, lineHeight: 1.1 }}>{!mod.fiyat ? "Teklifle bildirilir" : hata ? "—" : para(fiyat.birim * adet)}</p>
            </div>
            <div className="qty dk k" role="group" aria-label="Adet">
              <button aria-label="Azalt" onClick={() => setAdet(Math.max(1, adet - 1))} disabled={adet <= 1}>−</button>
              <span>{adet}</span>
              <button aria-label="Artır" onClick={() => setAdet(Math.min(500, adet + 1))}>+</button>
            </div>
          </div>
          <p className="sm" style={{ color: "#C9CFCB" }}>
            {ozet} ({tl(e2 * b2 * 100)} cm²){adet > 1 && !hata ? ` · adet başı ${para(fiyat.birim)}` : ""}
          </p>
          {mod.satis ? (
            <>
              <button
                className="btn pri wide"
                disabled={hata}
                onClick={() => {
                  sepet.ekle({ tur: "studyo", ad: "Kendi tasarımınız", studyo: secim, ozet, birimFiyat: fiyat.birim, adet, kisisel: true });
                  bildir({ mesaj: "Tasarımınız sepete eklendi. Ödemeden sonra onayınıza sunacağız.", link: { href: "/sepet", yazi: "Sepete git →" } });
                }}
              >
                Sepete ekle
              </button>
              <a className="btn s ol2" href={waLinki(whatsapp, `Merhaba, şu tasarım için fikir almak istiyorum: ${ozet}`)}>
                Ustaya danış
              </a>
            </>
          ) : (
            <>
              <a className="btn wa-btn wide" href={waLinki(whatsapp, `Merhaba, şu tasarımı sipariş etmek istiyorum: ${ozet}${secim.yazi ? ` · Yazı: “${secim.yazi}”` : ""} · ${adet} adet`)} target="_blank" rel="noopener">
                WhatsApp’tan sipariş ver
              </a>
              <Link className="btn s ol2" href={`/teklif?not=${encodeURIComponent(`Kendi tasarımım: ${ozet}${secim.yazi ? `\nYazı: ${secim.yazi}` : ""}\nAdet: ${adet}`)}`}>
                Teklif iste
              </Link>
              <p className="xs" style={{ color: "#C9CFCB" }}>Online satış çok yakında. Şimdilik siparişleri WhatsApp ve teklif formuyla alıyoruz.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
