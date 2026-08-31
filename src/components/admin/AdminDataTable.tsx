/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import {
  Search,
  Loader2,
  AlertCircle,
  FolderOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export interface ColumnDef<T> {
  key: string
  header: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

export interface FilterOption {
  key: string
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}

export interface PaginationState {
  page: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
  onPageChange: (newPage: number) => void
}

export interface AdminDataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  
  // Loading & Error States
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptySubtext?: string
  
  // Search & Filter Toolbar
  searchQuery?: string
  onSearchChange?: (q: string) => void
  searchPlaceholder?: string
  filters?: FilterOption[]
  
  // Sorting
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void
  
  // Pagination
  pagination?: PaginationState
  
  // Custom Action Trigger
  renderRowActions?: (row: T) => React.ReactNode
  onRowClick?: (row: T) => void
}

export function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = "No records found",
  emptySubtext = "No matching items for selected search or filters.",
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
  sortBy,
  sortOrder,
  onSortChange,
  pagination,
  renderRowActions,
  onRowClick,
}: AdminDataTableProps<T>) {
  const handleSortClick = (columnKey: string) => {
    if (!onSortChange) return
    if (sortBy === columnKey) {
      onSortChange(columnKey, sortOrder === "asc" ? "desc" : "asc")
    } else {
      onSortChange(columnKey, "desc")
    }
  }

  return (
    <div className="space-y-4 font-sans">
      {/* TOOLBAR: SEARCH & MULTI-FILTER DROPDOWNS */}
      {(onSearchChange || filters.length > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          {/* Live Search Input */}
          {onSearchChange && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500/60"
              />
            </div>
          )}

          {/* Filter Dropdowns */}
          {filters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
              {filters.map((filter) => (
                <select
                  key={filter.key}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 outline-none hover:border-slate-700 cursor-pointer"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ERROR STATE */}
      {error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
          <p className="text-sm font-bold text-rose-200">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors cursor-pointer"
            >
              Retry Database Fetch
            </button>
          )}
        </div>
      ) : isLoading ? (
        /* LOADING SKELETON STATE */
        <div className="py-16 text-center text-slate-400 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
          <p className="text-xs font-semibold">Loading administrative dataset...</p>
        </div>
      ) : data.length === 0 ? (
        /* EMPTY STATE */
        <div className="py-16 text-center text-slate-500 space-y-2">
          <FolderOpen className="h-10 w-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">{emptyTitle}</p>
          <p className="text-xs">{emptySubtext}</p>
        </div>
      ) : (
        /* DATA TABLE SHEET */
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  {columns.map((col) => {
                    const isSorted = sortBy === col.key

                    return (
                      <th
                        key={col.key}
                        className={`py-3.5 px-4 ${col.headerClassName || ""}`}
                      >
                        {col.sortable && onSortChange ? (
                          <button
                            onClick={() => handleSortClick(col.key)}
                            className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 text-slate-600" />
                            )}
                          </button>
                        ) : (
                          <span>{col.header}</span>
                        )}
                      </th>
                    )
                  })}
                  {renderRowActions && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {data.map((row) => {
                  const key = keyExtractor(row)

                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        onRowClick ? "cursor-pointer" : ""
                      }`}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`py-3.5 px-4 ${col.className || ""}`}>
                          {col.accessor
                            ? col.accessor(row)
                            : (row as any)[col.key] !== undefined
                            ? String((row as any)[col.key])
                            : "—"}
                        </td>
                      ))}
                      {renderRowActions && (
                        <td className="py-3.5 px-4 text-right">
                          {renderRowActions(row)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* SERVER-SIDE PAGINATION FOOTER */}
          {pagination && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400">
              <span>
                Showing Page <strong className="text-white">{pagination.page}</strong> of{" "}
                <strong className="text-white">{pagination.totalPages}</strong> (Total{" "}
                <strong className="text-amber-400">{pagination.totalItems}</strong> records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => pagination.onPageChange(Math.max(pagination.page - 1, 1))}
                  disabled={!pagination.hasPrevPage}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>

                <button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
