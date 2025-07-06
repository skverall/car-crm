'use client'

import React, { useState, useEffect } from 'react'
import { useIsMobile, useNetworkStatus, useDeviceCapabilities, useReducedMotion } from '@/hooks/useMobileOptimization'
import { Smartphone, Wifi, WifiOff, Monitor, Zap, Settings } from 'lucide-react'

interface MobileTestHelperProps {
  isVisible?: boolean
  onToggle?: () => void
}

export default function MobileTestHelper({ isVisible = false, onToggle }: MobileTestHelperProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isMobile = useIsMobile()
  const { isOnline, connectionType, isSlowConnection } = useNetworkStatus()
  const { supportsWebP, supportsAvif, deviceMemory, hardwareConcurrency, maxTouchPoints } = useDeviceCapabilities()
  const { prefersReducedMotion, shouldReduceMotion } = useReducedMotion()

  const [screenInfo, setScreenInfo] = useState({
    width: 0,
    height: 0,
    pixelRatio: 1,
    orientation: 'portrait'
  })

  useEffect(() => {
    const updateScreenInfo = () => {
      setScreenInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      })
    }

    updateScreenInfo()
    window.addEventListener('resize', updateScreenInfo)
    window.addEventListener('orientationchange', updateScreenInfo)

    return () => {
      window.removeEventListener('resize', updateScreenInfo)
      window.removeEventListener('orientationchange', updateScreenInfo)
    }
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Show Mobile Test Info"
      >
        <Smartphone className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Smartphone className="h-4 w-4 mr-2" />
          Mobile Test Info
        </h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Device Type */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Device Type:</span>
          <span className={`font-medium ${isMobile ? 'text-blue-600' : 'text-gray-900'}`}>
            {isMobile ? 'Mobile' : 'Desktop'}
          </span>
        </div>

        {/* Screen Info */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Screen:</span>
          <span className="font-medium text-gray-900">
            {screenInfo.width}×{screenInfo.height}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Pixel Ratio:</span>
          <span className="font-medium text-gray-900">
            {screenInfo.pixelRatio}x
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Orientation:</span>
          <span className="font-medium text-gray-900 capitalize">
            {screenInfo.orientation}
          </span>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 flex items-center">
            {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            Network:
          </span>
          <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? connectionType : 'Offline'}
          </span>
        </div>

        {isSlowConnection && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
            ⚠️ Slow connection detected
          </div>
        )}

        {/* Touch Support */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Touch Points:</span>
          <span className="font-medium text-gray-900">
            {maxTouchPoints}
          </span>
        </div>

        {/* Performance Info */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">CPU Cores:</span>
          <span className="font-medium text-gray-900">
            {hardwareConcurrency}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Memory:</span>
          <span className="font-medium text-gray-900">
            {deviceMemory}GB
          </span>
        </div>

        {/* Image Support */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">WebP:</span>
          <span className={`font-medium ${supportsWebP ? 'text-green-600' : 'text-red-600'}`}>
            {supportsWebP ? '✓' : '✗'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">AVIF:</span>
          <span className={`font-medium ${supportsAvif ? 'text-green-600' : 'text-red-600'}`}>
            {supportsAvif ? '✓' : '✗'}
          </span>
        </div>

        {/* Motion Preferences */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Reduced Motion:</span>
          <span className={`font-medium ${shouldReduceMotion ? 'text-orange-600' : 'text-green-600'}`}>
            {shouldReduceMotion ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Responsive Breakpoints */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left text-blue-600 hover:text-blue-700 text-xs mt-2"
        >
          {showDetails ? 'Hide' : 'Show'} Breakpoint Details
        </button>

        {showDetails && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
            <div>xs: &lt; 640px {screenInfo.width < 640 ? '✓' : ''}</div>
            <div>sm: 640px+ {screenInfo.width >= 640 && screenInfo.width < 768 ? '✓' : ''}</div>
            <div>md: 768px+ {screenInfo.width >= 768 && screenInfo.width < 1024 ? '✓' : ''}</div>
            <div>lg: 1024px+ {screenInfo.width >= 1024 && screenInfo.width < 1280 ? '✓' : ''}</div>
            <div>xl: 1280px+ {screenInfo.width >= 1280 ? '✓' : ''}</div>
          </div>
        )}

        {/* Performance Warnings */}
        {(deviceMemory < 2 || hardwareConcurrency < 4) && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
            ⚠️ Low-end device detected. Performance optimizations active.
          </div>
        )}
      </div>
    </div>
  )
}

// Hook to easily add mobile test helper to any component
export function useMobileTestHelper() {
  const [isVisible, setIsVisible] = useState(false)

  const toggleVisibility = () => setIsVisible(!isVisible)

  const TestHelper = () => (
    <MobileTestHelper isVisible={isVisible} onToggle={toggleVisibility} />
  )

  return { TestHelper, isVisible, toggleVisibility }
}
