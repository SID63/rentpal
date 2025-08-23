// Performance and error tracking types for RentPal application

/**
 * Performance metric types
 */
export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  tags?: Record<string, string>
}

/**
 * Web Vitals metric interface
 */
export interface WebVitalsMetric {
  id: string
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP'
  value: number
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
  entries: PerformanceEntry[]
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache'
  label?: string
}

/**
 * Error information interface
 */
export interface ErrorInfo {
  message: string
  stack?: string
  componentStack?: string
  errorBoundary?: string
  errorBoundaryStack?: string
  timestamp: number
  url: string
  userAgent: string
  userId?: string
}

/**
 * API error details
 */
export interface ApiErrorInfo {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  statusCode: number
  responseTime: number
  errorMessage: string
  requestId?: string
  userId?: string
  timestamp: number
}

/**
 * Database error details
 */
export interface DatabaseErrorInfo {
  operation: string
  table?: string
  query?: string
  errorCode?: string
  errorMessage: string
  duration: number
  userId?: string
  timestamp: number
}

/**
 * Custom event tracking
 */
export interface CustomEvent {
  name: string
  category: string
  label?: string
  value?: number
  customParameters?: Record<string, string | number | boolean>
  timestamp: number
  userId?: string
  sessionId?: string
}

/**
 * User interaction tracking
 */
export interface UserInteraction {
  type: 'click' | 'scroll' | 'form_submit' | 'search' | 'navigation' | 'file_upload'
  element: string
  elementId?: string
  elementClass?: string
  page: string
  timestamp: number
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

/**
 * Page performance tracking
 */
export interface PagePerformance {
  url: string
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
  timestamp: number
  userId?: string
  sessionId?: string
}

/**
 * Resource loading performance
 */
export interface ResourcePerformance {
  name: string
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'xmlhttprequest'
  size: number
  loadTime: number
  startTime: number
  endTime: number
  cached: boolean
  timestamp: number
}

/**
 * Memory usage tracking
 */
export interface MemoryUsage {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

/**
 * Network information
 */
export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g'
  downlink: number
  rtt: number
  saveData: boolean
  timestamp: number
}

/**
 * Breadcrumb for debugging
 */
export interface Breadcrumb {
  message: string
  category: string
  level: 'info' | 'warning' | 'error' | 'debug'
  timestamp: number
  data?: Record<string, unknown>
}

/**
 * User session information
 */
export interface SessionInfo {
  sessionId: string
  userId?: string
  startTime: number
  endTime?: number
  pageViews: number
  interactions: number
  errors: number
  duration?: number
  userAgent: string
  referrer?: string
  landingPage: string
  exitPage?: string
}

/**
 * Feature usage tracking
 */
export interface FeatureUsage {
  featureName: string
  action: 'view' | 'click' | 'submit' | 'complete' | 'abandon'
  timestamp: number
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

/**
 * A/B test tracking
 */
export interface ABTestEvent {
  testName: string
  variant: string
  event: 'impression' | 'conversion' | 'click'
  timestamp: number
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

/**
 * Business metrics
 */
export interface BusinessMetric {
  name: string
  value: number
  unit: string
  dimension?: Record<string, string>
  timestamp: number
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  name: string
  condition: {
    metric: string
    operator: '>' | '<' | '>=' | '<=' | '==' | '!='
    threshold: number
    timeWindow: number
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  channels: ('email' | 'slack' | 'webhook')[]
  enabled: boolean
}

/**
 * Monitoring context for error reporting
 */
export interface MonitoringContext {
  userId?: string
  sessionId?: string
  requestId?: string
  feature?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  context?: MonitoringContext
  error?: Error
  metadata?: Record<string, unknown>
}