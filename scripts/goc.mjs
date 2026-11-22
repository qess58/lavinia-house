// Derleme öncesi veritabanı tablolarını günceller (drizzle/ klasöründeki göçler).
// Vercel'de "npm run build" sırasında çalışır. Veritabanı adresi yoksa (ör. bilgisayarda) hiçbir şey yapmaz.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url =
  process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!url) {
  console.log("[göç] Veritabanı adresi tanımlı değil, tablo güncellemesi atlandı.");
  if (process.env.VERCEL) console.log("[göç] UYARI: Vercel projesine Storage → Neon (Postgres) ekleyip yeniden yayınlayın.");
} else {
  const yerel = /localhost|127\.0\.0\.1/.test(url);
  const adres = url.replace(/([?&]sslmode=)(require|prefer|verify-ca)\b/, "$1verify-full");
  const pool = new pg.Pool({ connectionString: adres, max: 1, ssl: yerel ? undefined : { rejectUnauthorized: false } });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("[göç] Veritabanı tabloları güncel.");
  } finally {
    await pool.end();
  }
}
