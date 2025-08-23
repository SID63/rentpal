'use client'

import { useEffect, useState } from 'react'
import { usePWAInstall } from './InstallPrompt'
import type { BeforeInstallPromptEvent } from '../../types/events'

interface PWAProviderProps {
  children: React.ReactNode
}

export default function PWAProvider({ children }: PWAProviderProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const { isInstalled } = usePWAInstall()

  useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
    const enableSw = process.env.NEXT_PUBLIC_ENABLE_SW === 'true'
    const nodeEnv = process.env.NODE_ENV

    // Diagnostics
    if (typeof window !== 'undefined') {
      console.log('[PWAProvider] SW gating', { nodeEnv, enableSw, hostname: window.location.hostname })
    }

    // Never keep SW on localhost; always unregister
    if (isLocalhost && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
    }

    // Only register when explicitly enabled via env flag AND not on localhost
    if (enableSw && !isLocalhost) {
      if ('serviceWorker' in navigator) {
        registerServiceWorker()
      }
      if (isInstalled) {
        checkForUpdates()
      }
    }
  }, [isInstalled])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service Worker registered:', registration)
      setIsRegistered(true)

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
            }
          })
        }
      })

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        registration.update()
      }
    }
  }

  const handleUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration && registration.waiting) {
        // Tell the waiting service worker to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        
        // Reload the page to activate the new service worker
        window.location.reload()
      }
    }
  }

  const dismissUpdate = () => {
    setUpdateAvailable(false)
  }

  return (
    <>
      {children}
      
      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
          <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Update Available</h3>
                <p className="text-sm text-blue-100 mb-3">
                  A new version of RentPal is available with improvements and bug fixes.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdate}
                    className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={dismissUpdate}
                    className="text-blue-100 hover:text-white px-3 py-1 text-sm"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-2 py-1 rounded text-xs font-mono ${
            isRegistered 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            SW: {isRegistered ? 'Active' : 'Loading'}
          </div>
        </div>
      )}
    </>
  )
}

// Hook for PWA features
export function usePWAFeatures() {
  const [isOnline, setIsOnline] = useState(true)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const promptInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt()
      const { outcome } = await installPromptEvent.userChoice
      setInstallPromptEvent(null)
      return outcome === 'accepted'
    }
    return false
  }

  return {
    isOnline,
    canInstall: !!installPromptEvent,
    promptInstall
  }
}