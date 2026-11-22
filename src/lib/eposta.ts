// E-posta gönderimi (SMTP).
// .env dosyasında SMTP_HOST tanımlı değilse e-postalar gönderilmez, sunucu konsoluna yazılır (geliştirme için).
// Alan adınızın e-postası (ör. siparis@laviniahouse.com), Yandex/Google Workspace, Brevo veya benzeri bir SMTP servisi kullanılabilir.
import type { Transporter } from "nodemailer";
import { magazaAyarlari } from "./veri";
import { siteAdresi } from "@/lib/site";

export type Eposta = { alici: string; konu: string; metin: string; yanitla?: string };

let tasiyici: Transporter | null = null;
async function smtp() {
  if (tasiyici) return tasiyici;
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT || 587);
  tasiyici = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return tasiyici;
}

export const epostaBagli = () => !!process.env.SMTP_HOST;

const kac = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Düz metinden sade, her e-posta programında düzgün görünen HTML üretir (bağlantılar tıklanır). */
function html(metin: string) {
  const govde = kac(metin)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#4A2E85">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif;color:#1C1F1E">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="font-weight:700;font-size:18px;margin-bottom:16px;color:#4A2E85">Lavinia House</div>
<div style="background:#fff;border-radius:14px;padding:22px 20px;font-size:15px;line-height:1.55">${govde}</div>
</div></body></html>`;
}

export async function epostaGonder(e: Eposta): Promise<{ gonderildi: boolean; hata?: string }> {
  if (!epostaBagli()) {
    console.info(`\n[e-posta] Alıcı: ${e.alici}\n[e-posta] Konu: ${e.konu}\n${e.metin}\n`);
    return { gonderildi: false };
  }
  try {
    await (await smtp()).sendMail({
      from: process.env.EPOSTA_GONDEREN || `Lavinia House <${process.env.SMTP_USER}>`,
      to: e.alici,
      replyTo: e.yanitla,
      subject: e.konu,
      text: e.metin,
      html: html(e.metin),
    });
    return { gonderildi: true };
  } catch (hata) {
    // E-posta gitmese de sipariş / işlem tamamlanır; hata sunucu kaydına yazılır.
    console.error("[e-posta] gönderilemedi:", e.alici, e.konu, hata);
    return { gonderildi: false, hata: String(hata) };
  }
}

/** Mağaza sahibine bildirim (Ayarlar'daki e-posta adresine; yoksa MAGAZA_EPOSTA). */
export async function magazayaBildir(konu: string, metin: string, yanitla?: string) {
  const alici = process.env.MAGAZA_EPOSTA || (await magazaAyarlari()).eposta;
  if (!alici) return { gonderildi: false };
  return epostaGonder({ alici, konu: `[Lavinia] ${konu}`, metin, yanitla });
}

export const panelLinki = (yol: string) => `${siteAdresi()}/yonetim${yol}`;
