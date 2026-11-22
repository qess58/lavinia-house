import type { NextConfig } from "next";

// Tarayıcıya gönderilen güvenlik başlıkları (tüm sayfalar).
const guvenlikBasliklari = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  // Yalnızca https üzerinden açılan sitede geçerli olur; tarayıcıya siteyi hep güvenli bağlantıyla açmasını söyler.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // PGlite (gömülü PostgreSQL), pg ve nodemailer sunucu tarafında Node modülü olarak kalmalı.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "nodemailer"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: guvenlikBasliklari }];
  },
};

export default nextConfig;
