"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertOctagon, RefreshCw, LayoutDashboard } from "lucide-react"

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Admin Runtime Component Exception]:", error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  private handleDashboardRedirect = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/admin/dashboard"
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 text-center space-y-5 shadow-2xl">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto">
              <AlertOctagon className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                {this.props.fallbackTitle || "Administrative Interface Exception"}
              </h3>
              <p className="text-xs text-slate-400">
                An unexpected component rendering error occurred. Technical details have been logged securely.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] font-semibold text-rose-300">
              Sanitized Code: <strong className="text-rose-200">ERR_ADMIN_UI_EXCEPTION</strong>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="rounded-2xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Interface
              </button>

              <button
                onClick={this.handleDashboardRedirect}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-amber-400" /> Executive Command
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
