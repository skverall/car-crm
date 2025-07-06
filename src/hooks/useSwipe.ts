'use client'

import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions {
  threshold?: number
  preventDefaultTouchmoveEvent?: boolean
}

export function useSwipe(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    preventDefaultTouchmoveEvent = false
  } = options

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Determine if it's a horizontal or vertical swipe
      if (Math.max(absDeltaX, absDeltaY) < threshold) {
        touchStartRef.current = null
        return
      }

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight()
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown()
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp()
        }
      }

      touchStartRef.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmoveEvent })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handlers, threshold, preventDefaultTouchmoveEvent])

  return elementRef
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const elementRef = useRef<HTMLElement | null>(null)
  const startYRef = useRef<number>(0)
  const currentYRef = useRef<number>(0)
  const isPullingRef = useRef<boolean>(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY
        isPullingRef.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return

      currentYRef.current = e.touches[0].clientY
      const deltaY = currentYRef.current - startYRef.current

      if (deltaY > 0 && element.scrollTop === 0) {
        e.preventDefault()
        element.style.transform = `translateY(${Math.min(deltaY * 0.5, 100)}px)`
        
        if (deltaY > 100) {
          element.classList.add('pulling')
        } else {
          element.classList.remove('pulling')
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return

      const deltaY = currentYRef.current - startYRef.current
      
      if (deltaY > 100) {
        // Trigger refresh
        element.style.transform = 'translateY(60px)'
        await onRefresh()
      }

      // Reset
      element.style.transform = 'translateY(0)'
      element.classList.remove('pulling')
      isPullingRef.current = false
      startYRef.current = 0
      currentYRef.current = 0
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh])

  return elementRef
}

// Hook for long press functionality
export function useLongPress(
  onLongPress: () => void,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleStart = () => {
      timeoutRef.current = setTimeout(() => {
        onLongPress()
      }, delay)
    }

    const handleEnd = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    element.addEventListener('touchstart', handleStart, { passive: true })
    element.addEventListener('touchend', handleEnd, { passive: true })
    element.addEventListener('touchcancel', handleEnd, { passive: true })
    element.addEventListener('mousedown', handleStart)
    element.addEventListener('mouseup', handleEnd)
    element.addEventListener('mouseleave', handleEnd)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      element.removeEventListener('touchstart', handleStart)
      element.removeEventListener('touchend', handleEnd)
      element.removeEventListener('touchcancel', handleEnd)
      element.removeEventListener('mousedown', handleStart)
      element.removeEventListener('mouseup', handleEnd)
      element.removeEventListener('mouseleave', handleEnd)
    }
  }, [onLongPress, delay])

  return elementRef
}
