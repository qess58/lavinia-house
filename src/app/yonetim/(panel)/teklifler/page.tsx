import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { teklifler } from "@/db/schema";
import { para, tarihSaat } from "@/lib/bicim";
import { yoneticiGerekli } from "@/lib/yetki";
import { Mesaj } from "../Mesaj";
import { TEKLIF_DURUM } from "./durumlar";

export const metadata: Metadata = { title: "Teklifler" };

const SEKMELER = [["", "Tümü"], ["yeni", "Yeni"], ["gonderildi", "Gönderilen"], ["kabul", "Kabul"], ["siparis", "Siparişe dönen"], ["red", "Olumsuz"]] as const;

export default async function TekliflerSayfasi({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await yoneticiGerekli();
  const sp = await searchParams;
  const durum = (Array.isArray(sp.durum) ? sp.durum[0] : sp.durum) ?? "";
  const tum = await (await db()).select().from(teklifler).orderBy(desc(teklifler.olusturma));
  const liste = tum.filter((t) => !durum || t.durum === durum);
  return (
    <>
      <div className="y-top">
        <div>
          <h1>Teklifler</h1>
          <p className="y-sub">“Dosyanı yükle” ve kurumsal sipariş formundan gelen talepler.</p>
        </div>
      </div>
      <Mesaj sp={sp} basari={{}} hata={{ yok: "Teklif bulunamadı." }} />
      <nav className="y-tab-row" aria-label="Durum">
        {SEKMELER.map(([k, ad]) => (
          <Link key={k} className={durum === k ? "y-on" : ""} href={k ? `/yonetim/teklifler?durum=${k}` : "/yonetim/teklifler"}>
            {ad} <small>{k ? tum.filter((t) => t.durum === k).length : tum.length}</small>
          </Link>
        ))}
      </nav>
      <div className="y-box">
        <table>
          <thead><tr><th>Talep</th><th>Kimden</th><th>İstek</th><th className="y-r">Adet</th><th>Teklif</th><th>Durum</th></tr></thead>
          <tbody>
            {liste.map((t) => {
              const [ad, sinif] = TEKLIF_DURUM[t.durum];
              return (
                <tr key={t.id}>
                  <td className="y-nw"><Link href={`/yonetim/teklifler/${t.no}`}><b>T-{t.no}</b></Link><span className="y-sm y-mut" style={{ display: "block" }}>{tarihSaat(t.olusturma)}</span></td>
                  <td>{t.firma ?? t.ad}<span className="y-sm y-mut" style={{ display: "block" }}>{t.tur === "kurumsal" ? `Kurumsal · ${t.ad}` : "Bireysel"}</span></td>
                  <td className="y-sm" style={{ maxWidth: 340 }}>{t.aciklama.length > 110 ? `${t.aciklama.slice(0, 110)}…` : t.aciklama}{t.dosyalar.length > 0 && <span className="y-mut" style={{ display: "block" }}>{t.dosyalar.length} dosya</span>}</td>
                  <td className="y-r y-num">{t.adet}</td>
                  <td className="y-num y-nw">{t.teklifTutari ? para(t.teklifTutari) : "—"}</td>
                  <td><span className={`y-b ${sinif}`}>{ad}</span></td>
                </tr>
              );
            })}
            {liste.length === 0 && <tr><td colSpan={6} className="y-mut" style={{ padding: 24, textAlign: "center" }}>Bu bölümde talep yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
