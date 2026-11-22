import { bloklaraAyir } from "@/lib/sayfalar";

/** Panelden yazılan düz metni güvenli biçimde (HTML'siz) sayfaya döker. */
export function SayfaMetni({ metin }: { metin: string }) {
  return (
    <>
      {bloklaraAyir(metin).map((b, i) =>
        b.tur === "h2" ? (
          <h2 key={i} style={{ fontSize: 21 }}>{b.metin}</h2>
        ) : b.tur === "ul" ? (
          <ul key={i}>{b.maddeler.map((m, j) => <li key={j}>{m}</li>)}</ul>
        ) : (
          <p key={i} style={{ whiteSpace: "pre-line" }}>{b.metin}</p>
        ),
      )}
    </>
  );
}
