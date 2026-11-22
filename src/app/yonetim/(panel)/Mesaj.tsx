type Arama = Record<string, string | string[] | undefined>;

const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Sunucu eyleminden sonra adres çubuğundaki ?ok= / ?hata= anahtarına göre bildirim gösterir. */
export function Mesaj({ sp, basari, hata }: { sp: Arama; basari: Record<string, string>; hata?: Record<string, string> }) {
  const b = basari[tek(sp.ok)];
  const h = { genel: "İşlem yapılamadı. Bilgileri kontrol edip tekrar deneyin.", ...(hata ?? {}) }[tek(sp.hata)];
  if (h) return <p className="y-msg y-hata" role="alert">{h}</p>;
  if (b) return <p className="y-msg y-basari" role="status">{b}</p>;
  return null;
}
