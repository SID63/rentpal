'use client'

import { useEffect } from 'react'
import { initializeMonitoring } from '@/lib/monitoring'
import { initializeAnalytics } from '@/lib/analytics'

export default function ClientInit() {
  useEffect(() => {
    initializeMonitoring()
    initializeAnalytics()
  }, [])

  return null
}


