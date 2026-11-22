import { asc } from "drizzle-orm";
import { db } from "@/db";
import { bultenAboneleri } from "@/db/schema";
import { mevcutYonetici } from "@/lib/yetki";

// Bülten abonelerini (izin tarihiyle) CSV olarak indirir.
export async function GET() {
  if (!(await mevcutYonetici())) return new Response("Yetkisiz", { status: 401 });
  const liste = await (await db()).select().from(bultenAboneleri).orderBy(asc(bultenAboneleri.olusturma));
  const csv = "﻿" + ["E-posta;İzin tarihi", ...liste.map((a) => `${a.eposta};${a.olusturma.toISOString()}`)].join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="bulten-aboneleri.csv"', "Cache-Control": "private, no-store" },
  });
}
