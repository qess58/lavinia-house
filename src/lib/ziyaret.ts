// Çerezsiz ziyaretçi sayacı.
// Ziyaretçiyi tanımak için çerez ya da tarayıcı hafızası kullanılmaz. IP + tarayıcı bilgisi, her gün değişen gizli
// bir anahtarla tek yönlü özetlenir; özet yalnızca o gün aynı kişiyi iki kez saymamak için tutulur ve 2 gün sonra silinir.
// IP adresinin kendisi hiçbir yere kaydedilmez.
import { createHash, createHmac, randomBytes } from "node:crypto";
import { eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { ayarlar, ziyaretDagilim, ziyaretIzleri, ziyaretOzet, ziyaretSayfa } from "@/db/schema";
import { gunAnahtari } from "./bicim";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch|facebookexternalhit|whatsapp|telegram/i;

let gizliAnahtar: string | null = null;
async function gizli() {
  if (gizliAnahtar) return gizliAnahtar;
  const d = await db();
  const [r] = await d.select().from(ayarlar).where(eq(ayarlar.anahtar, "sayac-anahtari"));
  if (r) return (gizliAnahtar = String(r.deger));
  const yeni = randomBytes(32).toString("hex");
  await d.insert(ayarlar).values({ anahtar: "sayac-anahtari", deger: yeni }).onConflictDoNothing();
  const [s] = await d.select().from(ayarlar).where(eq(ayarlar.anahtar, "sayac-anahtari"));
  return (gizliAnahtar = String(s?.deger ?? yeni));
}

export function kaynakBul(ref: string, utm: string, siteHost: string) {
  const u = utm.toLowerCase();
  if (u) {
    if (u.includes("instagram") || u === "ig") return "Instagram";
    if (u.includes("facebook") || u === "fb") return "Facebook";
    if (u.includes("whatsapp")) return "WhatsApp";
    if (u.includes("google")) return "Google";
    return "Kampanya bağlantısı";
  }
  let host = "";
  try {
    host = new URL(ref).hostname.toLowerCase();
  } catch {
    return "Doğrudan";
  }
  if (!host || host === siteHost) return "Doğrudan";
  if (/(^|\.)google\./.test(host)) return "Google";
  if (/instagram\.com$/.test(host)) return "Instagram";
  if (/(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "Facebook";
  if (/(whatsapp\.com|wa\.me)$/.test(host)) return "WhatsApp";
  if (/(bing\.com|yandex\.|duckduckgo\.com|yahoo\.com)/.test(host)) return "Diğer arama motorları";
  if (/(t\.co|x\.com|twitter\.com|tiktok\.com|pinterest\.|youtube\.com)$/.test(host)) return "Diğer sosyal medya";
  return "Diğer siteler";
}

export function cihazBul(ua: string) {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android/i.test(ua)) return "Mobil";
  return "Masaüstü";
}

export function yolTemizle(yol: string) {
  const p = yol.split("?")[0].split("#")[0];
  if (!p.startsWith("/") || p.length > 160) return null;
  if (/^\/(yonetim|api|_next|medya)(\/|$)/.test(p)) return null;
  return p.replace(/\/+$/, "") || "/";
}

export async function ziyaretKaydet(g: { yol: string; ref: string; utm: string; ip: string; ua: string; siteHost: string }) {
  if (!g.ua || BOT.test(g.ua)) return false;
  const yol = yolTemizle(g.yol);
  if (!yol) return false;
  const gun = gunAnahtari();
  const gunAnahtar = createHmac("sha256", await gizli()).update(gun).digest();
  const ozet = createHash("sha256").update(gunAnahtar).update(g.ip).update("|").update(g.ua).digest("hex").slice(0, 32);

  const d = await db();
  const eklenen = await d.insert(ziyaretIzleri).values({ gun, ozet }).onConflictDoNothing().returning({ ozet: ziyaretIzleri.ozet });
  const yeni = eklenen.length > 0;

  await d
    .insert(ziyaretOzet)
    .values({ gun, ziyaretci: yeni ? 1 : 0, goruntuleme: 1 })
    .onConflictDoUpdate({ target: ziyaretOzet.gun, set: { goruntuleme: sql`${ziyaretOzet.goruntuleme} + 1`, ziyaretci: sql`${ziyaretOzet.ziyaretci} + ${yeni ? 1 : 0}` } });
  await d
    .insert(ziyaretSayfa)
    .values({ gun, yol, goruntuleme: 1 })
    .onConflictDoUpdate({ target: [ziyaretSayfa.gun, ziyaretSayfa.yol], set: { goruntuleme: sql`${ziyaretSayfa.goruntuleme} + 1` } });

  if (yeni) {
    const satirlar = [
      { gun, tur: "kaynak" as const, deger: kaynakBul(g.ref, g.utm, g.siteHost), ziyaretci: 1 },
      { gun, tur: "cihaz" as const, deger: cihazBul(g.ua), ziyaretci: 1 },
    ];
    for (const s of satirlar)
      await d
        .insert(ziyaretDagilim)
        .values(s)
        .onConflictDoUpdate({ target: [ziyaretDagilim.gun, ziyaretDagilim.tur, ziyaretDagilim.deger], set: { ziyaretci: sql`${ziyaretDagilim.ziyaretci} + 1` } });
    // 2 günden eski özetleri sil (sayılar ziyaret_ozet tablosunda kalır)
    await d.delete(ziyaretIzleri).where(lt(ziyaretIzleri.gun, gunAnahtari(new Date(Date.now() - 2 * 864e5))));
  }
  return true;
}
