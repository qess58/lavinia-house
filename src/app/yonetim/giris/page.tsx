import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { mevcutYonetici, yoneticiVarMi } from "@/lib/yetki";
import { GirisFormu } from "../Formlar";

export const metadata: Metadata = { title: "Giriş" };

export default async function GirisSayfasi() {
  if (await mevcutYonetici()) redirect("/yonetim");
  if (!(await yoneticiVarMi())) redirect("/yonetim/kurulum");
  return (
    <main className="y-app">
      <div className="y-giris">
        <div className="y-card">
          <div className="y-brand" style={{ padding: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="y-logo" src="/logo.png" alt="" width={38} height={38} />
            <span>
              <b style={{ display: "block" }}>Lavinia House</b>
              <span className="y-mut y-sm">Yönetim paneli</span>
            </span>
          </div>
          <h1>Giriş yap</h1>
          <GirisFormu />
          <Link className="y-sm" href="/">← Mağazaya dön</Link>
        </div>
      </div>
    </main>
  );
}
