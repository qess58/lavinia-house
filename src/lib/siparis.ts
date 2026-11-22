// Sipariş oluşturma: tarayıcıdan gelen sepeti doğrular, fiyatları veritabanından YENİDEN hesaplar ve kaydeder.
import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kuponlar, malzemeler, siparisKalemleri, siparisler, siparisOlaylari, urunler } from "@/db/schema";
import { sepetToplami, studyoBirimFiyati, urunBirimFiyati } from "./fiyat";
import { kuponBul, magazaAyarlari } from "./veri";
import { havaleAcik, kartOdemeAcik, odemeAl } from "./odeme";
import { epostaGonder, magazayaBildir, panelLinki } from "./eposta";
import { para } from "./bicim";
import { siteAdresi } from "@/lib/site";

const metin = (max: number) => z.string().trim().max(max);

const StudyoSemasi = z.object({
  malzemeId: z.number().int(),
  kalinlikMm: z.number(),
  en: z.number(),
  boy: z.number(),
  sekil: z.enum(["dikdortgen", "yuvarlak", "oval"]),
  yazi: metin(40),
  font: metin(60),
  islem: z.enum(["gravur", "kesim"]),
  aski: z.boolean(),
  gorsel: z.boolean(),
});

export const SiparisSemasi = z.object({
  kalemler: z
    .array(
      z.discriminatedUnion("tur", [
        z.object({ tur: z.literal("urun"), urunId: z.number().int(), secim: z.record(z.string(), metin(100)), kisi: z.record(z.string(), metin(200)), adet: z.number().int().min(1).max(500) }),
        z.object({ tur: z.literal("studyo"), studyo: StudyoSemasi, adet: z.number().int().min(1).max(500) }),
      ]),
    )
    .min(1, "Sepetiniz boş.")
    .max(50),
  musteri: z.object({ ad: metin(120).min(2, "Ad soyad gerekli."), telefon: metin(30).min(10, "Telefon gerekli."), eposta: z.email("Geçerli bir e-posta yazın.").max(200) }),
  adres: z.object({ il: metin(60).min(2), ilce: metin(60), adres: metin(400).min(8, "Açık adres gerekli.") }),
  fatura: z.object({ kurumsal: z.boolean(), unvan: metin(200).optional(), vergiDairesi: metin(100).optional(), vergiNo: metin(20).optional(), ayniAdres: z.boolean() }),
  hediye: z.boolean(),
  hediyeNotu: metin(200).optional(),
  kuponKodu: metin(40).optional(),
  odemeYontemi: z.enum(["kart", "havale"]),
  taksit: z.union([z.literal(1), z.literal(3), z.literal(6)]),
  sozlesme: z.literal(true, { error: "Sözleşmeyi onaylamanız gerekiyor." }),
});

export type SiparisIstegi = z.infer<typeof SiparisSemasi>;

export class SiparisHatasi extends Error {
  constructor(public hatalar: string[]) {
    super(hatalar.join(" "));
  }
}

