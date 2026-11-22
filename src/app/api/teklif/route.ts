import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { teklifler, type TeklifDosyasi } from "@/db/schema";
import { epostaGonder, magazayaBildir, panelLinki } from "@/lib/eposta";
import { dosyaBilgisi, dosyaYaz } from "@/lib/depo";
import { guvenliAd, TEKLIF_DOSYASI, uzanti, yuklemeKurali } from "@/lib/yukleme-kurallari";

const AZAMI_DOSYA = TEKLIF_DOSYASI.adet;
// Tarayıcının doğrudan Blob'a yüklediği dosyalar (Vercel'de): [{ anahtar, ad }]
const Yuklenen = z.array(z.object({ anahtar: z.string().max(300), ad: z.string().trim().min(1).max(200) })).max(AZAMI_DOSYA);

const Sema = z.object({
  tur: z.enum(["bireysel", "kurumsal"]),
  aciklama: z.string().trim().min(3, "Kısaca ne istediğinizi yazın.").max(3000),
  malzeme: z.string().trim().max(100).default(""),
  olcu: z.string().trim().max(100).default(""),
  adet: z.coerce.number().int().min(1).max(100000).default(1),
  istenenTarih: z.string().trim().max(20).optional(),
  firma: z.string().trim().max(200).optional(),
  sektor: z.string().trim().max(100).optional(),
  vergiNo: z.string().trim().max(20).optional(),
  butce: z.string().trim().max(100).optional(),
  numune: z.coerce.boolean().default(false),
  ad: z.string().trim().min(2, "Adınızı yazın.").max(120),
  eposta: z.email("Geçerli bir e-posta yazın.").max(200),
  telefon: z.string().trim().max(30).default(""),
  kanal: z.enum(["eposta", "telefon", "whatsapp"]).default("eposta"),
  kvkk: z.literal("1", { error: "KVKK metnini onaylayın." }),
});

// "Dosyanı yükle, teklif al" ve kurumsal teklif formu.
export async function POST(req: Request) {
  if (sinirAsildi(req, "teklif", 5, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ hatalar: ["Form okunamadı."] }, { status: 400 });
  }
  const alanlar = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string>;
  const sonuc = Sema.safeParse(alanlar);
  const hatalar = sonuc.success ? [] : [...new Set(sonuc.error.issues.map((i) => i.message))];
  if (sonuc.success && sonuc.data.tur === "kurumsal" && !sonuc.data.firma) hatalar.push("Firma adı gerekli.");

  const dosyalar = form.getAll("dosya").filter((f): f is File => typeof f !== "string" && f.size > 0);
  for (const f of dosyalar) {
    if (!TEKLIF_DOSYASI.uzantilar.includes(uzanti(f.name))) hatalar.push(`${f.name}: bu dosya türü kabul edilmiyor.`);
    if (f.size > TEKLIF_DOSYASI.azami) hatalar.push(`${f.name}: dosya 50 MB'tan büyük.`);
  }
  const onceden: TeklifDosyasi[] = [];
  const ham = form.get("yuklenen");
  if (typeof ham === "string" && ham) {
    let liste: z.infer<typeof Yuklenen> = [];
    try {
      liste = Yuklenen.parse(JSON.parse(ham));
    } catch {
      hatalar.push("Yüklenen dosyalar okunamadı, tekrar deneyin.");
    }
    for (const y of liste) {
      const bilgi = yuklemeKurali(y.anahtar)?.tur === "teklif" ? await dosyaBilgisi(y.anahtar) : null;
      if (bilgi) onceden.push({ ad: y.ad, boyut: bilgi.boyut, yol: y.anahtar });
      else hatalar.push(`${y.ad}: dosya yüklenemedi, tekrar seçin.`);
    }
  }
  if (dosyalar.length + onceden.length > AZAMI_DOSYA) hatalar.push(`En fazla ${AZAMI_DOSYA} dosya yükleyebilirsiniz.`);
  if (hatalar.length || !sonuc.success) return NextResponse.json({ hatalar }, { status: 400 });

  const v = sonuc.data;
  const d = await db();
  const [t] = await d
    .insert(teklifler)
    .values({
      tur: v.tur, aciklama: v.aciklama, malzeme: v.malzeme, olcu: v.olcu, adet: v.adet, istenenTarih: v.istenenTarih || null,
      firma: v.firma || null, sektor: v.sektor || null, vergiNo: v.vergiNo || null, butce: v.butce || null, numune: v.numune,
      ad: v.ad, eposta: v.eposta, telefon: v.telefon, kanal: v.kanal,
    })
    .returning();

  // Dosyalar depoya (disk ya da Vercel Blob) "yuklemeler/T-<no>/<ad>" anahtarıyla yazılır.
  // Tarayıcının doğrudan Blob'a yüklediği dosyalar "yuklemeler/gelen/..." altında kalır.
  const kayitli: TeklifDosyasi[] = [...onceden];
  if (kayitli.length || dosyalar.length) {
    for (const f of dosyalar) {
      const anahtar = `yuklemeler/T-${t.no}/${guvenliAd(f.name, 120)}`;
      await dosyaYaz(anahtar, Buffer.from(await f.arrayBuffer()), f.type || "application/octet-stream");
      kayitli.push({ ad: f.name, boyut: f.size, yol: anahtar });
    }
    await d.update(teklifler).set({ dosyalar: kayitli }).where(eq(teklifler.id, t.id));
  }

  await epostaGonder({
    alici: v.eposta,
    konu: `Talebinizi aldık · T-${t.no}`,
    metin: `Merhaba ${v.ad},\n\nTeklif talebiniz bize ulaştı (T-${t.no}). 1 iş günü içinde fiyat ve teslim tarihiyle dönüyoruz.\n\nLavinia House`,
  });
  await magazayaBildir(
    `Yeni teklif talebi T-${t.no}`,
    `${v.ad}${v.firma ? ` (${v.firma})` : ""} teklif istedi.\n\n${v.aciklama}\n\nAdet: ${v.adet}${kayitli.length ? `\nDosya: ${kayitli.length} adet` : ""}\n\nPanelde aç: ${panelLinki(`/teklifler/${t.no}`)}`,
    v.eposta,
  );
  return NextResponse.json({ no: t.no, dosyaSayisi: kayitli.length }, { status: 201 });
}
