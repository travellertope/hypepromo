/**
 * Promoet wordmark: "Pr" + interlocking chain link + "oet".
 * Letterforms use currentColor so the mark stays legible in both themes —
 * the source design hardcoded navy, which is invisible on a dark background.
 */
export function Logo({ className = 'h-9 w-auto', showTagline = true }: { className?: string; showTagline?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 280 65" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Promoet">
      <text x="0" y="47" fontFamily="var(--font-display), sans-serif" fontWeight="900" fontSize="44" fill="currentColor">Pr</text>
      <path
        d="M68 34C68 25.1634 75.1634 18 84 18C92.8366 18 100 25.1634 100 34C100 42.8366 92.8366 50 84 50C75.1634 50 68 42.8366 68 34Z"
        stroke="#f97316"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M96 34C96 25.1634 103.163 18 112 18C120.837 18 128 25.1634 128 34C128 42.8366 120.837 50 112 50C103.163 50 96 42.8366 96 34Z"
        stroke="currentColor"
        strokeWidth="6"
        fill="none"
        className="text-cyber-neon"
      />
      <text x="132" y="47" fontFamily="var(--font-display), sans-serif" fontWeight="900" fontSize="44" fill="currentColor">oet</text>
      {showTagline && (
        <text x="1" y="61" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="10" fill="currentColor" opacity="0.55" letterSpacing="3">
          AD NETWORK
        </text>
      )}
    </svg>
  )
}
