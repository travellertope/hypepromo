'use client'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        errorRetryCount: 3,
        errorRetryInterval: 2000,
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
