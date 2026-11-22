import { gunAnahtari } from "@/lib/bicim";
import { aylikRapor } from "@/lib/rapor";
import { mevcutYonetici } from "@/lib/yetki";

const hucre = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};
const tl = (k: number) => (k / 100).toFixed(2).replace(".", ",");

// Aylık raporu Excel'in Türkçe ayarlarıyla açılan CSV olarak indirir (noktalı virgül ayraçlı, UTF-8).
export async function GET(req: Request) {
  if (!(await mevcutYonetici())) return new Response("Yetkisiz", { status: 401 });
  const istenen = new URL(req.url).searchParams.get("ay") ?? "";
  const ay = /^\d{4}-\d{2}$/.test(istenen) ? istenen : gunAnahtari().slice(0, 7);
  const r = await aylikRapor(ay);
  const satirlar: (string | number)[][] = [
    [`Lavinia House rapor`, ay],
    [],
    ["Ciro (TL)", tl(r.ozet.ciro)],
    ["Sipariş", r.ozet.siparis],
    ["Satılan ürün (adet)", r.ozet.adet],
    ["Ortalama sepet (TL)", tl(r.ozet.ortalama)],
    ["Ziyaretçi", r.ozet.ziyaretci],
    ["Sayfa görüntüleme", r.ozet.goruntuleme],
    [],
    ["Ürün", "Adet", "Sipariş", "Tutar (TL)"],
    ...r.urunler.map((u) => [u.ad, u.adet, u.siparis, tl(u.ciro)]),
    [],
    ["Gün", "Ciro (TL)", "Sipariş", "Ziyaretçi", "Sayfa görüntüleme"],
    ...r.gunluk.map((g) => [g.gun, tl(g.ciro), g.siparis, g.ziyaretci, g.goruntuleme]),
    [],
    ["Kaynak", "Ziyaretçi"],
    ...r.kaynaklar.map((k) => [k.deger, k.n]),
  ];
  const csv = "﻿" + satirlar.map((s) => s.map(hucre).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lavinia-rapor-${ay}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
