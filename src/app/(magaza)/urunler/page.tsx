import type { Metadata } from "next";
import Link from "next/link";
import { magazaKategorileri, yayindakiUrunler, type UrunKartVerisi } from "@/lib/veri";
import { kucukHarf } from "@/lib/bicim";
import { FiltreCubugu, ListeSecimleri } from "@/components/Filtreler";
import { UrunIzgarasi } from "@/components/UrunIzgarasi";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Arama> }): Promise<Metadata> {
  const sp = await searchParams;
  const { dolu } = await magazaKategorileri();
  const k = dolu.find((x) => x.slug === tek(sp.kategori));
  // Yalnızca "Tüm ürünler" ve sade kategori sayfaları arama motorlarında listelenir; filtreli/sıralı/arama sonuçları listelenmez.
  const ekParametre = Object.keys(sp).some((p) => p !== "kategori");
  const temel: Metadata = k
    ? { title: k.ad, description: k.aciklama || `${k.ad}: Lavinia House'ta lazerle üretilen ${k.ad.toLocaleLowerCase("tr")} ürünleri.`, alternates: { canonical: `/urunler?kategori=${k.slug}` } }
    : { title: "Tüm ürünler", description: "Mekanik ahşap modeller, isimlikler ve kişiye özel lazer kesim ürünlerin tamamı.", alternates: { canonical: "/urunler" } };
  return ekParametre || (tek(sp.kategori) && !k) ? { ...temel, robots: { index: false, follow: true } } : temel;
}

type Arama = Record<string, string | string[] | undefined>;
const coklu = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const OZELLIKLER = [
  { k: "kisisel", ad: "Kişiye özel yazı eklenebilir", kisa: "Kişiye özel", f: (u: UrunKartVerisi) => u.kisisel },
  { k: "indirim", ad: "İndirimde", kisa: "İndirimde", f: (u: UrunKartVerisi) => !!u.indirimliFiyat && u.indirimliFiyat < u.fiyat },
  { k: "hizli", ad: "1–2 iş gününde hazır", kisa: "Hızlı hazırlanır", f: (u: UrunKartVerisi) => u.hizli },
  { k: "set", ad: "Yapım seti (kendin kur)", kisa: "Yapım seti", f: (u: UrunKartVerisi) => u.yapimSeti },
];
const FIYAT_ARALIKLARI = [
  { k: "a", ad: "250 ₺ altı", min: 0, max: 25000 },
  { k: "b", ad: "250 – 500 ₺", min: 25000, max: 50000 },
  { k: "c", ad: "500 – 1.000 ₺", min: 50000, max: 100000 },
  { k: "d", ad: "1.000 ₺ üzeri", min: 100000, max: Infinity },
];