export async function siparisOlustur(istek: SiparisIstegi) {
  const d = await db();
  const ayar = await magazaAyarlari();
  const hatalar: string[] = [];

  const urunIdleri = [...new Set(istek.kalemler.flatMap((k) => (k.tur === "urun" ? [k.urunId] : [])))];
  const malzemeIdleri = [...new Set(istek.kalemler.flatMap((k) => (k.tur === "studyo" ? [k.studyo.malzemeId] : [])))];
  const [urunListesi, malzemeListesi] = await Promise.all([
    urunIdleri.length ? d.select().from(urunler).where(inArray(urunler.id, urunIdleri)) : Promise.resolve([]),
    malzemeIdleri.length ? d.select().from(malzemeler).where(inArray(malzemeler.id, malzemeIdleri)) : Promise.resolve([]),
  ]);
  const urun = new Map(urunListesi.map((u) => [u.id, u]));
  const malzeme = new Map(malzemeListesi.map((m) => [m.id, m]));

  const satirlar: (typeof siparisKalemleri.$inferInsert)[] = [];
  const stokDusum = new Map<number, number>();

  for (const k of istek.kalemler) {
    if (k.tur === "urun") {
      const u = urun.get(k.urunId);
      if (!u || u.durum !== "yayinda" || u.silinme) {
        hatalar.push("Sepetinizdeki bir ürün artık satışta değil.");
        continue;
      }
      const sonuc = urunBirimFiyati(u, k.secim, k.kisi);
      if (sonuc.hatalar.length) hatalar.push(`${u.ad}: ${sonuc.hatalar.join(" ")}`);
      if (u.stokTipi === "adet") {
        const toplam = (stokDusum.get(u.id) ?? 0) + k.adet;
        if (toplam > u.stok) hatalar.push(u.stok > 0 ? `${u.ad}: stokta ${u.stok} adet var.` : `${u.ad} tükendi.`);
        stokDusum.set(u.id, toplam);
      }
      const secimMetni = u.secenekler.map((s) => k.secim[s.ad]).filter(Boolean);
      const kisiMetni = u.kisisellestirme
        .filter((a) => a.tip === "metin" && k.kisi[a.id]?.trim())
        .map((a) => k.kisi[a.id].trim());
      const font = u.kisisellestirme.find((a) => a.tip === "font");
      const ozet = [...secimMetni, kisiMetni.length ? `“${kisiMetni.join(" / ")}”` : "", font && k.kisi[font.id] ? k.kisi[font.id] : ""].filter(Boolean).join(" · ");
      satirlar.push({ siparisId: 0, urunId: u.id, tur: "urun", ad: u.ad, ozet, secim: k.secim, kisi: k.kisi, kisisel: u.kisisellestirme.length > 0, birimFiyat: sonuc.birim, adet: k.adet });
    } else {
      const m = malzeme.get(k.studyo.malzemeId);
      if (!m) {
        hatalar.push("Seçilen malzeme bulunamadı.");
        continue;
      }
      const s = studyoBirimFiyati(m, k.studyo.kalinlikMm, k.studyo.en, k.studyo.boy);
      if (s.hatalar.length) hatalar.push(`Kendi tasarımınız: ${s.hatalar.join(" ")}`);
      const ozet = `${k.studyo.en} × ${k.studyo.boy} cm · ${m.ad} ${k.studyo.kalinlikMm} mm · ${k.studyo.islem === "kesim" ? "kesim" : "gravür"}${k.studyo.yazi ? ` · “${k.studyo.yazi}”` : ""}`;
      satirlar.push({ siparisId: 0, tur: "studyo", ad: "Kendi tasarımınız", ozet, studyo: k.studyo, kisisel: true, birimFiyat: s.birim, adet: k.adet });
    }
  }

  let kupon = null;
  if (istek.kuponKodu) {
    const k = await kuponBul(istek.kuponKodu);
    if ("hata" in k) hatalar.push(k.hata ?? "Kupon geçersiz.");
    else kupon = k.kupon;
  }
  if (istek.fatura.kurumsal && (!istek.fatura.unvan || !istek.fatura.vergiNo)) hatalar.push("Kurumsal fatura için unvan ve vergi numarası gerekli.");
  if (!ayar.onlineSatis) throw new SiparisHatasi(["Online satış çok yakında açılıyor. Şimdilik siparişleri WhatsApp ve teklif formuyla alıyoruz."]);
  if (istek.odemeYontemi === "havale" && istek.taksit !== 1) hatalar.push("Havale ile taksit yapılamaz.");
  if (istek.odemeYontemi === "havale" && !havaleAcik(ayar.iban)) hatalar.push("Havale / EFT ile ödeme şu an kapalı.");
  if (istek.odemeYontemi === "kart" && !kartOdemeAcik()) hatalar.push("Kartla ödeme şu an kapalı. Havale / EFT ile ödeyebilirsiniz.");
  if (hatalar.length) throw new SiparisHatasi(hatalar);

  const araToplam = satirlar.reduce((t, s) => t + s.birimFiyat * s.adet, 0);
  if (kupon && araToplam < kupon.altLimit) throw new SiparisHatasi([`Bu kupon ${para(kupon.altLimit)} ve üzeri sepetlerde geçerli.`]);
  const t = sepetToplami({ araToplam, ayarlar: ayar, kupon, hediye: istek.hediye, taksit: istek.odemeYontemi === "kart" ? istek.taksit : 1 });
  const kisiselVar = satirlar.some((s) => s.kisisel);

  // Ödeme (şimdilik test sağlayıcı; gerçek kart bilgisi sunucuya hiç gelmez)
  let odendi = false;
  if (istek.odemeYontemi === "kart") {
    const sonuc = await odemeAl({ tutar: t.toplam, taksit: istek.taksit, aciklama: "Lavinia House siparişi" });
    if (!sonuc.basarili) throw new SiparisHatasi([sonuc.hata ?? "Ödeme alınamadı."]);
    odendi = true;
  }

  const token = randomBytes(18).toString("base64url");
  const kayit = await d.transaction(async (tx) => {
    const [s] = await tx
      .insert(siparisler)
      .values({
        token,
        durum: odendi ? "yeni" : "odeme",
        odemeYontemi: istek.odemeYontemi,
        odemeDurumu: odendi ? "odendi" : "bekliyor",
        taksit: istek.odemeYontemi === "kart" ? istek.taksit : 1,
        musteri: istek.musteri,
        adres: istek.adres,
        fatura: istek.fatura,
        hediye: istek.hediye,
        hediyeNotu: istek.hediye ? istek.hediyeNotu ?? null : null,
        kuponKodu: kupon?.kod ?? null,
        araToplam: t.araToplam,
        kargo: t.kargo,
        indirim: t.indirim,
        hediyeUcreti: t.hediyeUcreti,
        vadeFarki: t.vadeFarki,
        toplam: t.toplam,
        onayDurumu: kisiselVar ? "hazirlaniyor" : "yok",
      })
      .returning();
    await tx.insert(siparisKalemleri).values(satirlar.map((x) => ({ ...x, siparisId: s.id })));
    for (const [id, adet] of stokDusum) await tx.update(urunler).set({ stok: sql`${urunler.stok} - ${adet}` }).where(eq(urunler.id, id));
    if (kupon) await tx.update(kuponlar).set({ kullanim: sql`${kuponlar.kullanim} + 1` }).where(eq(kuponlar.kod, kupon.kod));
    await tx.insert(siparisOlaylari).values({ siparisId: s.id, tur: "siparis", mesaj: odendi ? "Sipariş alındı, ödeme onaylandı" : "Sipariş alındı, havale / EFT ödemesi bekleniyor" });
    return s;
  });

  const link = `${siteAdresi()}/siparis/${kayit.no}?t=${token}`;
  await epostaGonder({
    alici: istek.musteri.eposta,
    konu: `Siparişiniz alındı · #${kayit.no}`,
    metin: `Merhaba ${istek.musteri.ad},\n\n#${kayit.no} numaralı siparişinizi aldık. Toplam: ${para(t.toplam)}.\n${
      kisiselVar ? "Kişiye özel ürünlerinizin tasarımını 1 iş günü içinde onayınıza sunacağız.\n" : ""
    }${odendi ? "" : `\nHavale / EFT bilgileri:\nAlıcı: ${ayar.aliciAdi}\nIBAN: ${ayar.iban || "(Ayarlar’da IBAN girilmedi)"}\nAçıklama: ${kayit.no}\n`}\nSiparişinizi takip edin: ${link}\n\nLavinia House`,
  });
  await d.insert(siparisOlaylari).values({ siparisId: kayit.id, tur: "eposta", mesaj: "Sipariş özeti e-postayla gönderildi" });
  await magazayaBildir(
    `Yeni sipariş #${kayit.no} · ${para(t.toplam)}`,
    `${istek.musteri.ad} (${istek.adres.il}) yeni bir sipariş verdi.\n\n${satirlar.map((x) => `${x.adet} × ${x.ad}`).join("\n")}\n\nToplam: ${para(t.toplam)} · ${
      odendi ? "Kartla ödendi" : "Havale / EFT bekleniyor"
    }${kisiselVar ? "\nKişiye özel ürün var: tasarımı hazırlayıp onaya gönderin." : ""}\n\nPanelde aç: ${panelLinki(`/siparisler/${kayit.no}`)}`,
    istek.musteri.eposta,
  );

  return { no: kayit.no, token, toplam: t.toplam, odemeYontemi: istek.odemeYontemi };
}
