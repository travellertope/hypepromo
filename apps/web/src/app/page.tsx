import Link from 'next/link'
import type { Metadata } from 'next'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BudgetCalculator } from '@/components/marketing/BudgetCalculator'
import { AuthModalProvider } from '@/components/auth/AuthModal'
import { AuthCta } from '@/components/auth/AuthCta'

export const metadata: Metadata = {
  title: 'Promoet — Gamified Social Advertising & Micro-Influencer Network',
  description:
    'Promoet bridges brands and micro-influencers through gamified click-based campaigns. Set your CPC, distribute assets, and pay only for verified unique engagement.',
}

const NAV = [
  ['Features', '#features'],
  ['How It Works', '#how-it-works'],
  ['CPC Estimator', '#calculator'],
  ['Success Stories', '#testimonials'],
  ['FAQ', '#faq'],
] as const

const FEATURES = [
  {
    accent: 'text-cyber-neon',
    title: 'Custom CPC Budgeting',
    body: 'Set your exact Cost Per Click in Naira (₦). A transparent distribution model rewards creators fairly while keeping campaigns predictable.',
    icon: (
      <path d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M11 16v4" strokeLinecap="round" />
    ),
  },
  {
    accent: 'text-purple-400',
    title: 'Layered Anti-Fraud',
    body: 'Device and IP hashing, rate limiting, and bot scoring filter out invalid traffic, so you pay for genuine human engagement.',
    icon: <path d="M12 3l7 3v6c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-3z" strokeLinejoin="round" />,
  },
  {
    accent: 'text-cyber-accent',
    title: 'Fast Wallet Payouts',
    body: 'Creators withdraw earnings to local bank accounts once clicks clear verification. Balances update as results come in.',
    icon: <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" strokeLinejoin="round" />,
  },
]

const STEPS = [
  ['Deploy Campaign', 'Brands upload ad assets — videos, banners, captions — then set their CPC and total budget in minutes.'],
  ['Creators Share', 'Micro-influencers grab unique referral links and publish across TikTok, WhatsApp Status, Instagram Reels and X.'],
  ['Earn & Scale', "Every verified unique click credits the creator's wallet while delivering targeted traffic to the brand."],
]

const TESTIMONIALS = [
  {
    quote: 'Promoet helped us acquire verified active users for our product launch quickly. The ROI was unmatched compared to traditional ads.',
    initials: 'AM',
    name: 'Adeola M.',
    role: 'CMO, Zenith Apparel',
    accent: 'text-cyber-neon border-cyber-neon',
  },
  {
    quote: 'As a micro-influencer, I make steady weekly payouts sharing campaigns through Promoet. The bank withdrawals are a game-changer.',
    initials: 'TH',
    name: 'Tunde H.',
    role: 'Verified Creator',
    accent: 'text-purple-400 border-purple-500',
  },
  {
    quote: 'The anti-fraud metrics give us confidence. We only pay for actual unique human engagement. This is the future of social advertising.',
    initials: 'FK',
    name: 'Femi K.',
    role: 'Growth Lead, CyberStride',
    accent: 'text-cyber-accent border-cyber-accent',
  },
]

const FAQ = [
  ['How are clicks verified?', 'Each click is checked with device and IP hashing, rate limiting and bot scoring before it is counted, so duplicates and automated traffic are filtered out.'],
  ['How quickly do creators get paid?', 'Earnings land in your wallet once a click clears verification, and can be withdrawn to your local bank account from the wallet screen.'],
  ['How do advertisers set their budget?', 'Advertisers choose a Cost Per Click in Naira and fund a campaign pool, with visibility over delivered clicks and engagement performance.'],
]

function Icon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}

// Stand-ins for the design's fa-bullhorn / fa-gamepad / fa-arrow-right,
// drawn inline so the page needs no icon-font CDN.
const MegaphoneIcon = (
  <Icon className="w-[1.1em] h-[1.1em] shrink-0">
    <path d="M3 11.5 20 6v12L3 12.5z" strokeLinejoin="round" />
    <path d="M11.2 16.6a3 3 0 1 1-5.6-1.7" strokeLinecap="round" />
  </Icon>
)

const GamepadIcon = (
  <Icon className="w-[1.1em] h-[1.1em] shrink-0">
    <path d="M7 11.5h3M8.5 10v3" strokeLinecap="round" />
    <path d="M15 12.5h.01M17.5 10.5h.01" strokeLinecap="round" strokeWidth="2.4" />
    <path
      d="M16.9 6.5H7.1a3.6 3.6 0 0 0-3.57 3.1C3.45 10.2 3 14 3 15.3a2.7 2.7 0 0 0 2.7 2.7c.9 0 1.35-.45 1.8-.9l1.1-1.1a1.8 1.8 0 0 1 1.27-.53h3.26a1.8 1.8 0 0 1 1.27.53l1.1 1.1c.45.45.9.9 1.8.9a2.7 2.7 0 0 0 2.7-2.7c0-1.3-.45-5.1-.53-5.7a3.6 3.6 0 0 0-3.57-3.1z"
      strokeLinejoin="round"
    />
  </Icon>
)

const ArrowRightIcon = (
  <Icon className="w-3 h-3 shrink-0">
    <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
)

