"use client";

import { useState, useEffect, useCallback } from 'react'
import { withCache } from './cache'

/**
 * React hook for cached data fetching (client-only)
 */
export const useCachedData = <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    useMemory?: boolean
    useStorage?: boolean
    enabled?: boolean
    refetchOnWindowFocus?: boolean
  } = {}
) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const {
    ttl = 5 * 60 * 1000,
    useMemory = true,
    useStorage = false,
    enabled = true,
    refetchOnWindowFocus = false,
  } = options

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      const result = await withCache(cacheKey, fetcher, {
        ttl,
        useMemory,
        useStorage,
        forceRefresh,
      })

      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, fetcher, ttl, useMemory, useStorage, enabled])

  const refetch = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch on window focus if enabled
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData, refetchOnWindowFocus])

  return {
    data,
    loading,
    error,
    refetch,
  }
}
