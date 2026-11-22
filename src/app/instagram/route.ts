import { NextResponse } from "next/server";

// Instagram profilinizdeki bağlantı için: siteadresi.com/instagram
// Ziyaretçiyi ana sayfaya yönlendirir ve sayaçta kaynağı "Instagram" olarak işaretler.
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/?utm_source=instagram", req.url), 307);
}