export default function Home() {
  return (
    <AuthModalProvider>
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 bg-cyber-card border-b border-cyber-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link href="/" className="text-cyber-text shrink-0" aria-label="Promoet home">
            <Logo className="h-8 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-cyber-muted">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="whitespace-nowrap hover:text-cyber-neon transition">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <AuthCta
              role="creator"
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl text-xs font-bold text-cyber-muted hover:text-cyber-text transition"
            >
              Sign In
            </AuthCta>
            <AuthCta
              role="advertiser"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-accent text-white text-xs font-bold hover:opacity-90 transition"
            >
              Launch Campaign
              {ArrowRightIcon}
            </AuthCta>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-[radial-gradient(circle,rgba(121,40,202,0.16)_0%,transparent_70%)]"
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-cyber-text leading-[1.1]">
                Turn Social Feeds Into <span className="text-cyber-neon">Instant Revenue</span>
              </h1>
              <p className="text-base sm:text-lg text-cyber-muted leading-relaxed max-w-2xl mx-auto">
                Promoet bridges brands and micro-influencers through gamified click-based campaigns. Set your CPC,
                distribute visual assets, and pay only for verified unique engagement.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <AuthCta role="advertiser" className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl bg-cyber-neon text-cyber-dark font-extrabold text-sm hover:opacity-90 transition">
                  {MegaphoneIcon}
                  Start Advertising as a Brand
                </AuthCta>
                <AuthCta role="creator" className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl glass-panel text-cyber-text font-bold text-sm hover:border-cyber-neon transition">
                  <span className="text-cyber-neon inline-flex">{GamepadIcon}</span>
                  Join as a Micro-Influencer
                </AuthCta>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-cyber-card border-t border-cyber-border scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-3xl md:text-4xl font-extrabold text-cyber-text">
                Why Brands &amp; Creators Choose Promoet
              </h2>
              <p className="text-sm text-cyber-muted">
                Performance-based affiliate tracking combined with gamified engagement loops.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-cyber-dark border border-cyber-border p-8 rounded-2xl hover:border-cyber-neon/50 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-xl bg-cyber-card border border-cyber-border flex items-center justify-center mb-6 ${f.accent}`}>
                    <Icon className="w-6 h-6">{f.icon}</Icon>
                  </div>
                  <h3 className="text-xl font-bold text-cyber-text mb-3">{f.title}</h3>
                  <p className="text-sm text-cyber-muted leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-cyber-text text-center mb-16">
              How Promoet Works in 3 Easy Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {STEPS.map(([title, body], i) => (
                <div key={title} className="glass-panel p-8 pt-10 rounded-2xl relative">
                  <span className="absolute -top-5 left-6 w-10 h-10 rounded-xl bg-cyber-accent text-white font-black text-lg flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                  <h3 className="text-xl font-bold text-cyber-text mb-3">{title}</h3>
                  <p className="text-sm text-cyber-muted leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section id="calculator" className="py-20 bg-cyber-card border-t border-cyber-border scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <BudgetCalculator />
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-cyber-text text-center mb-16">
              Loved by Brands &amp; Top Creators
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="glass-panel p-6 rounded-2xl flex flex-col justify-between gap-4">
                  <blockquote className="text-sm text-cyber-muted leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3 pt-4 border-t border-cyber-border">
                    <div className={`w-10 h-10 rounded-full border bg-cyber-dark flex items-center justify-center font-bold text-sm ${t.accent}`}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-cyber-text">{t.name}</div>
                      <div className="text-xs text-cyber-muted">{t.role}</div>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-cyber-card border-t border-cyber-border scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-cyber-text text-center mb-16">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group bg-cyber-dark border border-cyber-border rounded-2xl p-6">
                  <summary className="font-bold text-cyber-text text-base cursor-pointer list-none flex items-center justify-between gap-4">
                    {q}
                    <Icon className="w-4 h-4 shrink-0 text-cyber-muted transition-transform group-open:rotate-45">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </Icon>
                  </summary>
                  <p className="text-sm text-cyber-muted mt-3 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-cyber-text">Ready to start?</h2>
            <p className="text-sm text-cyber-muted">Join as a creator and earn per verified click, or launch your first campaign today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AuthCta role="creator" className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl bg-cyber-neon text-cyber-dark font-extrabold text-sm hover:opacity-90 transition">
                {GamepadIcon}
                Join as a Creator
              </AuthCta>
              <AuthCta role="advertiser" className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl glass-panel text-cyber-text font-bold text-sm hover:border-cyber-neon transition">
                <span className="text-cyber-neon inline-flex">{MegaphoneIcon}</span>
                Launch a Campaign
              </AuthCta>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-cyber-card border-t border-cyber-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-cyber-text">
            <Logo className="h-6 w-auto" />
          </div>
          <p className="text-xs text-cyber-muted text-center order-last md:order-none">
            © {new Date().getFullYear()} Promoet. All rights reserved.
          </p>
          <nav className="flex gap-5 text-xs font-semibold text-cyber-muted">
            <Link href="/auth/login?role=creator" className="hover:text-cyber-neon transition">For Creators</Link>
            <Link href="/auth/login?role=advertiser" className="hover:text-cyber-neon transition">For Brands</Link>
            <Link href="/auth/login" className="hover:text-cyber-neon transition">Sign In</Link>
          </nav>
        </div>
      </footer>
    </div>
    </AuthModalProvider>
  )
}
