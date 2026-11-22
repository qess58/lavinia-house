import { z } from "zod";
import { ziyaretKaydet } from "@/lib/ziyaret";
import { sinirAsildi } from "@/lib/sinir";

const Sema = z.object({ yol: z.string().max(400), ref: z.string().max(600).optional().default(""), utm: z.string().max(60).optional().default("") });

// Mağaza sayfalarından gelen sayfa görüntüleme bildirimi (çerezsiz sayaç).
export async function POST(req: Request) {
  if (sinirAsildi(req, "ziyaret", 600, 10 * 60_000)) return new Response(null, { status: 204 });
  const veri = Sema.safeParse(await req.json().catch(() => null));
  if (!veri.success) return new Response(null, { status: 204 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "yerel";
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  await ziyaretKaydet({ ...veri.data, ip, ua: req.headers.get("user-agent") ?? "", siteHost: host }).catch((e) => console.error("[sayaç]", e));
  return new Response(null, { status: 204 });
}
