"use client";

import Link from "next/link";
import { useSepet } from "./Saglayicilar";
import { CantaIkon } from "./Ikonlar";

export function SepetRozeti() {
  const { adet, hazir } = useSepet();
  return (
    <Link className="ib" href="/sepet" aria-label={`Sepetim, ${adet} ürün`}>
      <CantaIkon />
      <span className="l2">Sepetim</span>
      {hazir && adet > 0 && <span className="bdg">{adet}</span>}
    </Link>
  );
}
