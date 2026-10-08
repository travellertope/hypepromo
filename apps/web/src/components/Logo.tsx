import Image from 'next/image'

interface LogoProps {
  className?: string
  /**
   * wordmark – full "Promoet" text logo, for light/white backgrounds
   * icon     – rings-only mark, for dark dashboard headers (white pill bg)
   */
  variant?: 'wordmark' | 'icon'
}

export function Logo({ className = 'h-9 w-auto', variant = 'wordmark' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <span className="inline-flex items-center justify-center bg-white rounded-lg px-1.5 py-0.5">
        <Image
          src="/logo-icon.png"
          alt="Promoet"
          width={56}
          height={32}
          className={className}
          style={{ objectFit: 'contain' }}
          priority
        />
      </span>
    )
  }

  return (
    <Image
      src="/logo-wordmark.png"
      alt="Promoet"
      width={220}
      height={56}
      className={className}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}
