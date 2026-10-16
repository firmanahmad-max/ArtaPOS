/**
 * Blok "POIN MEMBER" di nota/struk (gaya struk thermal: mono, hitam di putih).
 * Isi baris dari `loyaltyNoteLines` agar sama persis dengan versi WhatsApp & ESC/POS.
 */
export function LoyaltyNoteBlock({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <>
      <div className="my-2 border-t border-dashed" />
      <div className="space-y-0.5 text-[10px] leading-tight">
        <p className="font-semibold">★ POIN MEMBER</p>
        {lines.map((ln) => (
          <p key={ln}>{ln}</p>
        ))}
      </div>
    </>
  );
}
