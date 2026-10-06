'use client'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function PaymentCallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get('reference')

  useEffect(() => {
    // Paystack redirects here after payment. The webhook handles the backend
    // credit — we just show a success message and redirect.
    const timer = setTimeout(() => {
      router.push('/advertiser')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-black text-white">Payment Received!</h1>
      <p className="text-white/60 text-center">
        Your wallet will be credited once the payment is confirmed.
      </p>
      {reference && (
        <p className="text-xs font-mono text-white/30">Ref: {reference}</p>
      )}
      <p className="text-sm text-white/40">Redirecting to your campaigns…</p>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <PaymentCallbackInner />
    </Suspense>
  )
}
