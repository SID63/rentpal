import * as Sentry from '@sentry/react'
import type { 
  MonitoringContext, 
  WebVitalsMetric,
  LogLevel 
} from '../types/monitoring'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}

/**
 * Initialize error tracking and monitoring
 */
export const initializeMonitoring = () => {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
      debug: false,
      replaysOnErrorSampleRate: 0.1,
      replaysSessionSampleRate: 0.0,
      // Remove Prisma integration to avoid OpenTelemetry dynamic import warnings
      integrations(integrations) {
        return integrations.filter((i) => i.name !== 'Prisma')
      },

      // Filter out common non-critical errors
      beforeSend(event, hint) {
        const original = hint.originalException as unknown
        const message =
          original && typeof original === 'object' && 'message' in original
            ? String((original as Record<string, unknown>).message)
            : undefined

        // Filter out network errors that are not actionable
        if (message) {
          if (
            message.includes('Network Error') ||
            message.includes('Failed to fetch') ||
            message.includes('Load failed')
          ) {
            return null
          }
        }

        // Filter out ResizeObserver errors (common browser quirk)
        if (
          event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')
        ) {
          return null
        }

        return event
      },

      // Set user context
      beforeSendTransaction(event) {
        // Add custom tags for better filtering
        event.tags = {
          ...event.tags,
          component: 'rentpal',
        }
        return event
      },
    })
  }
}

/**
 * Log custom events and errors
 */
export const logError = (error: Error, context?: MonitoringContext) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          const value = context[key]
          if (value !== undefined && value !== null) {
            scope.setContext(key, value as Record<string, unknown>)
          }
        })
      }
      Sentry.captureException(error)
    })
  } else {
    console.error('Error:', error, context)
  }
}

/**
 * Log custom messages
 */
export const logMessage = (message: string, level: LogLevel = 'info', extra?: MonitoringContext) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      if (extra) {
        Object.keys(extra).forEach((key) => {
          const value = extra[key]
          if (value !== undefined) {
            scope.setExtra(key, value)
          }
        })
      }
      const sentryLevel: 'debug' | 'info' | 'warning' | 'error' = level === 'critical' ? 'error' : level
      Sentry.captureMessage(message, sentryLevel)
    })
  } else {
    const consoleMethod = level === 'warning' ? 'warn' : level === 'critical' ? 'error' : level
    switch (consoleMethod) {
      case 'debug':
        console.debug('Message:', message, extra)
        break
      case 'info':
        console.info('Message:', message, extra)
        break
      case 'warn':
        console.warn('Message:', message, extra)
        break
      case 'error':
        console.error('Message:', message, extra)
        break
      default:
        console.log('Message:', message, extra)
    }
  }
}

/**
 * Set user context for error tracking
 */
export const setUserContext = (user: {
  id: string
  email?: string
  username?: string
}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
  }
}

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    })
  }
}

/**
 * Performance monitoring utilities
 */
export const startTransaction = (name: string, op: string) => {
  if (process.env.NODE_ENV === 'production') {
    // startSpan is the modern API in the Sentry SDKs
    return Sentry.startSpan({ name, op }, () => null)
  }
  return null
}

export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  // Use startSpan to measure performance in production
  let spanFinished = false
  const spanWrapper = async () => {
    return await operation()
  }
  let resultPromise: Promise<T>
  if (process.env.NODE_ENV === 'production') {
    resultPromise = Sentry.startSpan({ name, op: 'function' }, spanWrapper)
    spanFinished = true
  } else {
    resultPromise = operation()
  }
  const startTime = performance.now()
  
  try {
    const result = await resultPromise
    const endTime = performance.now()
    
    logMessage(`Performance: ${name} took ${endTime - startTime}ms`, 'info', {
      metadata: {
        duration: endTime - startTime,
        operation: name,
      }
    })
    
    return result
  } catch (error) {
    logError(error as Error, { action: name })
    throw error
  } finally {
    // startSpan above auto-finishes when the callback resolves/rejects
    if (!spanFinished) {
      // no-op
    }
  }
}

/**
 * Web Vitals monitoring
 */
export const reportWebVitals = (metric: WebVitalsMetric) => {
  if (process.env.NODE_ENV === 'production') {
    // Report to Sentry
    Sentry.addBreadcrumb({
      message: `Web Vital: ${metric.name}`,
      category: 'performance',
      data: {
        name: metric.name,
        value: metric.value,
        id: metric.id,
        label: metric.label,
      },
      level: 'info',
    })

    // Report to analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window && typeof window.gtag === 'function') {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }
  }
}

/**
 * API error handler
 */
export const handleApiError = (error: unknown, endpoint: string): string => {
  interface ApiError {
    status?: number
    message?: string
    stack?: string
    response?: {
      status?: number
      data?: {
        message?: string
      }
    }
  }

  const errorObj = error as ApiError
  const response = errorObj?.response
  const responseData = response?.data
  
  const errorInfo = {
    endpoint,
    status: errorObj?.status || response?.status,
    message: errorObj?.message || responseData?.message,
    stack: errorObj?.stack,
  }

  logError(error instanceof Error ? error : new Error(String(error)), { 
    metadata: { api: errorInfo } 
  })
  
  // Return user-friendly error message
  const status = errorObj?.status || response?.status
  if (status === 401) {
    return 'Authentication required. Please log in again.'
  } else if (status === 403) {
    return 'You do not have permission to perform this action.'
  } else if (status === 404) {
    return 'The requested resource was not found.'
  } else if (status && status >= 500) {
    return 'Server error. Please try again later.'
  } else {
    return errorObj?.message || 'An unexpected error occurred.'
  }
}

/**
 * Database error handler
 */
export const handleDatabaseError = (error: unknown, operation: string): string => {
  interface DatabaseError {
    code?: string
    message?: string
    details?: string
  }

  const errorObj = error as DatabaseError
  const errorInfo = {
    operation,
    code: errorObj?.code,
    message: errorObj?.message,
    details: errorObj?.details,
  }

  logError(error instanceof Error ? error : new Error(String(error)), { 
    metadata: { database: errorInfo } 
  })
  
  // Return user-friendly error message based on error code
  const code = errorObj?.code
  switch (code) {
    case '23505': // Unique violation
      return 'This item already exists.'
    case '23503': // Foreign key violation
      return 'Referenced item does not exist.'
    case '23514': // Check violation
      return 'Invalid data provided.'
    default:
      return 'Database error. Please try again.'
  }
}