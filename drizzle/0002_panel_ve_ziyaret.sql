CREATE TABLE "ziyaret_dagilim" (
	"gun" date NOT NULL,
	"tur" text NOT NULL,
	"deger" text NOT NULL,
	"ziyaretci" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ziyaret_dagilim_gun_tur_deger_pk" PRIMARY KEY("gun","tur","deger")
);
--> statement-breakpoint
CREATE TABLE "ziyaret_izleri" (
	"gun" date NOT NULL,
	"ozet" text NOT NULL,
	CONSTRAINT "ziyaret_izleri_gun_ozet_pk" PRIMARY KEY("gun","ozet")
);
--> statement-breakpoint
CREATE TABLE "ziyaret_ozet" (
	"gun" date PRIMARY KEY NOT NULL,
	"ziyaretci" integer DEFAULT 0 NOT NULL,
	"goruntuleme" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ziyaret_sayfa" (
	"gun" date NOT NULL,
	"yol" text NOT NULL,
	"goruntuleme" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ziyaret_sayfa_gun_yol_pk" PRIMARY KEY("gun","yol")
);
--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "tasarim_gorseli" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "ic_not" text;--> statement-breakpoint
ALTER TABLE "teklifler" ADD COLUMN "teklif_tutari" integer;--> statement-breakpoint
ALTER TABLE "teklifler" ADD COLUMN "yanit" text;--> statement-breakpoint
ALTER TABLE "teklifler" ADD COLUMN "ic_not" text;--> statement-breakpoint
ALTER TABLE "yorumlar" ADD COLUMN "siparis_id" integer;