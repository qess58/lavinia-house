"use client";

import { useEffect } from "react";

/** Paneli açan tarayıcıyı işaretler; bu tarayıcıdan mağazaya yapılan ziyaretler sayaca eklenmez. */
export function YoneticiIsareti() {
  useEffect(() => {
    try {
      localStorage.setItem("lh-yonetici", "1");
    } catch {}
  }, []);
  return null;
}
