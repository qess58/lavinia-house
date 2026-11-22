"use client";

import { createContext, useContext } from "react";

export type MagazaModu = {
  /** Online satış açık mı (sepet, ödeme). Kapalıysa site vitrin modunda çalışır. */
  satis: boolean;
  /** Fiyatlar gösterilsin mi. Online satış açıkken her zaman true. */
  fiyat: boolean;
  /** WhatsApp numarası (ülke koduyla, yalnızca rakam). */
  whatsapp: string;
};

const Baglam = createContext<MagazaModu>({ satis: true, fiyat: true, whatsapp: "" });

export function MagazaModuSaglayici({ deger, children }: { deger: MagazaModu; children: React.ReactNode }) {
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export const useMagazaModu = () => useContext(Baglam);
