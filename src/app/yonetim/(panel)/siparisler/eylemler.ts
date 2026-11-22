"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { siparisKalemleri, siparisler, siparisOlaylari, urunler } from "@/db/schema";
import { epostaGonder } from "@/lib/eposta";
import { yoneticiGerekli } from "@/lib/yetki";
import { metin } from "../../ortak";
import { siteAdresi } from "@/lib/site";

type Siparis = typeof siparisler.$inferSelect;

async function getir(f: FormData) {
  const y = await yoneticiGerekli();
  const no = Number(f.get("no"));
  const [s] = Number.isInteger(no) ? await (await db()).select().from(siparisler).where(eq(siparisler.no, no)) : [];
  if (!s) redirect("/yonetim/siparisler?hata=yok");
  return { s, y };
}
const geri = (no: number, sonuc: string): never => {
  revalidatePath("/", "layout");
  redirect(`/yonetim/siparisler/${no}?${sonuc}`);
};
const takipLinki = (s: Siparis) => `${siteAdresi()}/siparis/${s.no}?t=${s.token}`;
async function olay(siparisId: number, tur: string, mesaj: string, musteriyeGorunur = true) {
  await (await db()).insert(siparisOlaylari).values({ siparisId, tur, mesaj, musteriyeGorunur });
}
async function kisiselMi(siparisId: number) {
  const k = await (await db()).select({ kisisel: siparisKalemleri.kisisel }).from(siparisKalemleri).where(eq(siparisKalemleri.siparisId, siparisId));
  return k.some((x) => x.kisisel);
}

export async function odemeOnayla(f: FormData) {
  const { s } = await getir(f);
  if (s.durum !== "odeme") geri(s.no, "hata=durum");
  await (await db()).update(siparisler).set({ durum: "yeni", odemeDurumu: "odendi" }).where(eq(siparisler.id, s.id));
  await olay(s.id, "odeme", "Havale / EFT ödemeniz alındı");
  await epostaGonder({ alici: s.musteri.eposta, konu: `Ödemeniz alındı · #${s.no}`, metin: `Merhaba ${s.musteri.ad},\n\n#${s.no} numaralı siparişinizin ödemesi bize ulaştı. Teşekkürler!\n\nSiparişinizi takip edin: ${takipLinki(s)}\n\nLavinia House` });
  geri(s.no, "ok=odeme");
}

export async function tasarimGonder(f: FormData) {
  const { s } = await getir(f);
  if (!["yeni", "onay"].includes(s.durum) || !(await kisiselMi(s.id))) geri(s.no, "hata=durum");
  const gorsel = metin(f, "gorsel", 200);
  if (gorsel && !/^\/medya\/onay\/[a-f0-9]{20}\.(webp|jpg|png)$/.test(gorsel)) geri(s.no, "hata=gorsel");
  const ilk = s.onayDurumu === "hazirlaniyor" || s.onayDurumu === "yok";
  const surum = ilk ? s.tasarimSurumu : s.tasarimSurumu + 1;
  const not = metin(f, "not", 600);
  await (await db())
    .update(siparisler)
    .set({ durum: "onay", onayDurumu: "bekliyor", onayNotu: null, tasarimSurumu: surum, tasarimGorseli: gorsel || s.tasarimGorseli })
    .where(eq(siparisler.id, s.id));
  await olay(s.id, "onay", ilk ? "Tasarımınız onayınıza sunuldu" : `Düzeltilmiş tasarımınız onayınıza sunuldu (sürüm ${surum})`);
  await epostaGonder({
    alici: s.musteri.eposta,
    konu: `Tasarımınız hazır, onayınızı bekliyor · #${s.no}`,
    metin: `Merhaba ${s.musteri.ad},\n\n#${s.no} numaralı siparişinizin tasarımını hazırladık.${not ? `\n\nUstamızın notu: ${not}` : ""}\n\nAşağıdaki bağlantıdan tasarımı inceleyip onaylayabilir ya da düzeltme isteyebilirsiniz:\n${takipLinki(s)}\n\nOnayınızdan sonra üretime başlıyoruz.\n\nLavinia House`,
  });
  geri(s.no, "ok=tasarim");
}

export async function uretimeAl(f: FormData) {
  const { s } = await getir(f);
  if (!["yeni", "onay"].includes(s.durum)) geri(s.no, "hata=durum");
  const onaysiz = s.onayDurumu !== "yok" && s.onayDurumu !== "onaylandi";
  await (await db()).update(siparisler).set({ durum: "uretim" }).where(eq(siparisler.id, s.id));
  await olay(s.id, "durum", "Siparişiniz üretime alındı");
  if (onaysiz) await olay(s.id, "not", "Müşteri onayı beklenmeden üretime alındı", false);
  geri(s.no, "ok=uretim");
}

