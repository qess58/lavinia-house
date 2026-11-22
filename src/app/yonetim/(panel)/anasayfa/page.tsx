import type { Metadata } from "next";
import Link from "next/link";
import { magazaAyarlari } from "@/lib/veri";
import { yoneticiGerekli } from "@/lib/yetki";
import { AnasayfaFormu } from "./AnasayfaFormu";

export const metadata: Metadata = { title: "Ana sayfa" };

type Arama = Promise<Record<string, string | string[] | undefined>>;

export default async function AnasayfaYonetimi({ searchParams }: { searchParams: Arama }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const a = await magazaAyarlari();
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Ana sayfa</h1>
          <p className="y-sub">Ana sayfanın üst bölümündeki fotoğraflar ve kurumsal kartı. Kaydedince sitede hemen görünür.</p>
        </div>
        <Link className="y-btn" href="/" target="_blank">Ana sayfayı gör ↗</Link>
      </div>
      {sp.ok === "kaydedildi" && <p className="y-msg y-basari" role="status">Kaydedildi. Ana sayfa güncellendi.</p>}
      {sp.hata && <p className="y-msg y-hata" role="alert">Kaydedilemedi. Sayfayı yenileyip tekrar deneyin.</p>}
      <AnasayfaFormu key={JSON.stringify(a.anasayfaGorselleri) + a.slaytSuresi + a.kurumsalGorsel} baslangic={a.anasayfaGorselleri} sure={a.slaytSuresi} kurumsalGorsel={a.kurumsalGorsel} />
    </>
  );
}
