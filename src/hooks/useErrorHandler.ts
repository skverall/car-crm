import { useState, useCallback } from 'react'
import { SecurityAuditLogger } from '@/lib/utils/security'

export interface ErrorInfo {
  message: string
  code?: string
  details?: any
  timestamp: Date
  context?: string
}

export interface UseErrorHandlerReturn {
  error: ErrorInfo | null
  errors: ErrorInfo[]
  hasError: boolean
  handleError: (error: unknown, context?: string, userMessage?: string) => void
  clearError: () => void
  clearAllErrors: () => void
  retryLastAction: () => void
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [errors, setErrors] = useState<ErrorInfo[]>([])
  const [lastAction, setLastAction] = useState<(() => void) | null>(null)

  const handleError = useCallback((
    error: unknown, 
    context?: string, 
    userMessage?: string
  ) => {
    let errorInfo: ErrorInfo

    if (error instanceof Error) {
      errorInfo = {
        message: userMessage || error.message,
        code: (error as any).code,
        details: error,
        timestamp: new Date(),
        context
      }
    } else if (typeof error === 'string') {
      errorInfo = {
        message: userMessage || error,
        timestamp: new Date(),
        context
      }
    } else {
      errorInfo = {
        message: userMessage || 'An unexpected error occurred',
        details: error,
        timestamp: new Date(),
        context
      }
    }

    // Log error for debugging
    console.error('Application error:', {
      ...errorInfo,
      originalError: error
    })

    // Log to security audit if it's a security-related error
    if (context?.includes('security') || context?.includes('auth')) {
      SecurityAuditLogger.log({
        action: 'ERROR',
        resource: 'security',
        details: {
          error: errorInfo.message,
          context,
          timestamp: errorInfo.timestamp
        }
      })
    }

    setError(errorInfo)
    setErrors(prev => [...prev, errorInfo].slice(-10)) // Keep last 10 errors

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearAllErrors = useCallback(() => {
    setError(null)
    setErrors([])
  }, [])

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      clearError()
      lastAction()
    }
  }, [lastAction, clearError])

  const setRetryAction = useCallback((action: () => void) => {
    setLastAction(() => action)
  }, [])

  return {
    error,
    errors,
    hasError: error !== null,
    handleError,
    clearError,
    clearAllErrors,
    retryLastAction
  }
}

// Specialized error handler for API calls
export function useApiErrorHandler() {
  const { handleError, ...rest } = useErrorHandler()

  const handleApiError = useCallback((
    error: unknown,
    operation: string,
    userMessage?: string
  ) => {
    let message = userMessage

    if (error && typeof error === 'object' && 'message' in error) {
      const apiError = error as any
      
      // Handle common API error patterns
      if (apiError.code === 'PGRST116') {
        message = 'No data found'
      } else if (apiError.code === 'PGRST301') {
        message = 'Permission denied'
      } else if (apiError.code === '23505') {
        message = 'This record already exists'
      } else if (apiError.code === '23503') {
        message = 'Cannot delete: record is referenced by other data'
      } else if (apiError.message?.includes('JWT')) {
        message = 'Session expired. Please log in again.'
      } else if (apiError.message?.includes('RLS')) {
        message = 'Access denied'
      }
    }

    handleError(error, `api_${operation}`, message)
  }, [handleError])

  return {
    ...rest,
    handleError: handleApiError
  }
}

// Error boundary hook for React components
export function useErrorBoundary() {
  const { handleError } = useErrorHandler()

  const captureError = useCallback((error: Error, errorInfo: any) => {
    handleError(error, 'component_error', 'A component error occurred')
    
    // Log additional React error info
    console.error('React Error Boundary:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    })
  }, [handleError])

  return { captureError }
}

// Global error handler for unhandled promises and errors
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    SecurityAuditLogger.log({
      action: 'UNHANDLED_ERROR',
      resource: 'global',
      details: {
        type: 'unhandled_promise_rejection',
        reason: event.reason?.toString(),
        timestamp: new Date()
      }
    })
    
    // Prevent the default browser behavior
    event.preventDefault()
  })

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error)
    
    SecurityAuditLogger.log({
      action: 'UNHANDLED_ERROR',
      resource: 'global',
      details: {
        type: 'uncaught_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date()
      }
    })
  })
}

// Error display component helper
export interface ErrorDisplayProps {
  error: ErrorInfo | null
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
}

export function getErrorDisplayProps(
  error: ErrorInfo | null,
  onDismiss?: () => void,
  onRetry?: () => void
): ErrorDisplayProps {
  return {
    error,
    onDismiss,
    onRetry,
    className: error ? 'error-display' : 'error-display hidden'
  }
}

// Validation error handler
export function useValidationErrorHandler() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const setFieldErrors = useCallback((field: string, errors: string[]) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: errors
    }))
  }, [])

  const clearFieldErrors = useCallback((field: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllValidationErrors = useCallback(() => {
    setValidationErrors({})
  }, [])

  const hasValidationErrors = Object.keys(validationErrors).length > 0
  const getFieldErrors = useCallback((field: string) => validationErrors[field] || [], [validationErrors])

  return {
    validationErrors,
    hasValidationErrors,
    setFieldErrors,
    clearFieldErrors,
    clearAllValidationErrors,
    getFieldErrors
  }
}
