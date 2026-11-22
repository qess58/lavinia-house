// Örnek verileri yükler (yalnızca boş veritabanına). Kullanım: npm run db:seed
import { db } from "../src/db";
import { bossaYukle } from "../src/db/ornek-veri";

(async () => {
  const d = await db();
  const yuklendi = await bossaYukle(d);
  console.log(yuklendi ? "Örnek veriler yüklendi." : "Veritabanında zaten ürün var; hiçbir şey yüklenmedi.");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
