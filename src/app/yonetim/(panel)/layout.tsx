import Link from "next/link";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { siparisler, teklifler, yorumlar } from "@/db/schema";
import { yoneticiGerekli } from "@/lib/yetki";
import { hazirlikDurumu } from "@/lib/hazirlik";
import { cikisYap } from "../eylemler";
import { PanelMenu } from "./PanelMenu";
import { YoneticiIsareti } from "./YoneticiIsareti";

export default async function PanelDuzeni({ children }: { children: React.ReactNode }) {
  const y = await yoneticiGerekli();
  const d = await db();
  const say = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [siparis, teklif, yorum, hazirlik] = await Promise.all([
    say(
      d
        .select({ n: count() })
        .from(siparisler)
        .where(or(inArray(siparisler.durum, ["odeme", "yeni"]), and(eq(siparisler.onayDurumu, "duzeltme"), inArray(siparisler.durum, ["yeni", "onay"])))),
    ),
    say(d.select({ n: count() }).from(teklifler).where(eq(teklifler.durum, "yeni"))),
    say(d.select({ n: count() }).from(yorumlar).where(eq(yorumlar.durum, "bekliyor"))),
    hazirlikDurumu(),
  ]);
  const bas = y.ad
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
  return (
    <div className="y-app">
      <YoneticiIsareti />
      <aside className="y-side">
        <div className="y-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="y-logo" src="/logo.png" alt="" width={38} height={38} />
          <span>
            <span className="y-bn">Lavinia House</span>
            <span className="y-bs">Yönetim paneli</span>
          </span>
        </div>
        <PanelMenu sayilar={{ siparisler: siparis, teklifler: teklif, yorumlar: yorum, hazirlik: hazirlik.eksik }} />
        <div className="y-foot">
          <span className="y-av" aria-hidden="true">{bas}</span>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{y.ad}</span>
            <span style={{ display: "flex", gap: 12 }}>
              <Link className="y-out" href="/" target="_blank">Mağaza ↗</Link>
              <form action={cikisYap}>
                <button className="y-out">Çıkış</button>
              </form>
            </span>
          </span>
        </div>
      </aside>
      <main className="y-main">{children}</main>
    </div>
  );
}
