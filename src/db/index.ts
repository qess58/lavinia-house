import fs from "node:fs";
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { vercelde } from "../lib/site";

export type Db = NodePgDatabase<typeof schema>;

const kuresel = globalThis as unknown as { __lhDb?: Promise<Db>; __lhGocZamani?: number; __lhGocIsi?: Promise<void> };

const goclerKlasoru = () => path.join(process.cwd(), "drizzle");

/** PostgreSQL adresi. Vercel'deki Neon bağlantısı DATABASE_URL (eski adıyla POSTGRES_URL) olarak gelir. */
export const veritabaniAdresi = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// Vercel'de tablolar derleme sırasında güncellenir (scripts/goc.mjs); çalışırken tekrar denenmez.
const calisirkenGoc = () => (vercelde() ? process.env.OTOMATIK_GOC === "1" : process.env.OTOMATIK_GOC !== "0");
const gunlukZamani = () => {
  try {
    return fs.statSync(path.join(goclerKlasoru(), "meta", "_journal.json")).mtimeMs;
  } catch {
    return 0;
  }
};

/**
 * Veritabanı bağlantısı.
 * - DATABASE_URL (ya da POSTGRES_URL) tanımlıysa gerçek PostgreSQL'e bağlanır (canlı site).
 * - Tanımlı değilse proje klasöründe .veri/pglite içinde gömülü PostgreSQL (PGlite) açar ve
 *   ilk açılışta örnek verileri yükler. Böylece bilgisayarınızda ayrıca veritabanı kurmanız gerekmez.
 * Her iki durumda da tablo değişiklikleri (drizzle/ klasöründeki göçler) açılışta otomatik uygulanır.
 */
export function db(): Promise<Db> {
  if (!kuresel.__lhDb) {
    kuresel.__lhDb = baslat().catch((e) => {
      kuresel.__lhDb = undefined;
      throw e;
    });
  }
  // Geliştirme sırasında (npm run dev) sunucu kapatılmadan yeni göç dosyaları gelirse onları da uygula.
  if (process.env.NODE_ENV !== "production") return kuresel.__lhDb.then(yeniGocleriUygula);
  return kuresel.__lhDb;
}

async function goclerUygula(d: Db) {
  if (veritabaniAdresi()) {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(d, { migrationsFolder: goclerKlasoru() });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(d as unknown as Parameters<typeof migrate>[0], { migrationsFolder: goclerKlasoru() });
  }
}

async function yeniGocleriUygula(d: Db) {
  const zaman = gunlukZamani();
  if (kuresel.__lhGocZamani === zaman) return d;
  kuresel.__lhGocIsi ??= goclerUygula(d)
    .then(() => {
      kuresel.__lhGocZamani = zaman;
    })
    .finally(() => {
      kuresel.__lhGocIsi = undefined;
    });
  await kuresel.__lhGocIsi;
  return d;
}

async function baslat(): Promise<Db> {
  const url = veritabaniAdresi();
  kuresel.__lhGocZamani = gunlukZamani();

  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const yerel = /localhost|127\.0\.0\.1/.test(url);
    const pool = new Pool({ connectionString: url, ssl: yerel ? undefined : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10_000 });
    const d = drizzle(pool, { schema });
    if (calisirkenGoc()) await migrate(d, { migrationsFolder: goclerKlasoru() });
    // Boş canlı veritabanı: mağaza ayarları, kategoriler ve malzemeler bir kez yüklenir.
    try {
      const ornek = await import("./ornek-veri");
      await ornek.ilkKurulum(d, process.env.ORNEK_VERI === "1");
    } catch (e) {
      console.error("[veritabanı] İlk kurulum verileri yüklenemedi:", e);
    }
    return d;
  }

  // Vercel'in dosya sistemi kalıcı değildir; gömülü veritabanı orada çalışamaz.
  if (vercelde())
    throw new Error("Veritabanı bağlı değil. Vercel projesinde Storage → Neon (Postgres) ekleyip siteyi yeniden yayınlayın.");

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const klasor = path.join(process.cwd(), ".veri", "pglite");
  fs.mkdirSync(klasor, { recursive: true });
  const istemci = new PGlite(klasor);
  const d = drizzle(istemci, { schema });
  await migrate(d, { migrationsFolder: goclerKlasoru() });
  const ornek = await import("./ornek-veri");
  await ornek.bossaYukle(d as unknown as Db);
  return d as unknown as Db;
}
