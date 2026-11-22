"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { girisYap, kurulumYap, type FormDurumu } from "./eylemler";

function Gonder({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="y-btn y-pri" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Lütfen bekleyin…" : children}
    </button>
  );
}

function Hata({ durum }: { durum: FormDurumu }) {
  return durum.hata ? (
    <p className="y-msg y-hata" role="alert">
      {durum.hata}
    </p>
  ) : null;
}

export function GirisFormu() {
  const [durum, eylem] = useActionState(girisYap, {});
  return (
    <form action={eylem} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Hata durum={durum} />
      <div>
        <label className="y-lbl" htmlFor="g-e">E-posta</label>
        <input id="g-e" className="y-inp" name="eposta" type="email" autoComplete="username" required defaultValue={durum.alanlar?.eposta} autoFocus />
      </div>
      <div>
        <label className="y-lbl" htmlFor="g-s">Şifre</label>
        <input id="g-s" className="y-inp" name="sifre" type="password" autoComplete="current-password" required />
      </div>
      <Gonder>Giriş yap</Gonder>
    </form>
  );
}

export function KurulumFormu({ anahtarGerekli }: { anahtarGerekli: boolean }) {
  const [durum, eylem] = useActionState(kurulumYap, {});
  return (
    <form action={eylem} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Hata durum={durum} />
      <div>
        <label className="y-lbl" htmlFor="k-a">Adınız</label>
        <input id="k-a" className="y-inp" name="ad" autoComplete="name" required defaultValue={durum.alanlar?.ad} autoFocus />
      </div>
      <div>
        <label className="y-lbl" htmlFor="k-e">E-posta</label>
        <input id="k-e" className="y-inp" name="eposta" type="email" autoComplete="username" required defaultValue={durum.alanlar?.eposta} />
        <p className="y-hint">Panele bu adresle giriş yapacaksınız.</p>
      </div>
      <div>
        <label className="y-lbl" htmlFor="k-s">Şifre</label>
        <input id="k-s" className="y-inp" name="sifre" type="password" autoComplete="new-password" minLength={10} required />
        <p className="y-hint">En az 10 karakter. Başka sitelerde kullanmadığınız bir şifre seçin.</p>
      </div>
      <div>
        <label className="y-lbl" htmlFor="k-s2">Şifre (tekrar)</label>
        <input id="k-s2" className="y-inp" name="sifre2" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      {anahtarGerekli && (
        <div>
          <label className="y-lbl" htmlFor="k-k">Kurulum anahtarı</label>
          <input id="k-k" className="y-inp" name="anahtar" type="password" required />
          <p className="y-hint">Sunucudaki KURULUM_ANAHTARI ortam değişkeninin değeri.</p>
        </div>
      )}
      <Gonder>Yönetici hesabını oluştur</Gonder>
    </form>
  );
}
