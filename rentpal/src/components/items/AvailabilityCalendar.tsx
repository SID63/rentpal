'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ItemAvailability } from '@/types/database'

interface AvailabilityCalendarProps {
  itemId: string
  onAvailabilityChange?: (availability: ItemAvailability[]) => void
  readOnly?: boolean
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isAvailable: boolean
  isBlocked: boolean
  blockedReason?: string
}

export default function AvailabilityCalendar({
  itemId,
  onAvailabilityChange,
  readOnly = false
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<ItemAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Get first day of the month and calculate calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Generate calendar days
  const calendarDays: CalendarDay[] = []

  // Previous month days
  const prevMonth = new Date(currentYear, currentMonth - 1, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - 1, prevMonth.getDate() - i)
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isAvailable: true,
      isBlocked: false
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day)
    const dateString = date.toISOString().split('T')[0]
    const dayAvailability = availability.find(a => a.date === dateString)
    
    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
      isAvailable: dayAvailability?.is_available ?? true,
      isBlocked: dayAvailability?.is_available === false,
      blockedReason: dayAvailability?.blocked_reason || undefined
    })
  }

  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length // 6 rows × 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentYear, currentMonth + 1, day)
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isAvailable: true,
      isBlocked: false
    })
  }

  useEffect(() => {
    fetchAvailability()
  }, [itemId, currentDate])

  const fetchAvailability = async () => {
    if (!itemId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch availability for the current month and adjacent months
      const startDate = new Date(currentYear, currentMonth - 1, 1)
      const endDate = new Date(currentYear, currentMonth + 2, 0)

      const { data, error } = await supabase
        .from('item_availability')
        .select('*')
        .eq('item_id', itemId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

      if (error) {
        setError('Failed to load availability')
        return
      }

      setAvailability(data || [])
      if (onAvailabilityChange) {
        onAvailabilityChange(data || [])
      }
    } catch {
      setError('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const toggleDayAvailability = async (date: Date) => {
    if (readOnly || date < today) return

    const dateString = date.toISOString().split('T')[0]
    const existingAvailability = availability.find(a => a.date === dateString)
    const newIsAvailable = existingAvailability ? !existingAvailability.is_available : false

    try {
      if (existingAvailability) {
        // Update existing record
        const { error } = await supabase
          .from('item_availability')
          .update({ 
            is_available: newIsAvailable,
            blocked_reason: newIsAvailable ? null : 'Owner unavailable'
          })
          .eq('id', existingAvailability.id)

        if (error) {
          setError('Failed to update availability')
          return
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('item_availability')
          .insert({
            item_id: itemId,
            date: dateString,
            is_available: newIsAvailable,
            blocked_reason: newIsAvailable ? null : 'Owner unavailable'
          })

        if (error) {
          setError('Failed to update availability')
          return
        }
      }

      // Refresh availability
      await fetchAvailability()
    } catch {
      setError('Failed to update availability')
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          {readOnly ? 'Availability' : 'Manage Availability'}
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-lg font-medium min-w-[200px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </h4>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      {!readOnly && (
        <div className="flex items-center space-x-6 mb-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
            <span>Past dates</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const isPast = day.date < today
          const isClickable = !readOnly && day.isCurrentMonth && !isPast

          return (
            <button
              key={index}
              onClick={() => isClickable && toggleDayAvailability(day.date)}
              disabled={!isClickable}
              className={`
                p-2 text-sm rounded transition-colors relative
                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${day.isToday ? 'font-bold' : ''}
                ${isPast ? 'bg-gray-100 cursor-not-allowed' : ''}
                ${day.isCurrentMonth && !isPast && day.isAvailable ? 'bg-green-100 hover:bg-green-200 border border-green-300' : ''}
                ${day.isCurrentMonth && !isPast && day.isBlocked ? 'bg-red-100 hover:bg-red-200 border border-red-300' : ''}
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
              title={day.isBlocked ? day.blockedReason : undefined}
            >
              {day.date.getDate()}
              {day.isToday && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
              )}
            </button>
          )
        })}
      </div>

      {/* Instructions */}
      {!readOnly && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Click on dates to toggle availability. Green = available, Red = blocked.</p>
          <p>Past dates cannot be modified.</p>
        </div>
      )}
    </div>
  )
}