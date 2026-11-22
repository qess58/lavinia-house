// Fiyat hesapları. Hem tarayıcıda (anlık gösterim) hem sunucuda (siparişte doğrulama) aynı fonksiyonlar kullanılır.
// Tüm tutarlar kuruş cinsindendir.
import type { KisiAlan, Kalinlik, MagazaAyarlari, Secenek, VaryantAyari } from "./tipler";

export type FiyatUrunu = {
  fiyat: number;
  indirimliFiyat: number | null;
  secenekler: Secenek[];
  varyantlar: Record<string, VaryantAyari>;
  kisisellestirme: KisiAlan[];
};

export type DokumSatiri = { ad: string; tutar: number };

export function satisFiyati(u: { fiyat: number; indirimliFiyat: number | null }) {
  return u.indirimliFiyat && u.indirimliFiyat < u.fiyat ? u.indirimliFiyat : u.fiyat;
}

export function varyantAnahtari(secenekler: Secenek[], secim: Record<string, string>) {
  return secenekler.map((s) => secim[s.ad] ?? "").join(" / ");
}

/** Bir kişiselleştirme alanının seçilen değere göre ek ücret doğurup doğurmadığı. */
export function alanUcretliMi(alan: KisiAlan, deger: string | undefined) {
  if (!alan.ucret) return false;
  const v = (deger ?? "").trim();
  if (alan.tip === "metin" || alan.tip === "dosya") return v.length > 0;
  if (alan.tip === "renk") return !!v && !!alan.renkler && alan.renkler.findIndex((r) => r.ad === v) > 0;
  return true; // font seçimi ücretliyse her zaman uygulanır
}

export type BirimSonucu = { birim: number; dokum: DokumSatiri[]; hatalar: string[] };

export function urunBirimFiyati(u: FiyatUrunu, secim: Record<string, string>, kisi: Record<string, string>): BirimSonucu {
  const hatalar: string[] = [];
  const temel = satisFiyati(u);
  const dokum: DokumSatiri[] = [{ ad: "Ürün fiyatı", tutar: temel }];

  for (const s of u.secenekler) {
    const deger = s.degerler.find((d) => d.ad === secim[s.ad]);
    if (!deger) hatalar.push(`${s.ad} seçin.`);
  }
  const anahtar = varyantAnahtari(u.secenekler, secim);
  const ayar = u.varyantlar[anahtar];
  if (ayar?.aktif === false) hatalar.push("Bu seçenek şu an satışta değil.");

  if (ayar?.fark !== undefined) {
    if (ayar.fark) dokum.push({ ad: "Seçenek farkı", tutar: ayar.fark });
  } else {
    for (const s of u.secenekler) {
      const deger = s.degerler.find((d) => d.ad === secim[s.ad]);
      if (deger?.fark) dokum.push({ ad: `${s.ad}: ${deger.ad}`, tutar: deger.fark });
    }
  }

  for (const alan of u.kisisellestirme) {
    const v = (kisi[alan.id] ?? "").trim();
    if (alan.zorunlu && !v) hatalar.push(`${alan.baslik} gerekli.`);
    if (alan.tip === "metin" && alan.sinir && v.length > alan.sinir) hatalar.push(`${alan.baslik} en fazla ${alan.sinir} karakter olabilir.`);
    if (alan.tip === "font" && v && alan.fontlar && !alan.fontlar.includes(v)) hatalar.push(`${alan.baslik} geçersiz.`);
    if (alan.tip === "renk" && v && alan.renkler && !alan.renkler.some((r) => r.ad === v)) hatalar.push(`${alan.baslik} geçersiz.`);
    if (alanUcretliMi(alan, v)) dokum.push({ ad: alan.baslik, tutar: alan.ucret });
  }

  const birim = dokum.reduce((t, d) => t + d.tutar, 0);
  return { birim: Math.max(0, birim), dokum, hatalar };
}

export type StudyoMalzemesi = { id: number; cm2Kurus: number; kalinliklar: Kalinlik[]; aktif: boolean };
export const STUDYO_OLCU = { min: 5, max: 100 };

export function studyoBirimFiyati(m: StudyoMalzemesi, kalinlikMm: number, en: number, boy: number) {
  const k = m.kalinliklar.find((x) => x.mm === kalinlikMm);
  const hatalar: string[] = [];
  if (!m.aktif) hatalar.push("Bu malzeme şu an kullanılmıyor.");
  if (!k) hatalar.push("Kalınlık geçersiz.");
  for (const [ad, v] of [["En", en], ["Boy", boy]] as const) {
    if (!Number.isFinite(v) || v < STUDYO_OLCU.min || v > STUDYO_OLCU.max) hatalar.push(`${ad} ${STUDYO_OLCU.min}–${STUDYO_OLCU.max} cm arasında olmalı.`);
  }
  const ham = en * boy * m.cm2Kurus * (k?.carpan ?? 1);
  // Tam liraya yukarı yuvarla
  const birim = Math.ceil(ham / 100) * 100;
  return { birim, alan: en * boy, carpan: k?.carpan ?? 1, hatalar };
}

export type KuponBilgisi = { kod: string; tur: "yuzde" | "tutar"; deger: number; altLimit: number };

export type ToplamGirdisi = {
  araToplam: number;
  ayarlar: Pick<MagazaAyarlari, "kargoUcreti" | "ucretsizKargoLimiti" | "hediyePaketiUcreti" | "taksit6VadeYuzde">;
  kupon?: KuponBilgisi | null;
  hediye?: boolean;
  taksit?: number;
};

export function sepetToplami(g: ToplamGirdisi) {
  const { araToplam, ayarlar } = g;
  const kargo = araToplam === 0 || araToplam >= ayarlar.ucretsizKargoLimiti ? 0 : ayarlar.kargoUcreti;
  let indirim = 0;
  if (g.kupon && araToplam >= g.kupon.altLimit) {
    indirim = g.kupon.tur === "yuzde" ? Math.round((araToplam * g.kupon.deger) / 100) : Math.min(g.kupon.deger, araToplam);
  }
  const hediyeUcreti = g.hediye ? ayarlar.hediyePaketiUcreti : 0;
  const ara2 = araToplam + kargo - indirim + hediyeUcreti;
  const vadeFarki = g.taksit === 6 ? Math.round((ara2 * ayarlar.taksit6VadeYuzde) / 100) : 0;
  return { araToplam, kargo, indirim, hediyeUcreti, vadeFarki, toplam: ara2 + vadeFarki, ucretsizKargoKalan: Math.max(0, ayarlar.ucretsizKargoLimiti - araToplam) };
}
