'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ItemAvailability, Booking } from '@/types/database'

interface BookingCalendarProps {
  itemId: string
  selectedStartDate?: string
  selectedEndDate?: string
  onDateSelect?: (startDate: string, endDate: string) => void
  minRentalDuration?: number // in hours
  maxRentalDuration?: number // in hours
  className?: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isAvailable: boolean
  isBlocked: boolean
  isBooked: boolean
  isSelected: boolean
  isInRange: boolean
  blockedReason?: string
}

export default function BookingCalendar({
  itemId,
  selectedStartDate,
  selectedEndDate,
  onDateSelect,
  minRentalDuration = 1,
  maxRentalDuration,
  className = ""
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<ItemAvailability[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectingRange, setSelectingRange] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<string | null>(null)

  const today = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Get first day of the month and calculate calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const fetchCalendarData = useCallback(async () => {
    if (!itemId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch availability and bookings for the current month and adjacent months
      const startDate = new Date(currentYear, currentMonth - 1, 1)
      const endDate = new Date(currentYear, currentMonth + 2, 0)

      const [availabilityResult, bookingsResult] = await Promise.all([
        supabase
          .from('item_availability')
          .select('*')
          .eq('item_id', itemId)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]),
        
        supabase
          .from('bookings')
          .select('*')
          .eq('item_id', itemId)
          .in('status', ['confirmed', 'active'])
          .gte('start_date', startDate.toISOString())
          .lte('end_date', endDate.toISOString())
      ])

      if (availabilityResult.error) {
        setError('Failed to load availability')
        return
      }

      if (bookingsResult.error) {
        setError('Failed to load bookings')
        return
      }

      setAvailability(availabilityResult.data || [])
      setBookings(bookingsResult.data || [])
    } catch {
      setError('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [itemId, currentMonth, currentYear])

  useEffect(() => {
    fetchCalendarData()
  }, [itemId, currentDate, fetchCalendarData])

  const isDateBooked = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0]
    return bookings.some(booking => {
      const startDate = new Date(booking.start_date).toISOString().split('T')[0]
      const endDate = new Date(booking.end_date).toISOString().split('T')[0]
      return dateString >= startDate && dateString <= endDate
    })
  }

  const isDateBlocked = (date: Date): { blocked: boolean; reason?: string } => {
    const dateString = date.toISOString().split('T')[0]
    const dayAvailability = availability.find(a => a.date === dateString)
    
    if (dayAvailability && !dayAvailability.is_available) {
      return { blocked: true, reason: dayAvailability.blocked_reason || 'Unavailable' }
    }
    
    return { blocked: false }
  }

  const isDateInSelectedRange = (date: Date): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false
    
    const dateString = date.toISOString().split('T')[0]
    return dateString >= selectedStartDate && dateString <= selectedEndDate
  }

  const isDateSelected = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0]
    return dateString === selectedStartDate || dateString === selectedEndDate
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const calendarDays: CalendarDay[] = []

    // Previous month days
    const prevMonth = new Date(currentYear, currentMonth - 1, 0)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonth.getDate() - i)
      const blockedInfo = isDateBlocked(date)
      
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isAvailable: !blockedInfo.blocked && !isDateBooked(date),
        isBlocked: blockedInfo.blocked,
        isBooked: isDateBooked(date),
        isSelected: false,
        isInRange: false,
        blockedReason: blockedInfo.reason
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const blockedInfo = isDateBlocked(date)
      const isBooked = isDateBooked(date)
      
      calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isAvailable: !blockedInfo.blocked && !isBooked && date >= today,
        isBlocked: blockedInfo.blocked,
        isBooked: isBooked,
        isSelected: isDateSelected(date),
        isInRange: isDateInSelectedRange(date),
        blockedReason: blockedInfo.reason
      })
    }

    // Next month days to fill the grid
    const remainingDays = 42 - calendarDays.length // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day)
      const blockedInfo = isDateBlocked(date)
      
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isAvailable: !blockedInfo.blocked && !isDateBooked(date),
        isBlocked: blockedInfo.blocked,
        isBooked: isDateBooked(date),
        isSelected: false,
        isInRange: false,
        blockedReason: blockedInfo.reason
      })
    }

    return calendarDays
  }

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isAvailable || day.date < today) return

    const dateString = day.date.toISOString().split('T')[0]

    if (!selectingRange) {
      // Start selecting a range
      setTempStartDate(dateString)
      setSelectingRange(true)
    } else {
      // Complete the range selection
      if (tempStartDate && onDateSelect) {
        const startDate = tempStartDate
        const endDate = dateString

        // Ensure start date is before end date
        if (startDate <= endDate) {
          // Check if the range is valid (no booked/blocked dates in between)
          if (isRangeValid(startDate, endDate)) {
            // Check duration constraints
            const start = new Date(startDate)
            const end = new Date(endDate)
            const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))

            if (durationHours >= minRentalDuration && (!maxRentalDuration || durationHours <= maxRentalDuration)) {
              onDateSelect(startDate, endDate)
            } else {
              setError(`Rental duration must be between ${minRentalDuration} and ${maxRentalDuration || 'unlimited'} hours`)
            }
          } else {
            setError('Selected date range contains unavailable dates')
          }
        } else {
          onDateSelect(dateString, startDate)
        }
      }

      setSelectingRange(false)
      setTempStartDate(null)
    }
  }

  const isRangeValid = (startDate: string, endDate: string): boolean => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0]
      
      // Check if date is booked
      if (bookings.some(booking => {
        const bookingStart = new Date(booking.start_date).toISOString().split('T')[0]
        const bookingEnd = new Date(booking.end_date).toISOString().split('T')[0]
        return dateString >= bookingStart && dateString <= bookingEnd
      })) {
        return false
      }

      // Check if date is blocked
      const dayAvailability = availability.find(a => a.date === dateString)
      if (dayAvailability && !dayAvailability.is_available) {
        return false
      }
    }

    return true
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

  const clearSelection = () => {
    setSelectingRange(false)
    setTempStartDate(null)
    if (onDateSelect) {
      onDateSelect('', '')
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const calendarDays = generateCalendarDays()

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
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
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Select Dates</h3>
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
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Selection Status */}
      {(selectedStartDate || tempStartDate) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              {tempStartDate && selectingRange ? (
                <span>Select end date (started: {new Date(tempStartDate).toLocaleDateString()})</span>
              ) : selectedStartDate && selectedEndDate ? (
                <span>
                  Selected: {new Date(selectedStartDate).toLocaleDateString()} - {new Date(selectedEndDate).toLocaleDateString()}
                </span>
              ) : (
                <span>Select date range</span>
              )}
            </div>
            <button
              onClick={clearSelection}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear
            </button>
          </div>
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
          const isClickable = day.isCurrentMonth && day.isAvailable && !isPast

          let dayClasses = `
            p-2 text-sm rounded transition-colors relative cursor-pointer
            ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
            ${day.isToday ? 'font-bold' : ''}
            ${isPast ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}
          `

          if (day.isCurrentMonth && !isPast) {
            if (day.isSelected || day.isInRange) {
              dayClasses += ' bg-blue-200 border border-blue-300'
            } else if (day.isBooked) {
              dayClasses += ' bg-red-200 border border-red-300 cursor-not-allowed'
            } else if (day.isBlocked) {
              dayClasses += ' bg-gray-200 border border-gray-300 cursor-not-allowed'
            } else if (day.isAvailable) {
              dayClasses += ' bg-green-100 hover:bg-green-200 border border-green-300'
            }
          }

          if (!isClickable) {
            dayClasses += ' cursor-not-allowed'
          }

          return (
            <button
              key={index}
              onClick={() => isClickable && handleDateClick(day)}
              disabled={!isClickable}
              className={dayClasses}
              title={
                day.isBooked ? 'Already booked' :
                day.isBlocked ? day.blockedReason :
                isPast ? 'Past date' :
                undefined
              }
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
      <div className="mt-4 text-sm text-gray-600">
        <p>Click on an available date to start selecting your rental period, then click another date to complete the selection.</p>
        {minRentalDuration > 1 && (
          <p>Minimum rental duration: {minRentalDuration} hours</p>
        )}
        {maxRentalDuration && (
          <p>Maximum rental duration: {maxRentalDuration} hours</p>
        )}
      </div>
    </div>
  )
}