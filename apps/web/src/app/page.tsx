export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="glass-panel rounded-3xl p-10 max-w-md w-full text-center">
        <h1 className="font-extrabold text-3xl tracking-wider text-cyber-neon mb-2">
          Promoet
        </h1>
        <p className="text-purple-300 text-sm mb-8">
          Earn from every click. Grow your influence.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/creator"
            className="rounded-2xl bg-cyber-accent text-white font-bold py-3 px-6 hover:opacity-90 transition"
          >
            I&apos;m a Creator
          </a>
          <a
            href="/advertiser"
            className="rounded-2xl border border-cyber-border text-purple-300 font-semibold py-3 px-6 hover:bg-cyber-card transition"
          >
            I&apos;m an Advertiser
          </a>
        </div>
      </div>
    </main>
  )
}
