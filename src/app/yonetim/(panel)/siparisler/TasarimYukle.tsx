"use client";

import { useRef, useState } from "react";
import { gorseliKucult } from "@/lib/istemci-yukleme";

/** Tasarım onay görselini yükler; yolu formdaki gizli alana yazar. */
export function TasarimYukle({ mevcut }: { mevcut: string | null }) {
  const [yol, setYol] = useState(mevcut ?? "");
  const [durum, setDurum] = useState<"" | "yukleniyor" | string>("");
  const ref = useRef<HTMLInputElement>(null);
  const yukle = async (f: File) => {
    setDurum("yukleniyor");
    const form = new FormData();
    form.append("dosya", await gorseliKucult(f));
    form.append("klasor", "onay");
    const r = await fetch("/yonetim/medya", { method: "POST", body: form }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { yol?: string; hata?: string } | null;
    if (d?.yol) {
      setYol(d.yol);
      setDurum("");
    } else setDurum(d?.hata ?? "Yüklenemedi, tekrar deneyin.");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="gorsel" value={yol} />
      {yol ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={yol} alt="Müşteriye gösterilecek tasarım" style={{ width: "100%", maxHeight: 360, objectFit: "contain", background: "#F3EEE6", borderRadius: 10 }} />
      ) : (
        <p className="y-sm y-mut">Görsel yüklemezseniz müşteri, seçimlerinden oluşan otomatik önizlemeyi görür.</p>
      )}
      <div className="y-row">
        <button type="button" className="y-btn y-s" onClick={() => ref.current?.click()} disabled={durum === "yukleniyor"}>
          {durum === "yukleniyor" ? "Yükleniyor…" : yol ? "Başka görsel seç" : "Tasarım görseli yükle"}
        </button>
        {yol && <button type="button" className="y-btn y-s y-gh" onClick={() => setYol("")}>Görseli kaldır</button>}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) yukle(f); e.target.value = ""; }} />
      {durum && durum !== "yukleniyor" && <p className="y-msg y-hata">{durum}</p>}
    </div>
  );
}
