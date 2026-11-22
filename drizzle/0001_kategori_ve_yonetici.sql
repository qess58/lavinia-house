CREATE TABLE "oturumlar" (
	"anahtar_ozeti" text PRIMARY KEY NOT NULL,
	"yonetici_id" integer NOT NULL,
	"son_kullanma" timestamp with time zone NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yoneticiler" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"eposta" text NOT NULL,
	"sifre_karmasi" text NOT NULL,
	"rol" text DEFAULT 'sahip' NOT NULL,
	"son_giris" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "yoneticiler_eposta_unique" UNIQUE("eposta")
);
--> statement-breakpoint
ALTER TABLE "kategoriler" ADD COLUMN "menude" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "oturumlar" ADD CONSTRAINT "oturumlar_yonetici_id_yoneticiler_id_fk" FOREIGN KEY ("yonetici_id") REFERENCES "public"."yoneticiler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Tek seferlik temizlik: Mutfak ve Düğün ve Organizasyon kategorileri kaldırıldı, ürünleri taşındı.
UPDATE "urunler" SET "kategori_id" = (SELECT "id" FROM "kategoriler" WHERE "slug" = 'ev-ve-dekor') WHERE "kategori_id" = (SELECT "id" FROM "kategoriler" WHERE "slug" = 'mutfak');--> statement-breakpoint
UPDATE "urunler" SET "kategori_id" = (SELECT "id" FROM "kategoriler" WHERE "slug" = 'kisiye-ozel') WHERE "kategori_id" = (SELECT "id" FROM "kategoriler" WHERE "slug" = 'dugun-ve-organizasyon');--> statement-breakpoint
DELETE FROM "kategoriler" WHERE "slug" IN ('mutfak', 'dugun-ve-organizasyon');--> statement-breakpoint
DELETE FROM "kategoriler" k WHERE k."slug" = 'kurumsal' AND NOT EXISTS (SELECT 1 FROM "urunler" u WHERE u."kategori_id" = k."id");
