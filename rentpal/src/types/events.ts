// React event handler types for RentPal application

import { FormEvent, ChangeEvent, MouseEvent, KeyboardEvent, FocusEvent, DragEvent } from 'react'

/**
 * Form event handlers
 */
export interface FormEventHandler {
  (event: FormEvent<HTMLFormElement>): void | Promise<void>
}

export interface FormSubmitHandler {
  (event: FormEvent<HTMLFormElement>): void | Promise<void>
}

/**
 * Input event handlers
 */
export interface InputChangeHandler {
  (event: ChangeEvent<HTMLInputElement>): void | Promise<void>
}

export interface TextAreaChangeHandler {
  (event: ChangeEvent<HTMLTextAreaElement>): void | Promise<void>
}

export interface SelectChangeHandler {
  (event: ChangeEvent<HTMLSelectElement>): void | Promise<void>
}

export interface FileInputChangeHandler {
  (event: ChangeEvent<HTMLInputElement>): void | Promise<void>
}

/**
 * Mouse event handlers
 */
export interface ButtonClickHandler {
  (event: MouseEvent<HTMLButtonElement>): void | Promise<void>
}

export interface DivClickHandler {
  (event: MouseEvent<HTMLDivElement>): void | Promise<void>
}

export interface LinkClickHandler {
  (event: MouseEvent<HTMLAnchorElement>): void | Promise<void>
}

export interface ImageClickHandler {
  (event: MouseEvent<HTMLImageElement>): void | Promise<void>
}

export interface GenericClickHandler {
  (event: MouseEvent<HTMLElement>): void | Promise<void>
}

/**
 * Keyboard event handlers
 */
export interface KeyboardEventHandler {
  (event: KeyboardEvent<HTMLElement>): void | Promise<void>
}

export interface InputKeyHandler {
  (event: KeyboardEvent<HTMLInputElement>): void | Promise<void>
}

export interface TextAreaKeyHandler {
  (event: KeyboardEvent<HTMLTextAreaElement>): void | Promise<void>
}

/**
 * Focus event handlers
 */
export interface InputFocusHandler {
  (event: FocusEvent<HTMLInputElement>): void | Promise<void>
}

export interface InputBlurHandler {
  (event: FocusEvent<HTMLInputElement>): void | Promise<void>
}

export interface TextAreaFocusHandler {
  (event: FocusEvent<HTMLTextAreaElement>): void | Promise<void>
}

export interface TextAreaBlurHandler {
  (event: FocusEvent<HTMLTextAreaElement>): void | Promise<void>
}

/**
 * Drag and drop event handlers
 */
export interface DragEventHandler {
  (event: DragEvent<HTMLElement>): void | Promise<void>
}

export interface DropEventHandler {
  (event: DragEvent<HTMLElement>): void | Promise<void>
}

/**
 * Custom event types for specific components
 */

/**
 * PWA install prompt event (non-standard browser API)
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * File upload event data
 */
export interface FileUploadEvent {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  url?: string
}

/**
 * Search event data
 */
export interface SearchEvent {
  query: string
  filters: Record<string, unknown>
  timestamp: number
}

/**
 * Booking event data
 */
export interface BookingEvent {
  itemId: string
  startDate: string
  endDate: string
  totalAmount: number
  status: 'pending' | 'confirmed' | 'cancelled'
}

/**
 * Map interaction event data
 */
export interface MapEvent {
  type: 'click' | 'drag' | 'zoom' | 'marker_click'
  coordinates?: {
    latitude: number
    longitude: number
  }
  markerId?: string
  zoomLevel?: number
}

/**
 * Analytics event data
 */
export interface AnalyticsEvent {
  eventName: string
  category: string
  label?: string
  value?: number
  customParameters?: Record<string, string | number | boolean>
}

/**
 * Error boundary event data
 */
export interface ErrorBoundaryEvent {
  error: Error
  errorInfo: {
    componentStack: string
  }
  timestamp: number
}

/**
 * Notification event data
 */
export interface NotificationEvent {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

/**
 * Generic event handler types
 */
export type EventHandler<T = Event> = (event: T) => void | Promise<void>
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>
export type SyncEventHandler<T = Event> = (event: T) => void