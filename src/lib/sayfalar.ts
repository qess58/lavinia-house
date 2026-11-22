// Bilgi ve yasal sayfalar. Metinler yönetim panelinden (Sayfalar) yazılır ve ayarlar tablosunda "sayfa:<adres>" anahtarıyla saklanır.
// Yazım biçimi: boş satır yeni paragraf, "## " ile başlayan satır ara başlık, "- " veya "• " ile başlayan satırlar madde.
// {unvan} {adres} {telefon} {eposta} gibi işaretler mağaza ayarlarındaki bilgilerle değiştirilir.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ayarlar } from "@/db/schema";
import { para } from "./bicim";
import type { MagazaAyarlari } from "./tipler";
import { siteAdresi } from "@/lib/site";

export type SayfaTanimi = { adres: string; baslik: string; yasal: boolean; aciklama: string; varsayilan: string };

export const SAYFALAR: SayfaTanimi[] = [
  {
    adres: "hakkimizda",
    baslik: "Hakkımızda",
    yasal: false,
    aciklama: "Atölyenizin hikâyesi. Müşterinin size güvenmesi için en önemli sayfalardan biri.",
    varsayilan:
      "Lavinia House, ahşap ve pleksiden mekanik modeller ve kişiye özel ürünler tasarlayıp üreten bir lazer kesim atölyesidir.\n\nHer ürünü siparişiniz geldiğinde atölyemizde kesiyor, zımparalıyor ve paketliyoruz. Kişiye özel ürünlerde üretime başlamadan önce tasarımı size gösteriyor, onayınızı alıyoruz.",
  },
  {
    adres: "iletisim",
    baslik: "İletişim",
    yasal: false,
    aciklama: "İletişim bilgileri Ayarlar’dan otomatik gelir.",
    varsayilan:
      "## Bize ulaşın\n- Telefon: {telefon}\n- E-posta: {eposta}\n- WhatsApp: {whatsapp}\n- Çalışma saatleri: {calismaSaatleri}\n\n## Satıcı bilgileri\n- {unvan}\n- Adres: {adres}\n- Vergi dairesi / no: {vergiDairesi} / {vergiNo}\n- MERSİS no: {mersisNo}\n\nToplu ve kurumsal siparişler için “Dosyanı yükle, teklif al” sayfasını kullanabilirsiniz.",
  },
  {
    adres: "kargo-ve-teslimat",
    baslik: "Kargo ve teslimat",
    yasal: false,
    aciklama: "Kargo ücreti ve ücretsiz kargo limiti Ayarlar’dan otomatik gelir.",
    varsayilan:
      "{ucretsizKargoLimiti} ve üzeri siparişlerde kargo ücretsizdir; altındaki siparişlerde kargo ücreti {kargoUcreti}’dir.\n\nHazır ürünler genellikle 1–2 iş gününde, kişiye özel ürünler tasarım onayınızdan sonra ürün sayfasında yazan sürede kargoya verilir. Kargo takip numarası e-postanıza gelir; siparişinizi “Sipariş takibi” sayfasından izleyebilirsiniz.",
  },
  {
    adres: "iade-ve-degisim",
    baslik: "İade ve değişim",
    yasal: false,
    aciklama: "İade koşulları. Yasal metinlerle çelişmemeli.",
    varsayilan:
      "Hazır (kişiye özel olmayan) ürünleri teslimattan sonra 14 gün içinde, kullanılmamış olarak iade edebilirsiniz.\n\nKişiye özel üretilen ürünlerde, mevzuat gereği cayma hakkı bulunmaz. Üretim hatası veya kargo hasarı olursa ürünü ücretsiz yeniden üretiriz; fotoğrafla birlikte bize yazmanız yeterli.\n\nTasarımı onaylamadan önce istediğiniz kadar düzeltme isteyebilirsiniz.",
  },
  { adres: "on-bilgilendirme-formu", baslik: "Ön Bilgilendirme Formu", yasal: true, aciklama: "Ödeme sayfasında müşterinin onayladığı metin. Zorunlu.", varsayilan: "" },
  { adres: "mesafeli-satis-sozlesmesi", baslik: "Mesafeli Satış Sözleşmesi", yasal: true, aciklama: "Ödeme sayfasında müşterinin onayladığı sözleşme. Zorunlu.", varsayilan: "" },
  { adres: "kvkk", baslik: "KVKK Aydınlatma Metni", yasal: true, aciklama: "Kişisel verilerin nasıl işlendiği. Formların altında bağlantısı var. Zorunlu.", varsayilan: "" },
  { adres: "gizlilik-ve-cerezler", baslik: "Gizlilik ve Çerez Politikası", yasal: true, aciklama: "Site çerez ve gizlilik politikası. Ziyaret istatistikleri açıklaması sayfanın altına otomatik eklenir.", varsayilan: "" },
];

