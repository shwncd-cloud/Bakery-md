/// Recreation of the Hornillas oven-arch-and-loaf mark from the brand
/// board, as an inline component so it can be recolored/resized with CSS
/// rather than shipping a raster logo.
export function OvenLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M25 62 V45 A25 25 0 0 1 75 45 V62 Z"
        fill="none"
        stroke="var(--color-dark)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d="M30 62 V47 A20 20 0 0 1 70 47 V62" fill="none" stroke="var(--color-gold)" strokeWidth="3" />
      <ellipse cx="50" cy="63" rx="17" ry="9" fill="var(--color-terracotta)" />
      <path d="M40 60 Q50 55 60 60" fill="none" stroke="var(--color-dark)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
