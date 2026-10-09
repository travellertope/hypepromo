import Image from 'next/image'

interface LogoProps {
  className?: string
}

// Renders wordmark in light mode and rings icon in dark mode via CSS.
export function Logo({ className = 'h-9 w-auto' }: LogoProps) {
  return (
    <>
      {/* Light mode: navy wordmark on near-white header */}
      <Image
        src="/logo-wordmark.png"
        alt="Promoet"
        width={1024}
        height={209}
        className={`${className} logo-light`}
        style={{ objectFit: 'contain' }}
        priority
      />
      {/* Dark mode: neon rings mark on dark header */}
      <Image
        src="/logo-icon.png"
        alt=""
        aria-hidden
        width={1024}
        height={209}
        className={`${className} logo-dark`}
        style={{ objectFit: 'contain' }}
        priority
      />
    </>
  )
}
