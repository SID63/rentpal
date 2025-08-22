/**
 * Analytics and performance monitoring utilities
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

/**
 * Google Analytics configuration
 */
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

export const event = (action: string, parameters: {
  event_category?: string
  event_label?: string
  value?: number
  [key: string]: any
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, parameters)
  }
}

/**
 * Custom event tracking
 */
export const trackEvent = {
  // User actions
  userRegistered: (method: string) => {
    event('sign_up', {
      method,
      event_category: 'engagement',
    })
  },

  userLoggedIn: (method: string) => {
    event('login', {
      method,
      event_category: 'engagement',
    })
  },

  // Item interactions
  itemViewed: (itemId: string, category: string) => {
    event('view_item', {
      item_id: itemId,
      item_category: category,
      event_category: 'ecommerce',
    })
  },

  itemSearched: (query: string, resultCount: number) => {
    event('search', {
      search_term: query,
      event_category: 'engagement',
      custom_parameters: {
        result_count: resultCount,
      },
    })
  },

  itemListed: (itemId: string, category: string, price: number) => {
    event('item_listed', {
      item_id: itemId,
      item_category: category,
      value: price,
      event_category: 'business',
    })
  },

  // Booking actions
  bookingStarted: (itemId: string, value: number) => {
    event('begin_checkout', {
      item_id: itemId,
      value,
      currency: 'USD',
      event_category: 'ecommerce',
    })
  },

  bookingCompleted: (bookingId: string, itemId: string, value: number) => {
    event('purchase', {
      transaction_id: bookingId,
      item_id: itemId,
      value,
      currency: 'USD',
      event_category: 'ecommerce',
    })
  },

  bookingCancelled: (bookingId: string, reason: string) => {
    event('booking_cancelled', {
      booking_id: bookingId,
      cancellation_reason: reason,
      event_category: 'business',
    })
  },

  // Engagement
  messagesSent: (conversationId: string) => {
    event('message_sent', {
      conversation_id: conversationId,
      event_category: 'engagement',
    })
  },

  reviewSubmitted: (itemId: string, rating: number) => {
    event('review_submitted', {
      item_id: itemId,
      rating,
      event_category: 'engagement',
    })
  },

  // Performance
  pageLoadTime: (page: string, loadTime: number) => {
    event('page_load_time', {
      page_path: page,
      load_time: loadTime,
      event_category: 'performance',
    })
  },

  apiResponseTime: (endpoint: string, responseTime: number, status: number) => {
    event('api_response_time', {
      endpoint,
      response_time: responseTime,
      status_code: status,
      event_category: 'performance',
    })
  },

  // Errors
  errorOccurred: (errorType: string, errorMessage: string, page: string) => {
    event('exception', {
      description: `${errorType}: ${errorMessage}`,
      fatal: false,
      page_path: page,
      event_category: 'error',
    })
  },
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTiming(label: string): void {
    this.metrics.set(label, performance.now())
  }

  endTiming(label: string): number {
    const startTime = this.metrics.get(label)
    if (!startTime) {
      console.warn(`No start time found for ${label}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.metrics.delete(label)

    // Track in analytics
    trackEvent.pageLoadTime(label, duration)

    return duration
  }

  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.startTiming(label)
    return fn().finally(() => {
      this.endTiming(label)
    })
  }

  measureSync<T>(label: string, fn: () => T): T {
    this.startTiming(label)
    try {
      return fn()
    } finally {
      this.endTiming(label)
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

/**
 * Web Vitals monitoring
 */
export const reportWebVitals = (metric: any) => {
  // Report to Google Analytics
  event(metric.name, {
    event_category: 'Web Vitals',
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_label: metric.id,
    non_interaction: true,
  })

  // Report to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric)
  }

  // Report to external monitoring service
  if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'web-vital',
        metric: {
          name: metric.name,
          value: metric.value,
          id: metric.id,
          label: metric.label,
        },
        url: window.location.href,
        timestamp: Date.now(),
      }),
    }).catch(console.error)
  }
}

/**
 * User behavior tracking
 */
export const trackUserBehavior = {
  pageView: (page: string, title: string) => {
    pageview(page)
    
    // Track time on page
    const startTime = Date.now()
    
    const handleBeforeUnload = () => {
      const timeOnPage = Date.now() - startTime
      event('page_view_duration', {
        page_path: page,
        page_title: title,
        duration: timeOnPage,
        event_category: 'engagement',
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  },

  click: (element: string, page: string) => {
    event('click', {
      element_name: element,
      page_path: page,
      event_category: 'engagement',
    })
  },

  scroll: (percentage: number, page: string) => {
    event('scroll', {
      scroll_percentage: percentage,
      page_path: page,
      event_category: 'engagement',
    })
  },

  formSubmission: (formName: string, success: boolean) => {
    event('form_submit', {
      form_name: formName,
      success,
      event_category: 'engagement',
    })
  },

  fileDownload: (fileName: string, fileType: string) => {
    event('file_download', {
      file_name: fileName,
      file_type: fileType,
      event_category: 'engagement',
    })
  },
}

/**
 * A/B testing utilities
 */
export class ABTestManager {
  private static instance: ABTestManager
  private tests: Map<string, string> = new Map()

  static getInstance(): ABTestManager {
    if (!ABTestManager.instance) {
      ABTestManager.instance = new ABTestManager()
    }
    return ABTestManager.instance
  }

  getVariant(testName: string, variants: string[]): string {
    // Check if user already has a variant assigned
    let variant = this.tests.get(testName)
    
    if (!variant) {
      // Assign random variant
      variant = variants[Math.floor(Math.random() * variants.length)]
      this.tests.set(testName, variant)
      
      // Store in localStorage for consistency
      if (typeof window !== 'undefined') {
        localStorage.setItem(`ab_test_${testName}`, variant)
      }
      
      // Track assignment
      event('ab_test_assignment', {
        test_name: testName,
        variant,
        event_category: 'experiment',
      })
    }

    return variant
  }

  trackConversion(testName: string, conversionType: string) {
    const variant = this.tests.get(testName)
    if (variant) {
      event('ab_test_conversion', {
        test_name: testName,
        variant,
        conversion_type: conversionType,
        event_category: 'experiment',
      })
    }
  }

  // Initialize from localStorage
  initialize() {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('ab_test_')) {
          const testName = key.replace('ab_test_', '')
          const variant = localStorage.getItem(key)
          if (variant) {
            this.tests.set(testName, variant)
          }
        }
      })
    }
  }
}

export const abTestManager = ABTestManager.getInstance()

/**
 * Custom hooks for analytics
 */
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export const usePageTracking = () => {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      pageview(url)
    }

    // Track initial page load
    pageview(window.location.pathname)

    // Note: Next.js 13+ app router doesn't have router events
    // You might need to implement this differently based on your routing setup
    
  }, [router])
}

export const useScrollTracking = (thresholds = [25, 50, 75, 90]) => {
  const trackedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )

      thresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !trackedRef.current.has(threshold)) {
          trackedRef.current.add(threshold)
          trackUserBehavior.scroll(threshold, window.location.pathname)
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [thresholds])
}

export const useClickTracking = (elementName: string) => {
  return () => {
    trackUserBehavior.click(elementName, window.location.pathname)
  }
}

/**
 * Initialize analytics
 */
export const initializeAnalytics = () => {
  // Initialize A/B testing
  abTestManager.initialize()

  // Set up global error tracking
  window.addEventListener('error', (event) => {
    trackEvent.errorOccurred('JavaScript Error', event.message, window.location.pathname)
  })

  window.addEventListener('unhandledrejection', (event) => {
    trackEvent.errorOccurred('Unhandled Promise Rejection', event.reason, window.location.pathname)
  })

  // Track performance metrics
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          trackEvent.pageLoadTime('full_page_load', navigation.loadEventEnd - navigation.fetchStart)
        }
      }, 0)
    })
  }
}