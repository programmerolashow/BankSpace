/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Lock,
  Eye,
  RefreshCw,
  Terminal,
  Activity,
} from "lucide-react"
import { AdminDataTable, ColumnDef } from "@/components/admin/AdminDataTable"

export default function AdminActivityPage() {
  const router = useRouter()

  const [logs, setLogs] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({ total: 0, loginCount: 0, kycActionCount: 0, userActionCount: 0 })
  const [pagination, setPagination] = useState<any>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(1)

  // Audit Inspection Modal State
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const fetchAuditLogs = async (
    p = page,
    action = actionFilter,
    q = searchQuery,
    start = startDate,
    end = endDate
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/logs?page=${p}&limit=10&action=${action}&search=${encodeURIComponent(q)}&startDate=${start}&endDate=${end}`
      const res = await fetch(url)
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login"
        } else {
          router.push("/admin/login")
        }
        return
      }

      if (res.ok) {
        const data = await res.json()
        if (data.logs) setLogs(data.logs)
        if (data.metrics) setMetrics(data.metrics)
        if (data.pagination) setPagination(data.pagination)
      }
    } catch {
      // Error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  // Column Definitions for Audit Log Table
  const columns: ColumnDef<any>[] = [
    {
      key: "action",
      header: "Action Badge",
      accessor: (log) => {
        const isLogin = log.action === "ADMIN_LOGIN"
        const isKyc = log.action.includes("KYC")
        const isSuspend = log.action.includes("SUSPEND")

        return (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isLogin
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : isKyc
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : isSuspend
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {log.action}
          </span>
        )
      },
    },
    {
      key: "adminEmail",
      header: "Administrator Identity",
      accessor: (log) => (
        <div>
          <p className="font-bold text-white">{log.adminName || log.adminEmail || "System Admin"}</p>
          <p className="text-[11px] text-slate-400">{log.adminEmail || "admin@bankspace.com"}</p>
        </div>
      ),
    },
    {
      key: "targetEntity",
      header: "Target Entity / ID",
      accessor: (log) => (
        <div>
          <p className="font-mono text-slate-200">{log.targetEntity || "System"}</p>
          <p className="text-[10px] text-slate-500 font-mono">ID: {log.targetId || "N/A"}</p>
        </div>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      className: "font-mono text-[11px] text-indigo-400",
      accessor: (log) => log.ipAddress || "127.0.0.1",
    },
    {
      key: "createdAt",
      header: "Timestamp",
      className: "text-slate-400 font-mono text-[11px]",
      accessor: (log) => new Date(log.createdAt).toLocaleString(),
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Activity className="h-7 w-7 text-indigo-400" /> Administrative Audit Log & Activity Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Immutable security audit log tracking admin logins, user suspensions, KYC decisions, and privileged operations using the reusable Admin Data Table.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-3 py-1 border border-indigo-500/20">
              • Immutable Audit Records (Read-Only)
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Admin Login & Session Logging
            </span>
            <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
              • KYC & User Suspension Audits
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchAuditLogs(page, actionFilter, searchQuery, startDate, endDate)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-indigo-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Audit Trail
        </button>
      </div>

      {/* IMMUTABILITY SECURITY BANNER */}
      <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-5 flex items-center justify-between gap-4 text-xs font-semibold text-indigo-300 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Audit Log Immutability Enforcement Active</p>
            <p className="text-indigo-300/90 text-[11px]">
              Audit trail logs are immutable and cannot be deleted or modified from the Admin UI.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-[10px] font-black text-indigo-400 border border-indigo-500/30">
          READ-ONLY IMMUTABLE
        </span>
      </div>

      {/* METRIC COUNTER CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Audit Log Entries</span>
          <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Immutable Audit Trail Count</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Login Events</span>
          <p className="text-2xl font-black text-indigo-400">{metrics.loginCount || 0}</p>
          <p className="text-[11px] font-semibold text-indigo-400">Authenticated Admin Sessions</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">KYC Decisions Logged</span>
          <p className="text-2xl font-black text-cyan-400">{metrics.kycActionCount || 0}</p>
          <p className="text-[11px] font-semibold text-cyan-400">Compliance Approvals & Rejections</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">User Suspension Audits</span>
          <p className="text-2xl font-black text-rose-400">{metrics.userActionCount || 0}</p>
          <p className="text-[11px] font-semibold text-rose-400">Privileged Security Actions</p>
        </div>
      </div>

      {/* REUSABLE DATA TABLE COMPONENT SECTION */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" /> Reusable Audit Activity Trail
          </h2>
          <p className="text-xs text-slate-400">Standardized search, action filtering, date range queries, and metadata inspection</p>
        </div>

        <AdminDataTable<any>
          columns={columns}
          data={logs}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q)
            setPage(1)
            fetchAuditLogs(1, actionFilter, q, startDate, endDate)
          }}
          searchPlaceholder="Search admin email, action, target ID..."
          filters={[
            {
              key: "action",
              label: "Action",
              value: actionFilter,
              onChange: (val) => {
                setActionFilter(val)
                setPage(1)
                fetchAuditLogs(1, val, searchQuery, startDate, endDate)
              },
              options: [
                { label: "All Actions", value: "ALL" },
                { label: "ADMIN_LOGIN", value: "ADMIN_LOGIN" },
                { label: "USER_SUSPEND", value: "USER_SUSPEND" },
                { label: "USER_RESTORE", value: "USER_RESTORE" },
                { label: "KYC_APPROVE", value: "KYC_APPROVE" },
                { label: "KYC_REJECT", value: "KYC_REJECT" },
              ],
            },
          ]}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            hasNextPage: pagination.hasNextPage,
            hasPrevPage: pagination.hasPrevPage,
            onPageChange: (newP) => {
              setPage(newP)
              fetchAuditLogs(newP, actionFilter, searchQuery, startDate, endDate)
            },
          }}
          renderRowActions={(log) => (
            <button
              onClick={() => setSelectedLog(log)}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 inline-flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5 text-indigo-400" /> Inspect
            </button>
          )}
        />
      </section>

      {/* AUDIT METADATA INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedLog(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-400" /> Audit Log Request Breakdown
                </h3>
                <p className="text-xs font-mono text-slate-400">Action: {selectedLog.action}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Admin Identity</span>
                <p className="font-bold text-white">{selectedLog.adminName || selectedLog.adminEmail}</p>
                <p className="text-slate-400">{selectedLog.adminEmail}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Target Entity & ID</span>
                <p className="font-bold text-indigo-400 font-mono">{selectedLog.targetEntity || "System"}</p>
                <p className="text-slate-400 font-mono">ID: {selectedLog.targetId || "N/A"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs font-mono">
              <span className="text-[10px] font-sans font-bold uppercase text-slate-400">Request & Client Source Details</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-slate-500">IP Address</span>
                  <p className="text-white font-bold">{selectedLog.ipAddress || "127.0.0.1"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Timestamp</span>
                  <p className="text-slate-300">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedLog.userAgent && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500">User Agent</span>
                  <p className="text-slate-400 text-[10px] break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>

            {selectedLog.metadata && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">Audit Request JSON Metadata</span>
                <pre className="font-mono text-[11px] text-amber-300 bg-slate-900 p-3 rounded-xl overflow-x-auto">
                  {selectedLog.metadata}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
