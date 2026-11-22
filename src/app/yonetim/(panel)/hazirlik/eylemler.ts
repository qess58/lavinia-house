"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ornekVerileriTemizle } from "@/lib/hazirlik";
import { yoneticiGerekli } from "@/lib/yetki";

export async function ornekleriTemizle() {
  await yoneticiGerekli();
  await ornekVerileriTemizle();
  revalidatePath("/", "layout");
  redirect("/yonetim/hazirlik?ok=temizlendi");
}
