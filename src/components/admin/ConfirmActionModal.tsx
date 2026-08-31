/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from "react"
import { AlertTriangle, ShieldAlert, Loader2, X, CheckCircle2 } from "lucide-react"

export interface ConfirmActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => Promise<void> | void

  title: string
  actionLabel?: string
  actionType?: "DANGER" | "WARNING" | "INFO"

  // Target Entity Details
  affectedEntityName: string
  affectedEntityId?: string
  consequenceWarning: string

  // Mandatory Reason Field
  requireReason?: boolean
  reasonPlaceholder?: string
  reasonLabel?: string

  // State Management
  isProcessing?: boolean
  feedbackMessage?: { type: "success" | "error"; text: string } | null
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionLabel = "Confirm Action",
  actionType = "DANGER",
  affectedEntityName,
  affectedEntityId,
  consequenceWarning,
  requireReason = false,
  reasonPlaceholder = "Enter mandatory administrative justification for audit log...",
  reasonLabel = "Administrative Rationale / Reason",
  isProcessing = false,
  feedbackMessage = null,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const isBtnDisabled =
    isProcessing || isSubmitting || (requireReason && !reason.trim())

  const handleConfirmClick = async () => {
    if (isBtnDisabled) return
    setIsSubmitting(true)
    try {
      await onConfirm(reason.trim())
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDanger = actionType === "DANGER"
  const isWarning = actionType === "WARNING"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => !isProcessing && !isSubmitting && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-2xl border ${
                isDanger
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  : isWarning
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
              }`}
            >
              {isDanger ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-white">{title}</h3>
              <p className="text-xs text-slate-400">Security-sensitive operation confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing || isSubmitting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Message Banner (Success or Error) */}
        {feedbackMessage && (
          <div
            className={`rounded-2xl border p-3.5 text-xs font-semibold flex items-center gap-2 ${
              feedbackMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Affected Entity & Disclosures */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Affected Entity / User</span>
            <span className="font-bold text-white">{affectedEntityName}</span>
          </div>
          {affectedEntityId && (
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
              <span className="text-[11px] text-slate-400 uppercase font-bold">Target Entity ID</span>
              <span className="font-mono text-indigo-400 text-[11px]">{affectedEntityId}</span>
            </div>
          )}
        </div>

        {/* Consequence Alert Callout Box */}
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold space-y-1 ${
            isDanger
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : isWarning
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
          }`}
        >
          <span className="font-bold uppercase text-[10px] tracking-wider block">
            ⚠️ Downstream Operational Consequences
          </span>
          <p className="text-[11px] leading-relaxed">{consequenceWarning}</p>
        </div>

        {/* Rationale Input Area (Required or Optional) */}
        <div className="space-y-1.5 text-xs font-semibold">
          <label className="text-[11px] text-slate-300 uppercase font-bold flex items-center justify-between">
            <span>{reasonLabel}</span>
            {requireReason && (
              <span className="text-rose-400 text-[10px] font-bold uppercase">* Mandatory</span>
            )}
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 outline-none focus:border-amber-500/60 placeholder-slate-600"
          />
        </div>

        {/* Modal Controls (Cancel & Confirm Button) */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            disabled={isProcessing || isSubmitting}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmClick}
            disabled={isBtnDisabled}
            className={`rounded-2xl px-5 py-2.5 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
                : isWarning
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {(isProcessing || isSubmitting) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>
              {isProcessing || isSubmitting ? "Executing Action..." : actionLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
