import { NextResponse } from "next/server";
import { COK_FAZLA, sinirAsildi } from "@/lib/sinir";
import { z } from "zod";
import { db } from "@/db";
import { bultenAboneleri } from "@/db/schema";

export async function POST(req: Request) {
  if (sinirAsildi(req, "bulten", 5, 10 * 60_000)) return NextResponse.json(COK_FAZLA, { status: 429 });
  const g = z.object({ eposta: z.email().max(200), izin: z.literal(true) }).safeParse(await req.json().catch(() => null));
  if (!g.success) return NextResponse.json({ hata: "Geçerli bir e-posta yazın ve e-posta iznini işaretleyin." }, { status: 400 });
  const d = await db();
  await d.insert(bultenAboneleri).values({ eposta: g.data.eposta.toLowerCase() }).onConflictDoNothing();
  return NextResponse.json({ tamam: true });
}
