import type { MetadataRoute } from "next";
import { siteAdresi } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = siteAdresi();
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/sepet", "/odeme", "/siparis", "/api/", "/yonetim"] }], sitemap: `${site}/sitemap.xml` };
}