export async function kargoyaVer(f: FormData) {
  const { s } = await getir(f);
  if (!["yeni", "uretim", "kargo"].includes(s.durum)) geri(s.no, "hata=durum");
  const firma = metin(f, "firma", 40);
  const takipNo = metin(f, "takipNo", 60);
  if (!firma || !takipNo) geri(s.no, "hata=kargo");
  const duzeltme = s.durum === "kargo";
  await (await db()).update(siparisler).set({ durum: "kargo", kargoFirmasi: firma, takipNo }).where(eq(siparisler.id, s.id));
  await olay(s.id, "kargo", duzeltme ? `Kargo bilgisi güncellendi: ${firma} · ${takipNo}` : `Kargoya verildi: ${firma} · Takip no ${takipNo}`);
  await epostaGonder({
    alici: s.musteri.eposta,
    konu: `Siparişiniz kargoda · #${s.no}`,
    metin: `Merhaba ${s.musteri.ad},\n\n#${s.no} numaralı siparişiniz ${firma} ile yola çıktı.\nTakip numarası: ${takipNo}\n\nSiparişiniz: ${takipLinki(s)}\n\nLavinia House`,
  });
  geri(s.no, "ok=kargo");
}

export async function teslimEdildi(f: FormData) {
  const { s } = await getir(f);
  if (s.durum !== "kargo") geri(s.no, "hata=durum");
  await (await db()).update(siparisler).set({ durum: "teslim" }).where(eq(siparisler.id, s.id));
  await olay(s.id, "durum", "Siparişiniz teslim edildi");
  await epostaGonder({
    alici: s.musteri.eposta,
    konu: `Siparişiniz teslim edildi · #${s.no}`,
    metin: `Merhaba ${s.musteri.ad},\n\nSiparişinizin size ulaştığını görüyoruz. Umarız çok beğenmişsinizdir!\n\nÜrününüzü değerlendirmek isterseniz: ${takipLinki(s)}#degerlendir\n\nLavinia House`,
  });
  geri(s.no, "ok=teslim");
}

export async function iptalEt(f: FormData) {
  const { s } = await getir(f);
  if (["teslim", "iptal", "iade"].includes(s.durum)) geri(s.no, "hata=durum");
  const neden = metin(f, "neden", 300);
  const d = await db();
  const kalemler = await d.select().from(siparisKalemleri).where(eq(siparisKalemleri.siparisId, s.id));
  await d.transaction(async (tx) => {
    await tx.update(siparisler).set({ durum: "iptal" }).where(eq(siparisler.id, s.id));
    // Hazır stoklu ürünlerin adedini geri ekle
    for (const k of kalemler) {
      if (!k.urunId) continue;
      await tx.update(urunler).set({ stok: sql`${urunler.stok} + ${k.adet}` }).where(sql`${urunler.id} = ${k.urunId} and ${urunler.stokTipi} = 'adet'`);
    }
  });
  await olay(s.id, "durum", neden ? `Sipariş iptal edildi: ${neden}` : "Sipariş iptal edildi");
  await epostaGonder({
    alici: s.musteri.eposta,
    konu: `Siparişiniz iptal edildi · #${s.no}`,
    metin: `Merhaba ${s.musteri.ad},\n\n#${s.no} numaralı siparişiniz iptal edildi.${neden ? `\nNeden: ${neden}` : ""}${s.odemeDurumu === "odendi" ? "\n\nÖdemeniz aynı yöntemle iade edilecek; bankanıza göre birkaç iş günü sürebilir." : ""}\n\nSorunuz olursa bu e-postayı yanıtlayabilirsiniz.\n\nLavinia House`,
  });
  geri(s.no, "ok=iptal");
}

export async function iadeEt(f: FormData) {
  const { s } = await getir(f);
  if (s.durum !== "teslim") geri(s.no, "hata=durum");
  await (await db()).update(siparisler).set({ durum: "iade", odemeDurumu: s.odemeDurumu === "odendi" ? "iade" : s.odemeDurumu }).where(eq(siparisler.id, s.id));
  await olay(s.id, "durum", "İade işlemi tamamlandı");
  geri(s.no, "ok=iade");
}

export async function icNotKaydet(f: FormData) {
  const { s } = await getir(f);
  await (await db()).update(siparisler).set({ icNot: metin(f, "not", 2000) || null }).where(eq(siparisler.id, s.id));
  geri(s.no, "ok=not");
}
