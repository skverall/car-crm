'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  fallbackIcon?: React.ReactNode
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  alt,
  className = '',
  fallbackIcon,
  placeholder,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {!isInView && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
          {placeholder || <ImageIcon className="h-8 w-8 text-gray-400" />}
        </div>
      )}
      
      {isInView && !hasError && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            </div>
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          {fallbackIcon || <ImageIcon className="h-8 w-8 text-gray-400" />}
        </div>
      )}
    </div>
  )
}

// Optimized image component with responsive loading
interface ResponsiveImageProps {
  src: string
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
}

export function ResponsiveImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Generate responsive image URLs (this would typically be done by your image service)
  const generateSrcSet = (baseSrc: string) => {
    const sizes = [320, 640, 768, 1024, 1280]
    return sizes
      .map(size => `${baseSrc}?w=${size}&q=75 ${size}w`)
      .join(', ')
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      {!hasError && (
        <img
          src={src}
          srcSet={generateSrcSet(src)}
          sizes={sizes}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </div>
  )
}

// Hook for image preloading
export function useImagePreload(src: string) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const img = new Image()
    
    img.onload = () => setIsLoaded(true)
    img.onerror = () => setHasError(true)
    
    img.src = src
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return { isLoaded, hasError }
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop
  }
}
