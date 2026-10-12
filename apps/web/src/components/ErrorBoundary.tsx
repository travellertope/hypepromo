'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <p className="text-2xl">⚠️</p>
          <p className="text-cyber-text font-semibold">Something went wrong</p>
          <p className="text-cyber-muted text-sm">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-6 py-2.5 rounded-xl bg-cyber-accent text-white text-sm font-bold"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
