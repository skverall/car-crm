'use client'

import React, { useState, useEffect } from 'react'
import { Smartphone, Monitor, AlertTriangle, CheckCircle } from 'lucide-react'

export default function ViewportTestHelper() {
  const [viewportInfo, setViewportInfo] = useState({
    innerWidth: 0,
    innerHeight: 0,
    outerWidth: 0,
    outerHeight: 0,
    screenWidth: 0,
    screenHeight: 0,
    devicePixelRatio: 1,
    orientation: 'portrait',
    hasHorizontalScroll: false,
    documentWidth: 0
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateViewportInfo = () => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth
      
      setViewportInfo({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth || window.innerWidth,
        outerHeight: window.outerHeight || window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        hasHorizontalScroll,
        documentWidth: document.documentElement.scrollWidth
      })
    }

    updateViewportInfo()
    
    const handleResize = () => {
      setTimeout(updateViewportInfo, 100) // Delay to ensure layout is complete
    }
    
    const handleOrientationChange = () => {
      setTimeout(updateViewportInfo, 500) // Longer delay for orientation change
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    // Check periodically for scroll changes
    const interval = setInterval(updateViewportInfo, 2000)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      clearInterval(interval)
    }
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-colors ${
          viewportInfo.hasHorizontalScroll 
            ? 'bg-red-600 text-white animate-pulse' 
            : 'bg-green-600 text-white'
        }`}
        title="Viewport Test Info"
      >
        {viewportInfo.hasHorizontalScroll ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Smartphone className="h-4 w-4 mr-2" />
          Viewport Test
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          ×
        </button>
      </div>

      {/* Horizontal Scroll Warning */}
      {viewportInfo.hasHorizontalScroll && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-800 text-sm font-medium mb-1">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Horizontal Scroll Detected!
          </div>
          <p className="text-red-700 text-xs">
            Document width ({viewportInfo.documentWidth}px) exceeds viewport width ({viewportInfo.innerWidth}px)
          </p>
        </div>
      )}

      {!viewportInfo.hasHorizontalScroll && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-800 text-sm font-medium">
            <CheckCircle className="h-4 w-4 mr-2" />
            No Horizontal Scroll ✓
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm">
        {/* Viewport Dimensions */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Viewport:</span>
          <span className="font-medium text-gray-900">
            {viewportInfo.innerWidth}×{viewportInfo.innerHeight}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Document Width:</span>
          <span className={`font-medium ${
            viewportInfo.hasHorizontalScroll ? 'text-red-600' : 'text-green-600'
          }`}>
            {viewportInfo.documentWidth}px
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Screen:</span>
          <span className="font-medium text-gray-900">
            {viewportInfo.screenWidth}×{viewportInfo.screenHeight}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Pixel Ratio:</span>
          <span className="font-medium text-gray-900">
            {viewportInfo.devicePixelRatio}x
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Orientation:</span>
          <span className="font-medium text-gray-900 capitalize">
            {viewportInfo.orientation}
          </span>
        </div>

        {/* Device Type Detection */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Device Type:</span>
          <span className="font-medium text-gray-900">
            {viewportInfo.innerWidth < 768 ? 'Mobile' : 
             viewportInfo.innerWidth < 1024 ? 'Tablet' : 'Desktop'}
          </span>
        </div>

        {/* Breakpoint Info */}
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <div className="font-medium text-gray-700 mb-1">Active Breakpoints:</div>
          <div className="space-y-1">
            <div className={viewportInfo.innerWidth < 640 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              xs: &lt; 640px {viewportInfo.innerWidth < 640 ? '✓' : ''}
            </div>
            <div className={viewportInfo.innerWidth >= 640 && viewportInfo.innerWidth < 768 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              sm: 640px+ {viewportInfo.innerWidth >= 640 && viewportInfo.innerWidth < 768 ? '✓' : ''}
            </div>
            <div className={viewportInfo.innerWidth >= 768 && viewportInfo.innerWidth < 1024 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              md: 768px+ {viewportInfo.innerWidth >= 768 && viewportInfo.innerWidth < 1024 ? '✓' : ''}
            </div>
            <div className={viewportInfo.innerWidth >= 1024 && viewportInfo.innerWidth < 1280 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              lg: 1024px+ {viewportInfo.innerWidth >= 1024 && viewportInfo.innerWidth < 1280 ? '✓' : ''}
            </div>
            <div className={viewportInfo.innerWidth >= 1280 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              xl: 1280px+ {viewportInfo.innerWidth >= 1280 ? '✓' : ''}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
          <div className="font-medium text-blue-800 mb-1">Tips:</div>
          <ul className="text-blue-700 space-y-1">
            <li>• Red button = horizontal scroll detected</li>
            <li>• Green button = no horizontal scroll</li>
            <li>• Test in different orientations</li>
            <li>• Check on real devices</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
