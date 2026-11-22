/** WhatsApp sohbet bağlantısı (numara yoksa iletişim sayfası). Sunucu ve tarayıcı tarafında kullanılabilir. */
export function waLinki(whatsapp: string, mesaj: string) {
  return whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(mesaj)}` : "/bilgi/iletisim";
}