export default async function UrunlerSayfasi({ searchParams }: { searchParams: Promise<Arama> }) {
  const sp = await searchParams;
  const [tum, { dolu: kategoriler }] = await Promise.all([yayindakiUrunler(), magazaKategorileri()]);
  // Silinmiş ya da boş bir kategoriye eski bağlantıyla gelinirse tüm ürünler gösterilir.
  const kategori = kategoriler.some((k) => k.slug === tek(sp.kategori)) ? tek(sp.kategori) : "";
  const malz = coklu(sp.malzeme);
  const oz = coklu(sp.ozellik);
  const aralik = FIYAT_ARALIKLARI.find((a) => a.k === tek(sp.fiyat));
  const min = Number(tek(sp.min)) * 100 || 0;
  const max = Number(tek(sp.max)) * 100 || Infinity;
  const puan = tek(sp.puan) === "45";
  const q = kucukHarf(tek(sp.q).trim());
  const favori = tek(sp.favori) === "1";
  const siralama = tek(sp.sirala) || "oner";

  const gecer = (u: UrunKartVerisi, haric?: string) =>
    (haric === "kategori" || !kategori || u.kategoriSlug === kategori) &&
    (haric === "malzeme" || !malz.length || malz.includes(u.malzeme)) &&
    (haric === "ozellik" || oz.every((k) => OZELLIKLER.find((o) => o.k === k)?.f(u) ?? true)) &&
    (!aralik || (u.satis >= aralik.min && u.satis < aralik.max)) &&
    u.satis >= min &&
    u.satis <= max &&
    (!puan || (u.puan ?? 0) >= 4.5) &&
    (!q || u.aramaMetni.includes(q));

  const SIRALAR: Record<string, (a: UrunKartVerisi, b: UrunKartVerisi) => number> = {
    oner: (a, b) => a.sira - b.sira,
    cok: (a, b) => b.yorumSayisi - a.yorumSayisi,
    artan: (a, b) => a.satis - b.satis,
    azalan: (a, b) => b.satis - a.satis,
    puan: (a, b) => (b.puan ?? 0) - (a.puan ?? 0),
    yeni: (a, b) => b.id - a.id,
  };
  const liste = tum.filter((u) => gecer(u)).sort(SIRALAR[siralama] ?? SIRALAR.oner);
  const katAd = kategoriler.find((k) => k.slug === kategori)?.ad;
  const malzemeler = [...new Set(tum.map((u) => u.malzeme).filter(Boolean))];

  const parametre = (degis: Record<string, string | string[] | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) coklu(v).forEach((x) => p.append(k, x));
    for (const [k, v] of Object.entries(degis)) {
      p.delete(k);
      coklu(v ?? undefined).forEach((x) => p.append(k, x));
    }
    const s = p.toString();
    return s ? `/urunler?${s}` : "/urunler";
  };
  const aktifler: { ad: string; href: string }[] = [];
  if (katAd) aktifler.push({ ad: katAd, href: parametre({ kategori: null }) });
  malz.forEach((m) => aktifler.push({ ad: m, href: parametre({ malzeme: malz.filter((x) => x !== m) }) }));
  oz.forEach((o) => aktifler.push({ ad: OZELLIKLER.find((x) => x.k === o)?.ad ?? o, href: parametre({ ozellik: oz.filter((x) => x !== o) }) }));
  if (aralik) aktifler.push({ ad: aralik.ad, href: parametre({ fiyat: null }) });
  if (min || max !== Infinity) aktifler.push({ ad: `${min / 100 || 0} – ${max === Infinity ? "∞" : max / 100} ₺`, href: parametre({ min: null, max: null }) });
  if (puan) aktifler.push({ ad: "4,5 ve üzeri puan", href: parametre({ puan: null }) });
  if (q) aktifler.push({ ad: `“${tek(sp.q).trim()}”`, href: parametre({ q: null }) });
  if (favori) aktifler.push({ ad: "Favorilerim", href: parametre({ favori: null }) });

  const baslik = favori ? "Favorilerim" : q ? `“${tek(sp.q).trim()}” için sonuçlar` : katAd ?? "Tüm ürünler";

  return (
    <main className="wrap">
      <nav className="crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true">›</span>
        <span>{katAd ?? "Tüm ürünler"}</span>
      </nav>
      <div className="lbas">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(26px, 3vw, 36px)" }}>{baslik}</h1>
          {!favori && <span className="mut">{liste.length} ürün</span>}
        </div>
        <ListeSecimleri
          kategoriler={kategoriler.map((k) => ({ k: k.slug, ad: k.ad, n: tum.filter((u) => u.kategoriSlug === k.slug && gecer(u, "kategori")).length }))}
          kategori={kategori}
          siralama={siralama}
        />
      </div>
      <FiltreCubugu
        kategoriler={kategoriler.map((k) => ({ k: k.slug, ad: k.ad, n: tum.filter((u) => u.kategoriSlug === k.slug && gecer(u, "kategori")).length }))}
        malzemeler={malzemeler.map((m) => ({ ad: m, n: tum.filter((u) => u.malzeme === m && gecer(u, "malzeme")).length }))}
        ozellikler={OZELLIKLER.map((o) => ({ k: o.k, ad: o.ad, kisa: o.kisa, n: tum.filter((u) => o.f(u) && gecer(u, "ozellik")).length }))}
        araliklar={FIYAT_ARALIKLARI.map((a) => ({ k: a.k, ad: a.ad }))}
        aktifSayisi={aktifler.filter((a) => !a.ad.startsWith("“") && a.ad !== katAd && a.ad !== "Favorilerim").length}
      />
      {aktifler.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 14 }}>
          {aktifler.map((a) => (
            <Link key={a.ad} className="act" href={a.href} aria-label={`${a.ad} filtresini kaldır`}>
              {a.ad}
              <span className="x" aria-hidden="true">×</span>
            </Link>
          ))}
          <Link className="sm" href="/urunler" style={{ fontWeight: 600, marginLeft: 4 }}>Tümünü temizle</Link>
        </div>
      )}
      <section style={{ paddingTop: 22, paddingBottom: 64 }} aria-label="Ürünler">
        <UrunIzgarasi urunler={liste} favoriModu={favori} />
        {liste.length > 0 && !favori && (
          <div className="card" style={{ marginTop: 40, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", background: "#F1ECF8", borderColor: "#DCCFEE" }}>
            <div>
              <p style={{ fontWeight: 700 }}>Aradığınızı bulamadınız mı?</p>
              <p className="sm" style={{ color: "#3F4542" }}>Ölçüsünü ve fikrinizi gönderin, sizin için üretelim.</p>
            </div>
            <Link className="btn s dk" href="/teklif">Teklif iste</Link>
          </div>
        )}
      </section>
    </main>
  );
}
