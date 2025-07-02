import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const mountTime = useRef<number>(Date.now())
  const lastRenderTime = useRef<number>(Date.now())

  useEffect(() => {
    renderCount.current++
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    lastRenderTime.current = now

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        renderCount: renderCount.current,
        timeSinceMount: now - mountTime.current,
        timeSinceLastRender,
        timestamp: new Date().toISOString()
      })
    }

    // Warn about excessive re-renders
    if (renderCount.current > 10 && timeSinceLastRender < 100) {
      console.warn(`[Performance Warning] ${componentName} is re-rendering frequently`)
    }
  })

  return {
    renderCount: renderCount.current,
    timeSinceMount: Date.now() - mountTime.current
  }
}

/**
 * Optimized data fetching hook with caching
 */
export function useOptimizedFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    cacheKey?: string
    cacheDuration?: number // in milliseconds
    retryCount?: number
    retryDelay?: number
  } = {}
) {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    retryCount = 3,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map())
  const abortController = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (cacheKey && !forceRefresh) {
      const cached = cache.current.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        setData(cached.data)
        return cached.data
      }
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort()
    }

    abortController.current = new AbortController()
    setLoading(true)
    setError(null)

    let attempt = 0
    while (attempt < retryCount) {
      try {
        const result = await fetchFn()
        
        // Cache the result
        if (cacheKey) {
          cache.current.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })
        }

        setData(result)
        setLastFetch(Date.now())
        setLoading(false)
        return result
      } catch (err) {
        attempt++
        
        if (attempt >= retryCount) {
          setError(err as Error)
          setLoading(false)
          throw err
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }
  }, [fetchFn, cacheKey, cacheDuration, retryCount, retryDelay, ...dependencies])

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    fetchData()
    
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, dependencies)

  const refresh = useCallback(() => fetchData(true), [fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    lastFetch,
    isStale: cacheKey ? Date.now() - lastFetch > cacheDuration : false
  }
}

/**
 * Debounced value hook for search inputs
 */
export function useOptimizedDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Optimized list rendering hook
 */
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index
      }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange
  }
}

/**
 * Memory usage monitoring hook
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo({
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          timestamp: Date.now()
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

/**
 * Optimized calculation hook with memoization
 */
export function useOptimizedCalculation<T, R>(
  data: T,
  calculationFn: (data: T) => R,
  dependencies: any[] = []
): R {
  return useMemo(() => {
    const startTime = performance.now()
    const result = calculationFn(data)
    const endTime = performance.now()

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] Calculation took ${endTime - startTime}ms`)
    }

    return result
  }, [data, ...dependencies])
}

/**
 * Batch operations hook
 */
export function useBatchOperations<T>(
  batchSize: number = 10,
  delay: number = 100
) {
  const [queue, setQueue] = useState<T[]>([])
  const [processing, setProcessing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const addToQueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item])
  }, [])

  const processBatch = useCallback(async (
    items: T[],
    processor: (batch: T[]) => Promise<void>
  ) => {
    if (items.length === 0 || processing) return

    setProcessing(true)

    try {
      // Process in batches
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        await processor(batch)
        
        // Add delay between batches to prevent overwhelming
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      setQueue([])
    } catch (error) {
      console.error('Batch processing error:', error)
    } finally {
      setProcessing(false)
    }
  }, [batchSize, delay, processing])

  // Auto-process queue when it reaches batch size
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (queue.length >= batchSize) {
      // Process immediately when batch is full
      timeoutRef.current = setTimeout(() => {
        // This would need a processor function passed from the component
      }, 0)
    } else if (queue.length > 0) {
      // Process after delay if queue has items but isn't full
      timeoutRef.current = setTimeout(() => {
        // This would need a processor function passed from the component
      }, delay * 2)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [queue.length, batchSize, delay])

  return {
    queue,
    queueSize: queue.length,
    processing,
    addToQueue,
    processBatch
  }
}

/**
 * Image lazy loading hook
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image()
          img.onload = () => {
            setImageSrc(src)
            setLoading(false)
          }
          img.onerror = () => {
            setError(true)
            setLoading(false)
          }
          img.src = src
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [src])

  return {
    imageSrc,
    loading,
    error,
    imgRef
  }
}
