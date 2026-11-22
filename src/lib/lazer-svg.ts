// Kişiye özel siparişler için lazer kesime hazır SVG (milimetre ölçekli).
// Kırmızı (#FF0000) çizgiler kesim, siyah dolgular gravür içindir. Yazılar düzenlenebilir metin olarak gelir;
// lazer programında (LightBurn, RDWorks) aynı yazı tipi bilgisayarda yüklü olmalı ve kesimden önce yola çevrilmelidir.
import type { KisiAlan, StudyoSecimi } from "./tipler";

const kac = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const mm = (n: number) => Math.round(n * 100) / 100;

type Kalem = { ad: string; secim: Record<string, string>; kisi: Record<string, string>; studyo: StudyoSecimi | null };

export function lazerSvg(k: Kalem, alanlar: KisiAlan[], siparisNo: number, malzemeAdi = "") {
  let en = 300, boy = 200, sekil: StudyoSecimi["sekil"] = "dikdortgen", aski = true, satirlar: string[] = [], font = "Inter", kesimYazi = false;
  if (k.studyo) {
    en = k.studyo.en * 10;
    boy = k.studyo.boy * 10;
    sekil = k.studyo.sekil;
    aski = k.studyo.aski;
    satirlar = k.studyo.yazi ? k.studyo.yazi.split("\n") : [];
    font = k.studyo.font || font;
    kesimYazi = k.studyo.islem === "kesim";
  } else {
    for (const v of Object.values(k.secim)) {
      const m = v.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm)?/);
      if (m) {
        const carpan = m[3] === "mm" ? 1 : 10;
        en = Number(m[1].replace(",", ".")) * carpan;
        boy = Number(m[2].replace(",", ".")) * carpan;
        break;
      }
    }
    const metinAlanlari = alanlar.filter((a) => a.tip === "metin");
    satirlar = (metinAlanlari.length ? metinAlanlari.map((a) => k.kisi[a.id] ?? "") : ["ust", "alt", "yazi"].map((i) => k.kisi[i] ?? "")).map((s) => s.trim()).filter(Boolean);
    const fontAlani = alanlar.find((a) => a.tip === "font");
    font = (fontAlani && k.kisi[fontAlani.id]) || k.kisi.font || font;
  }

  const ic: string[] = [];
  const cizgi = `fill="none" stroke="#FF0000" stroke-width="0.1"`;
  if (sekil === "yuvarlak") {
    const r = Math.min(en, boy) / 2 - 0.5;
    ic.push(`<circle cx="${mm(en / 2)}" cy="${mm(boy / 2)}" r="${mm(r)}" ${cizgi}/>`);
  } else if (sekil === "oval") {
    ic.push(`<ellipse cx="${mm(en / 2)}" cy="${mm(boy / 2)}" rx="${mm(en / 2 - 0.5)}" ry="${mm(boy / 2 - 0.5)}" ${cizgi}/>`);
  } else {
    ic.push(`<rect x="0.5" y="0.5" width="${mm(en - 1)}" height="${mm(boy - 1)}" rx="${mm(Math.min(en, boy) * 0.04)}" ${cizgi}/>`);
  }
  if (aski) ic.push(`<circle cx="${mm(en / 2)}" cy="${mm(Math.max(6, boy * 0.07))}" r="2.5" ${cizgi}/>`);

  const [ust, ...diger] = satirlar;
  if (ust) {
    const fs1 = Math.min(boy * 0.3, (en * 0.86) / (Math.max(ust.length, 4) * 0.5));
    const y1 = diger.length ? boy * 0.52 : boy * 0.6;
    const stil = kesimYazi ? cizgi : `fill="#000000"`;
    ic.push(`<text x="${mm(en / 2)}" y="${mm(y1)}" text-anchor="middle" font-family="${kac(font)}" font-size="${mm(fs1)}" ${stil}>${kac(ust)}</text>`);
    diger.forEach((s, i) => {
      const fs2 = Math.min(boy * 0.09, (en * 0.8) / (Math.max(s.length, 6) * 0.62));
      ic.push(`<text x="${mm(en / 2)}" y="${mm(boy * 0.78 + i * fs2 * 1.3)}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${mm(fs2)}" letter-spacing="${mm(fs2 * 0.15)}" ${stil}>${kac(s.toLocaleUpperCase("tr"))}</text>`);
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Lavinia House · Sipariş #${siparisNo} · ${kac(k.ad)} · ${mm(en)} × ${mm(boy)} mm${malzemeAdi ? ` · ${kac(malzemeAdi)}` : ""} -->
<!-- Kırmızı çizgiler: kesim. Siyah: gravür. Yazı tipi: ${kac(font)} (bilgisayarınızda yüklü olmalı; kesimden önce yola çevirin). -->
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(en)}mm" height="${mm(boy)}mm" viewBox="0 0 ${mm(en)} ${mm(boy)}">
${ic.map((x) => "  " + x).join("\n")}
</svg>
`;
}
