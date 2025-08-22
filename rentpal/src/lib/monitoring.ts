import * as Sentry from '@sentry/nextjs'

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
      
      // Performance monitoring
      integrations: [
        new Sentry.BrowserTracing({
          // Set sampling rate for performance monitoring
          tracingOrigins: [
            'localhost',
            process.env.NEXT_PUBLIC_APP_URL || '',
            /^\//,
          ],
        }),
      ],
      replaysOnErrorSampleRate: 0.1,
      replaysSessionSampleRate: 0.0,

      // Filter out common non-critical errors
      beforeSend(event, hint) {
        const error = hint.originalException

        // Filter out network errors that are not actionable
        if (error && error.message) {
          if (
            error.message.includes('Network Error') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Load failed')
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
export const logError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setContext(key, context[key])
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
export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      if (extra) {
        Object.keys(extra).forEach((key) => {
          scope.setExtra(key, extra[key])
        })
      }
      Sentry.captureMessage(message, level)
    })
  } else {
    console[level === 'warning' ? 'warn' : level]('Message:', message, extra)
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
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
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
    return Sentry.startTransaction({ name, op })
  }
  return null
}

export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const transaction = startTransaction(name, 'function')
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const endTime = performance.now()
    
    logMessage(`Performance: ${name} took ${endTime - startTime}ms`, 'info', {
      duration: endTime - startTime,
      operation: name,
    })
    
    return result
  } catch (error) {
    logError(error as Error, { operation: name })
    throw error
  } finally {
    transaction?.finish()
  }
}

/**
 * Web Vitals monitoring
 */
export const reportWebVitals = (metric: any) => {
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
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
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
export const handleApiError = (error: any, endpoint: string) => {
  const errorInfo = {
    endpoint,
    status: error.status || error.response?.status,
    message: error.message || error.response?.data?.message,
    stack: error.stack,
  }

  logError(error, { api: errorInfo })
  
  // Return user-friendly error message
  if (error.status === 401) {
    return 'Authentication required. Please log in again.'
  } else if (error.status === 403) {
    return 'You do not have permission to perform this action.'
  } else if (error.status === 404) {
    return 'The requested resource was not found.'
  } else if (error.status >= 500) {
    return 'Server error. Please try again later.'
  } else {
    return error.message || 'An unexpected error occurred.'
  }
}

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any, operation: string) => {
  const errorInfo = {
    operation,
    code: error.code,
    message: error.message,
    details: error.details,
  }

  logError(error, { database: errorInfo })
  
  // Return user-friendly error message based on error code
  switch (error.code) {
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