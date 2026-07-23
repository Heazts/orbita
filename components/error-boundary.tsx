"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[error-boundary]", error.message, error.stack, errorInfo.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-background p-8">
            <div className="max-w-md text-center">
              <h1 className="font-serif text-3xl font-bold text-foreground">Algo deu errado</h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
              >
                Recarregar
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
