'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// Hook for detecting mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

// Hook for throttling function calls (useful for scroll events)
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

// Hook for detecting network connection quality
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    const updateConnectionType = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection

      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown')
        setIsSlowConnection(
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g'
        )
      }
    }

    updateOnlineStatus()
    updateConnectionType()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateConnectionType)
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      if (connection) {
        connection.removeEventListener('change', updateConnectionType)
      }
    }
  }, [])

  return { isOnline, connectionType, isSlowConnection }
}

// Hook for optimizing rendering based on device capabilities
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    supportsWebP: false,
    supportsAvif: false,
    deviceMemory: 4, // Default to 4GB
    hardwareConcurrency: 4, // Default to 4 cores
    maxTouchPoints: 0
  })

  useEffect(() => {
    const checkCapabilities = async () => {
      // Check WebP support
      const webpSupport = await new Promise<boolean>((resolve) => {
        const webP = new Image()
        webP.onload = webP.onerror = () => resolve(webP.height === 2)
        webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
      })

      // Check AVIF support
      const avifSupport = await new Promise<boolean>((resolve) => {
        const avif = new Image()
        avif.onload = avif.onerror = () => resolve(avif.height === 2)
        avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
      })

      setCapabilities({
        supportsWebP: webpSupport,
        supportsAvif: avifSupport,
        deviceMemory: (navigator as any).deviceMemory || 4,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        maxTouchPoints: navigator.maxTouchPoints || 0
      })
    }

    checkCapabilities()
  }, [])

  return capabilities
}

// Hook for managing memory usage
export function useMemoryOptimization() {
  const [memoryInfo, setMemoryInfo] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  })

  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      })
    }
  }, [])

  const isMemoryPressure = useCallback(() => {
    if (memoryInfo.jsHeapSizeLimit === 0) return false
    return memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit > 0.8
  }, [memoryInfo])

  useEffect(() => {
    checkMemoryUsage()
    const interval = setInterval(checkMemoryUsage, 10000) // Check every 10 seconds
    
    return () => clearInterval(interval)
  }, [checkMemoryUsage])

  return {
    memoryInfo,
    isMemoryPressure: isMemoryPressure(),
    checkMemoryUsage
  }
}

// Hook for optimizing images based on device and network
export function useImageOptimization() {
  const { isSlowConnection } = useNetworkStatus()
  const { supportsWebP, supportsAvif } = useDeviceCapabilities()
  const isMobile = useIsMobile()

  const getOptimalImageFormat = useCallback((originalUrl: string) => {
    if (supportsAvif && !isSlowConnection) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.avif')
    }
    if (supportsWebP) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    }
    return originalUrl
  }, [supportsAvif, supportsWebP, isSlowConnection])

  const getOptimalImageSize = useCallback((baseWidth: number) => {
    if (isMobile) {
      return Math.min(baseWidth, 640) // Max 640px for mobile
    }
    if (isSlowConnection) {
      return Math.min(baseWidth, 800) // Smaller images for slow connections
    }
    return baseWidth
  }, [isMobile, isSlowConnection])

  const getImageQuality = useCallback(() => {
    if (isSlowConnection) return 60
    if (isMobile) return 75
    return 85
  }, [isSlowConnection, isMobile])

  return {
    getOptimalImageFormat,
    getOptimalImageSize,
    getImageQuality,
    shouldLoadImages: !isSlowConnection || !isMobile
  }
}

// Hook for reducing animations on low-end devices
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const { hardwareConcurrency, deviceMemory } = useDeviceCapabilities()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Also reduce motion on low-end devices
  const shouldReduceMotion = prefersReducedMotion || 
                            hardwareConcurrency < 4 || 
                            deviceMemory < 2

  return {
    prefersReducedMotion,
    shouldReduceMotion,
    animationDuration: shouldReduceMotion ? 0 : 300
  }
}