export const sayfaTanimi = (adres: string) => SAYFALAR.find((s) => s.adres === adres);

export type KayitliSayfa = { icerik: string; guncelleme: string };

export async function kayitliSayfalar() {
  const d = await db();
  const satirlar = await d.select().from(ayarlar);
  const sonuc: Record<string, KayitliSayfa> = {};
  for (const r of satirlar) if (r.anahtar.startsWith("sayfa:")) sonuc[r.anahtar.slice(6)] = r.deger as KayitliSayfa;
  return sonuc;
}

export async function sayfaIcerigi(adres: string): Promise<{ icerik: string; ozel: boolean }> {
  const t = sayfaTanimi(adres);
  const d = await db();
  const [r] = await d.select().from(ayarlar).where(eq(ayarlar.anahtar, `sayfa:${adres}`));
  const k = r?.deger as KayitliSayfa | undefined;
  return k?.icerik?.trim() ? { icerik: k.icerik, ozel: true } : { icerik: t?.varsayilan ?? "", ozel: false };
}

/** {işaret}leri ayarlardaki değerlerle değiştirir; boş bilgiler "—" olur. */
export function isaretleriDoldur(metin: string, a: MagazaAyarlari) {
  const degerler: Record<string, string> = {
    unvan: a.unvan || "Lavinia House",
    adres: a.adres,
    telefon: a.telefon,
    eposta: a.eposta,
    whatsapp: a.whatsapp ? `+${a.whatsapp}` : "",
    vergiDairesi: a.vergiDairesi,
    vergiNo: a.vergiNo,
    mersisNo: a.mersisNo,
    etbisNo: a.etbisNo,
    calismaSaatleri: a.calismaSaatleri,
    iban: a.iban,
    kargoUcreti: para(a.kargoUcreti),
    ucretsizKargoLimiti: para(a.ucretsizKargoLimiti),
    site: siteAdresi("laviniahouse.com").replace(/^https?:\/\//, ""),
  };
  return metin.replace(/\{([a-zA-Z]+)\}/g, (tam, k: string) => (k in degerler ? degerler[k] || "—" : tam));
}

export const ISARETLER = ["unvan", "adres", "telefon", "eposta", "whatsapp", "vergiDairesi", "vergiNo", "mersisNo", "etbisNo", "calismaSaatleri", "iban", "kargoUcreti", "ucretsizKargoLimiti", "site"];

export type Blok = { tur: "p" | "h2"; metin: string } | { tur: "ul"; maddeler: string[] };

/** Düz metni paragraf, ara başlık ve madde bloklarına ayırır (HTML kabul edilmez). */
export function bloklaraAyir(metin: string): Blok[] {
  const bloklar: Blok[] = [];
  for (const parca of metin.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const satirlar = parca.split("\n").map((s) => s.trimEnd()).filter((s) => s.trim());
    let paragraf: string[] = [];
    let maddeler: string[] = [];
    const bosalt = () => {
      if (paragraf.length) bloklar.push({ tur: "p", metin: paragraf.join("\n") });
      if (maddeler.length) bloklar.push({ tur: "ul", maddeler });
      paragraf = [];
      maddeler = [];
    };
    for (const s of satirlar) {
      const t = s.trim();
      if (t.startsWith("## ") || t.startsWith("# ")) {
        bosalt();
        bloklar.push({ tur: "h2", metin: t.replace(/^#+\s*/, "") });
      } else if (/^[-•*]\s+/.test(t)) {
        if (paragraf.length) {
          bloklar.push({ tur: "p", metin: paragraf.join("\n") });
          paragraf = [];
        }
        maddeler.push(t.replace(/^[-•*]\s+/, ""));
      } else {
        if (maddeler.length) {
          bloklar.push({ tur: "ul", maddeler });
          maddeler = [];
        }
        paragraf.push(t);
      }
    }
    bosalt();
  }
  return bloklar;
}
