'use client'

import { useState, useEffect } from 'react'
import type { BeforeInstallPromptEvent } from '../../types/events'

interface InstallPromptProps {
  className?: string
}

export default function InstallPrompt({ className = "" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      const isInstalled = isStandaloneMode || isIOSStandalone
      
      setIsStandalone(isStandaloneMode || isIOSStandalone)
      setIsInstalled(isInstalled)
    }

    // Check if iOS
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
      setIsIOS(isIOSDevice)
    }

    checkInstallation()
    checkIOS()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a delay (better UX)
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true)
        }
      }, 3000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`User ${outcome} the install prompt`)
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      
      setShowPrompt(false)
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for this session
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      sessionStorage.setItem('rentpal-install-dismissed', 'true')
    }
  }

  // Don't show if already installed or dismissed this session
  const dismissedThisSession =
    typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
      ? sessionStorage.getItem('rentpal-install-dismissed')
      : null

  if (isInstalled || 
      isStandalone || 
      dismissedThisSession ||
      (!deferredPrompt && !isIOS)) {
    return null
  }

  // iOS install instructions
  if (isIOS && !isStandalone) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Install RentPal App
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Add RentPal to your home screen for quick access and a better experience.
            </p>
            <div className="text-sm text-blue-800 space-y-1">
              <p>1. Tap the share button <span className="inline-block w-4 h-4 bg-blue-600 rounded text-white text-xs text-center">⬆</span></p>
              <p>2. Select &quot;Add to Home Screen&quot;</p>
              <p>3. Tap &quot;Add&quot; to install</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Standard install prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 shadow-lg ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium mb-1">Install RentPal App</h3>
            <p className="text-sm text-blue-100">
              Get the full app experience with offline access and notifications.
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-blue-100 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Hook for PWA installation status
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const checkInstallation = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      setIsInstalled(isStandaloneMode || isIOSStandalone)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    checkInstallation()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Install failed:', error)
      return false
    }
  }

  return {
    canInstall,
    isInstalled,
    install
  }
}