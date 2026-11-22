import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yoneticiVarMi } from "@/lib/yetki";
import { kurulumAnahtariGerekli } from "../eylemler";
import { KurulumFormu } from "../Formlar";

export const metadata: Metadata = { title: "İlk kurulum" };

export default async function KurulumSayfasi() {
  if (await yoneticiVarMi()) redirect("/yonetim/giris");
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
          <div>
            <h1>İlk kurulum</h1>
            <p className="y-sub">Panelin sahibi olarak yönetici hesabınızı oluşturun. Bu sayfa yalnızca bir kez, hiç yönetici yokken açılır.</p>
          </div>
          <KurulumFormu anahtarGerekli={await kurulumAnahtariGerekli()} />
        </div>
      </div>
    </main>
  );
}
