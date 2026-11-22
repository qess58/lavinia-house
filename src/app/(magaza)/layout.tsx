import type { Metadata } from "next";
import { Kabuk } from "@/components/Kabuk";
import { magazaAyarlari } from "@/lib/veri";

// Mağaza sayfaları veritabanından okur; her istekte güncel veriyle oluşturulur.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const a = await magazaAyarlari();
  return a.googleDogrulama ? { verification: { google: a.googleDogrulama } } : {};
}

export default function MagazaDuzeni({ children }: { children: React.ReactNode }) {
  return <Kabuk>{children}</Kabuk>;
}
