// Çizgi ikonlar (dekoratif; ekran okuyuculardan gizli).
type P = { boyut?: number; renk?: string; kalinlik?: number };
const svg = (b: number, r: string, k: number, children: React.ReactNode, ekstra?: React.SVGProps<SVGSVGElement>) => (
  <svg width={b} height={b} viewBox="0 0 24 24" fill="none" stroke={r} strokeWidth={k} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...ekstra}>
    {children}
  </svg>
);

export const AraIkon = ({ boyut = 20, renk = "currentColor", kalinlik = 2.4 }: P) => svg(boyut, renk, kalinlik, <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const KisiIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const KalpIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2, dolu = false }: P & { dolu?: boolean }) =>
  svg(boyut, renk, kalinlik, <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill={dolu ? renk : "none"} />);
export const CantaIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const OkAsagi = ({ boyut = 14, renk = "currentColor", kalinlik = 2.6 }: P) => svg(boyut, renk, kalinlik, <path d="M6 9l6 6 6-6" />);
export const TikIkon = ({ boyut = 20, renk = "#15803D", kalinlik = 2.6 }: P) => svg(boyut, renk, kalinlik, <path d="M5 12l5 5 9-10" />);
export const GozIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const KalkanIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>);
export const KamyonIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>);
export const MesajIkon = ({ boyut = 24, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M4 20l1.4-4.2A8 8 0 1 1 8.6 19z" /><path d="M9 10.5c.5 1.6 1.9 3 3.5 3.5" /></>);
export const KilitIkon = ({ boyut = 20, renk = "#15803D", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const YukleIkon = ({ boyut = 36, renk = "#5A615D", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>);
export const YenileIkon = ({ boyut = 20, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /></>);
export const FiltreIkon = ({ boyut = 20, renk = "currentColor", kalinlik = 2 }: P) => svg(boyut, renk, kalinlik, <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>);
export const KapatIkon = ({ boyut = 22, renk = "currentColor", kalinlik = 2.2 }: P) => svg(boyut, renk, kalinlik, <path d="M6 6l12 12M18 6L6 18" />);
export const InstagramIkon = ({ boyut = 22, renk = "currentColor", kalinlik = 2 }: P) =>
  svg(boyut, renk, kalinlik, <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill={renk} /></>);
