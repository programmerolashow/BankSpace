/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  fetchAdminStatsApi,
  fetchAdminNotificationsApi,
  executeGlobalAdminSearchApi,
} from "@/services/adminApiClient"
import { AdminOperationalAlert, AdminSearchResultsGroup } from "@/types/admin"

export function useAdminStats() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAdminStatsApi()
      setStats(data)
    } catch (err: any) {
      setError(err.message || "Failed to load admin stats")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadStats()
  }, [reloadStats])

  return { stats, isLoading, error, reloadStats }
}

export function useAdminNotifications(pollIntervalMs = 30000) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [operationalAlerts, setOperationalAlerts] = useState<AdminOperationalAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reloadNotifications = useCallback(async () => {
    try {
      const data = await fetchAdminNotificationsApi()
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount)
      if (data.operationalAlerts) setOperationalAlerts(data.operationalAlerts)
    } catch {
      // Ignore poll errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadNotifications()
    const interval = setInterval(reloadNotifications, pollIntervalMs)
    return () => clearInterval(interval)
  }, [reloadNotifications, pollIntervalMs])

  return { unreadCount, operationalAlerts, isLoading, reloadNotifications }
}

export function useAdminSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<AdminSearchResultsGroup>({
    users: [],
    accounts: [],
    transactions: [],
    transfers: [],
    auditLogs: [],
  })
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ users: [], accounts: [], transactions: [], transfers: [], auditLogs: [] })
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await executeGlobalAdminSearchApi(query.trim())
        if (data.results) setResults(data.results)
      } catch {
        // Error handled silently
      } finally {
        setIsSearching(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return { results, isSearching }
}
