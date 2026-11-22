import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { malzemeler, siparisKalemleri, siparisler, urunler } from "@/db/schema";
import { lazerSvg } from "@/lib/lazer-svg";
import { mevcutYonetici } from "@/lib/yetki";

// Siparişteki kişiye özel ürünün lazer dosyası: /yonetim/svg?no=1056&kalem=12
export async function GET(req: Request) {
  if (!(await mevcutYonetici())) return new Response("Yetkisiz", { status: 401 });
  const p = new URL(req.url).searchParams;
  const no = Number(p.get("no"));
  const kalemId = Number(p.get("kalem"));
  const d = await db();
  const [s] = await d.select().from(siparisler).where(eq(siparisler.no, no));
  const [k] = s ? await d.select().from(siparisKalemleri).where(and(eq(siparisKalemleri.id, kalemId), eq(siparisKalemleri.siparisId, s.id))) : [];
  if (!s || !k) return new Response("Bulunamadı", { status: 404 });
  const [u] = k.urunId ? await d.select({ kisisellestirme: urunler.kisisellestirme, malzeme: urunler.malzeme }).from(urunler).where(eq(urunler.id, k.urunId)) : [];
  const [m] = k.studyo ? await d.select({ ad: malzemeler.ad }).from(malzemeler).where(eq(malzemeler.id, k.studyo.malzemeId)) : [];
  const svg = lazerSvg({ ad: k.ad, secim: k.secim, kisi: k.kisi, studyo: k.studyo }, u?.kisisellestirme ?? [], s.no, m ? `${m.ad} ${k.studyo?.kalinlikMm} mm` : Object.values(k.secim).join(" · "));
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="siparis-${s.no}-${k.id}.svg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
