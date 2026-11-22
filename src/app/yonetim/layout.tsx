import type { Metadata } from "next";
import "./yonetim.css";

// Yönetim paneli her istekte veritabanından okur ve arama motorlarına kapalıdır.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Yönetim paneli", template: "%s · Yönetim · Lavinia House" },
  robots: { index: false, follow: false },
};

export default function YonetimDuzeni({ children }: { children: React.ReactNode }) {
  return children;
}
