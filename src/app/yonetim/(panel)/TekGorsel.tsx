"use client";

import { useRef, useState } from "react";
import { gorseliKucult } from "@/lib/istemci-yukleme";

/** Tek bir görsel seçtirir, panele yükler ve adresini formdaki gizli alana yazar (kategori ve kurumsal kart fotoğrafı). */
export function TekGorsel({ ad, klasor, mevcut, oran = "4 / 3", aciklama }: { ad: string; klasor: "kategori" | "anasayfa"; mevcut: string | null; oran?: string; aciklama?: string }) {
  const [yol, setYol] = useState(mevcut ?? "");
  const [durum, setDurum] = useState<"" | "yukleniyor" | string>("");
  const ref = useRef<HTMLInputElement>(null);
  const yukle = async (f: File) => {
    setDurum("yukleniyor");
    const form = new FormData();
    form.append("dosya", await gorseliKucult(f));
    form.append("klasor", klasor);
    const r = await fetch("/yonetim/medya", { method: "POST", body: form }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { yol?: string; hata?: string } | null;
    if (d?.yol) {
      setYol(d.yol);
      setDurum("");
    } else setDurum(d?.hata ?? "Yüklenemedi, tekrar deneyin.");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name={ad} value={yol} />
      {yol ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={yol} alt="" style={{ width: "100%", maxWidth: 320, aspectRatio: oran, objectFit: "cover", borderRadius: 12, background: "#F3EEE6" }} />
      ) : (
        aciklama && <p className="y-sm y-mut">{aciklama}</p>
      )}
      <div className="y-row">
        <button type="button" className="y-btn y-s" onClick={() => ref.current?.click()} disabled={durum === "yukleniyor"}>
          {durum === "yukleniyor" ? "Yükleniyor…" : yol ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
        </button>
        {yol && (
          <button type="button" className="y-btn y-s y-gh" onClick={() => setYol("")}>
            Kaldır
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) yukle(f); e.target.value = ""; }} />
      {durum && durum !== "yukleniyor" && <p className="y-msg y-hata">{durum}</p>}
    </div>
  );
}
