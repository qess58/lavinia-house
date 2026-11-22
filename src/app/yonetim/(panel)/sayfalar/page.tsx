import type { Metadata } from "next";
import Link from "next/link";
import { SAYFALAR, kayitliSayfalar } from "@/lib/sayfalar";
import { tarihSaat } from "@/lib/bicim";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";

export const metadata: Metadata = { title: "Sayfalar" };

export default async function SayfalarListesi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const kayitli = await kayitliSayfalar();
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Sayfalar</h1>
          <p className="y-sub">Hakkımızda, kargo, iade ve yasal metinler. Yasal metinleri bir hukukçuya hazırlatıp buraya yapıştırın.</p>
        </div>
      </div>
      <Mesaj sp={sp} basari={{}} />
      <div className="y-box">
        <table>
          <thead><tr><th>Sayfa</th><th>Durum</th><th>Son değişiklik</th><th><span className="y-gizli">İşlem</span></th></tr></thead>
          <tbody>
            {SAYFALAR.map((s) => {
              const k = kayitli[s.adres];
              const dolu = !!k?.icerik?.trim();
              return (
                <tr key={s.adres}>
                  <td>
                    <Link href={`/yonetim/sayfalar/${s.adres}`}><b>{s.baslik}</b></Link>
                    <span className="y-sm y-mut" style={{ display: "block" }}>{s.aciklama}</span>
                  </td>
                  <td>
                    {dolu ? <span className="y-b y-b-yesil">Yazıldı</span> : s.yasal ? <span className="y-b y-b-kirmizi">Eksik</span> : <span className="y-b y-b-gri">Hazır metin</span>}
                  </td>
                  <td className="y-sm y-nw">{k?.guncelleme ? tarihSaat(new Date(k.guncelleme)) : "—"}</td>
                  <td className="y-nw"><Link className="y-btn y-s" href={`/yonetim/sayfalar/${s.adres}`}>Düzenle</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
