"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { yorumlar } from "@/db/schema";
import { yoneticiGerekli } from "@/lib/yetki";
import { metin } from "../../ortak";

const git = (f: FormData, s: string): never => {
  revalidatePath("/", "layout");
  const sekme = String(f.get("sekme") ?? "");
  redirect(`/yonetim/yorumlar?${sekme ? `durum=${encodeURIComponent(sekme)}&` : ""}${s}`);
};
const kimlik = (f: FormData) => {
  const n = Number(f.get("id"));
  return Number.isInteger(n) ? n : 0;
};

export async function yorumDurum(f: FormData) {
  await yoneticiGerekli();
  const durum = f.get("durum") === "yayinda" ? "yayinda" : "gizli";
  await (await db()).update(yorumlar).set({ durum }).where(eq(yorumlar.id, kimlik(f)));
  git(f, `ok=${durum}`);
}

export async function yorumYanitla(f: FormData) {
  await yoneticiGerekli();
  await (await db()).update(yorumlar).set({ yanit: metin(f, "yanit", 1000) || null }).where(eq(yorumlar.id, kimlik(f)));
  git(f, "ok=yanit");
}

export async function yorumSil(f: FormData) {
  await yoneticiGerekli();
  await (await db()).delete(yorumlar).where(eq(yorumlar.id, kimlik(f)));
  git(f, "ok=silindi");
}
