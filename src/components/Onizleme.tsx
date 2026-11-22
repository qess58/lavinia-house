// Kişiselleştirilebilir ürünlerin canlı önizlemesi (yaklaşık görünüm).

const ZEMIN: Record<string, [string, string]> = {
  "Kayın kontrplak": ["#D9B98C", "#B08A5B"],
  Ahşap: ["#D9B98C", "#B08A5B"],
  Doğal: ["#D9B98C", "#B08A5B"],
  "Doğal ahşap": ["#D9B98C", "#B08A5B"],
  Ceviz: ["#9A6B43", "#7A5333"],
  MDF: ["#CDB898", "#A89276"],
  Bambu: ["#E2C48E", "#B9995F"],
  Pleksi: ["#DCEBF3", "#8FB0C2"],
  "Şeffaf pleksi": ["#DCEBF3", "#8FB0C2"],
  Şeffaf: ["#DCEBF3", "#8FB0C2"],
  "Siyah pleksi": ["#1F2321", "#000000"],
  Siyah: ["#1F2321", "#000000"],
  "Ayna altın": ["#D4AF37", "#A8862A"],
  "Ayna pleksi": ["#D4AF37", "#A8862A"],
  "Pastel pembe": ["#F4C9D6", "#D9A0B3"],
  "Pastel mavi": ["#C9DDF0", "#97B6D4"],
};

const koyuMu = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
};

export function zeminBul(degerler: string[], malzeme: string): [string, string] {
  // Seçimlerde renk/malzeme bildiren değer varsa onu kullan (sondan başa: renk, malzemeyi ezer)
  for (const d of [...degerler].reverse()) if (ZEMIN[d]) return ZEMIN[d];
  return ZEMIN[malzeme] ?? ZEMIN.Ahşap;
}

export function boyutBul(degerler: string[]): [number, number] {
  for (const d of degerler) {
    const m = d.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  return [30, 20];
}

type Props = {
  satirlar: string[];
  fontAilesi: string;
  zemin: [string, string];
  yaziRengi?: string;
  olcu: [number, number];
  logo?: boolean;
  etiket?: string;
};

export function LevhaOnizleme({ satirlar, fontAilesi, zemin, yaziRengi, olcu, logo, etiket }: Props) {
  const [en, boy] = olcu;
  const olcek = Math.min(340 / en, 230 / boy);
  const w = en * olcek, h = boy * olcek;
  const x = (400 - w) / 2, y = (270 - h) / 2;
  const renk = yaziRengi ?? (koyuMu(zemin[0]) ? "#EDEDED" : "#3B2A17");
  const ust = satirlar[0] || "İsminiz";
  const alt = satirlar[1] ?? "";
  const fs1 = Math.min(h * 0.3, (w * 0.86) / (Math.max(ust.length, 4) * 0.5));
  const fs2 = Math.min(16, w / 18);
  const metinY = alt ? y + h * 0.54 : y + h * 0.6;
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={`Önizleme: ${[ust, alt].filter(Boolean).join(", ")}`} style={{ width: "88%" }}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={zemin[0]} stroke={zemin[1]} strokeWidth={3} />
      <circle cx={200} cy={y + 16} r={5.5} fill={zemin[1]} />
      <text x={200} y={metinY} textAnchor="middle" fontFamily={fontAilesi} fontSize={Math.round(fs1)} fill={renk}>
        {ust}
      </text>
      {alt && (
        <text x={200} y={y + h * 0.8} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={Math.round(fs2)} letterSpacing={3} fill={renk}>
          {alt.toLocaleUpperCase("tr")}
        </text>
      )}
      {logo && <rect x={x + 14} y={y + h - 48} width={34} height={34} rx={6} fill="none" stroke={renk} strokeWidth={2} strokeDasharray="4 3" />}
      {etiket && (
        <text x={200} y={292} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={12} fill="#6B5A42">
          {etiket}
        </text>
      )}
    </svg>
  );
}
