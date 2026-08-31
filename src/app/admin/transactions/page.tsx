/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  History,
  Eye,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react"
import { AdminDataTable, ColumnDef } from "@/components/admin/AdminDataTable"

export default function AdminTransactionsPage() {
  const router = useRouter()

  const [transactions, setTransactions] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({ totalVolume: 0, total: 0, successfulCount: 0, pendingCount: 0, failedCount: 0 })
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
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  // Transaction Inspection Modal State
  const [selectedTx, setSelectedTx] = useState<any>(null)

  const fetchTransactions = async (
    p = page,
    status = statusFilter,
    type = typeFilter,
    q = searchQuery,
    start = startDate,
    end = endDate,
    sort = sortBy,
    order = sortOrder
  ) => {
    setIsLoading(true)
    try {
      const url = `/api/admin/transactions?page=${p}&limit=10&status=${status}&type=${type}&search=${encodeURIComponent(q)}&startDate=${start}&endDate=${end}&sortBy=${sort}&sortOrder=${order}`
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
        if (data.transactions) setTransactions(data.transactions)
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
    fetchTransactions()
  }, [])

  // Define Reusable Table Columns for Double-Entry Accounting Ledger
  const columns: ColumnDef<any>[] = [
    {
      key: "reference",
      header: "Reference / Paystack Ref",
      sortable: true,
      accessor: (t) => (
        <div>
          <p className="font-mono font-bold text-white text-[11px]">{t.reference}</p>
          {t.providerRef && <p className="font-mono text-[10px] text-indigo-400">{t.providerRef}</p>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      accessor: (t) => (
        <span className="rounded-xl bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300">
          {t.type}
        </span>
      ),
    },
    {
      key: "senderName",
      header: "Counterparty Name",
      accessor: (t) => (
        <div>
          <p className="font-bold text-white text-[11px]">{t.senderName}</p>
          <p className="text-[10px] text-slate-400">➔ {t.recipientName || t.accountNumber}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Gross Amount (₦)",
      sortable: true,
      headerClassName: "text-right",
      className: "text-right font-mono font-bold text-amber-400",
      accessor: (t) => `₦${Number(t.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    },
    {
      key: "fee",
      header: "Platform Fee (₦)",
      headerClassName: "text-right",
      className: "text-right font-mono text-emerald-400",
      accessor: (t) => `₦${Number(t.fee || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    },
    {
      key: "netSettlement",
      header: "Net Settlement (₦)",
      headerClassName: "text-right",
      className: "text-right font-mono font-black text-white",
      accessor: (t) => {
        const net = Number(t.amount || 0) - Number(t.fee || 0)
        return `₦${net.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (t) => {
        const isSuccess = t.status === "SUCCESSFUL"
        const isPending = t.status === "PENDING"
        const isFailed = t.status === "FAILED"

        return (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isSuccess
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : isPending
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : isFailed
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {t.status}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* FUNCTIONALITY HEADER & CAPABILITY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <History className="h-7 w-7 text-indigo-400" /> Full Platform Transaction Ledger Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Functionality: Audit full platform double-entry ledger records across all transaction types, track fee earnings, search references, and inspect receipt breakdown using the reusable Admin Data Table.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-bold">
            <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-3 py-1 border border-indigo-500/20">
              • Multi-Type Ledger (`TRANSFER`, `DEPOSIT`, `SAVINGS`)
            </span>
            <span className="rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 border border-amber-500/20">
              • Platform Fee Earnings Tracking
            </span>
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20">
              • Server-Side Paginated Reference Search
            </span>
          </div>
        </div>
        <button
          onClick={() => fetchTransactions(page, statusFilter, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 text-indigo-400 ${isLoading ? "animate-spin" : ""}`} /> Refresh Ledger
        </button>
      </div>

      {/* METRIC COUNTER CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Settled Volume (₦)</span>
          <p className="text-2xl font-black text-amber-400 font-mono">
            ₦{Number(metrics.totalVolume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] font-semibold text-emerald-400">Successful Settlement Volume</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ledger Transactions</span>
          <p className="text-2xl font-black text-white">{metrics.total || 0}</p>
          <p className="text-[11px] font-semibold text-slate-400">Database Record Count</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Successful Transactions</span>
          <p className="text-2xl font-black text-emerald-400">{metrics.successfulCount || 0}</p>
          <p className="text-[11px] font-semibold text-emerald-400">Completed & Reconciled</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending / Failed</span>
          <p className="text-2xl font-black text-rose-400">{(metrics.pendingCount || 0) + (metrics.failedCount || 0)}</p>
          <p className="text-[11px] font-semibold text-rose-400">Pending or Unsettled Entries</p>
        </div>
      </div>

      {/* REUSABLE DATA TABLE COMPONENT SECTION */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-400" /> Reusable Double-Entry Accounting Ledger
          </h2>
          <p className="text-xs text-slate-400">Standardized pagination, sorting, search, and fee deduction analysis</p>
        </div>

        <AdminDataTable<any>
          columns={columns}
          data={transactions}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q)
            setPage(1)
            fetchTransactions(1, statusFilter, typeFilter, q, startDate, endDate, sortBy, sortOrder)
          }}
          searchPlaceholder="Search reference, Paystack ref, counterparty..."
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (val) => {
                setStatusFilter(val)
                setPage(1)
                fetchTransactions(1, val, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
              },
              options: [
                { label: "All Statuses", value: "ALL" },
                { label: "SUCCESSFUL", value: "SUCCESSFUL" },
                { label: "PENDING", value: "PENDING" },
                { label: "FAILED", value: "FAILED" },
                { label: "REVERSED", value: "REVERSED" },
              ],
            },
            {
              key: "type",
              label: "Type",
              value: typeFilter,
              onChange: (val) => {
                setTypeFilter(val)
                setPage(1)
                fetchTransactions(1, statusFilter, val, searchQuery, startDate, endDate, sortBy, sortOrder)
              },
              options: [
                { label: "All Types", value: "ALL" },
                { label: "TRANSFER", value: "TRANSFER" },
                { label: "DEPOSIT", value: "DEPOSIT" },
                { label: "WITHDRAWAL", value: "WITHDRAWAL" },
                { label: "SAVINGS", value: "SAVINGS" },
                { label: "INVESTMENT", value: "INVESTMENT" },
              ],
            },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(s, o) => {
            setSortBy(s)
            setSortOrder(o)
            fetchTransactions(1, statusFilter, typeFilter, searchQuery, startDate, endDate, s, o)
          }}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            hasNextPage: pagination.hasNextPage,
            hasPrevPage: pagination.hasPrevPage,
            onPageChange: (newP) => {
              setPage(newP)
              fetchTransactions(newP, statusFilter, typeFilter, searchQuery, startDate, endDate, sortBy, sortOrder)
            },
          }}
          renderRowActions={(t) => (
            <button
              onClick={() => setSelectedTx(t)}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700 inline-flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5 text-indigo-400" /> Receipt
            </button>
          )}
        />
      </section>

      {/* TRANSACTION RECEIPT MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedTx(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-400" /> Transaction Receipt Audit
                </h3>
                <p className="text-xs font-mono text-slate-400">Ref: {selectedTx.reference}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 font-semibold text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Gross Amount</span>
                <p className="text-lg font-black text-amber-400 font-mono">
                  ₦{Number(selectedTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Platform Fee</span>
                <p className="text-lg font-black text-emerald-400 font-mono">
                  ₦{Number(selectedTx.fee || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Execution Status</span>
                <p className="font-bold text-white">{selectedTx.status}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs font-mono">
              <h4 className="text-[10px] font-sans font-bold uppercase text-slate-400">Audit Identifiers</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-slate-500">Internal Reference</span>
                  <p className="text-white font-bold">{selectedTx.reference}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Paystack Provider Ref</span>
                  <p className="text-indigo-400 font-bold">{selectedTx.providerRef || "INTERNAL_LEDGER"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
