import { magazaAyarlari, magazaKategorileri } from "@/lib/veri";
import { UstBilgi } from "./UstBilgi";
import { AltBilgi } from "./AltBilgi";
import { ZiyaretSayaci } from "./ZiyaretSayaci";
import { MagazaModuSaglayici } from "./MagazaModu";
import { magazaModu } from "@/lib/mod";
import { VARSAYILAN_AYARLAR } from "@/lib/tipler";

/** Mağaza sayfalarının ortak üst ve alt bilgisi. Kategoriler yönetim panelinden gelir. */
export async function Kabuk({ children }: { children: React.ReactNode }) {
  const [ayarlar, kategoriler] = await Promise.all([magazaAyarlari(), magazaKategorileri()]);
  const menu = kategoriler.menu.map((k) => ({ slug: k.slug, ad: k.ad }));
  const mod = magazaModu(ayarlar);
  // Vitrin modunda üst şerit boşsa varsayılan duyuru gösterilir.
  // Vitrin modunda kargo kampanyası gibi satış duyuruları yerine "çok yakında" duyurusu gösterilir (Ayarlar'da özel bir metin yazılmadıysa).
  const ozelBant = ayarlar.kampanyaBandi && ayarlar.kampanyaBandi !== VARSAYILAN_AYARLAR.kampanyaBandi;
  const bant = mod.satis ? ayarlar.kampanyaBandi : ozelBant ? ayarlar.kampanyaBandi : "Online satış çok yakında! Sipariş ve fiyat bilgisi için bize ulaşın";
  return (
    <MagazaModuSaglayici deger={mod}>
      <UstBilgi bant={bant} kategoriler={menu} satis={mod.satis} />
      {children}
      <AltBilgi ayarlar={ayarlar} kategoriler={menu} />
      <ZiyaretSayaci />
    </MagazaModuSaglayici>
  );
}
