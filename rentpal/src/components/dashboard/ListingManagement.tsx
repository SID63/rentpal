'use client'

import { useState } from 'react'
import { ItemStatus } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useUserItems } from '@/hooks/useDatabase'
import { itemService } from '@/lib/database'
import Link from 'next/link'
import Image from 'next/image'

interface ListingManagementProps {
  className?: string
}

type ListingFilter = 'all' | 'active' | 'inactive' | 'suspended'
type SortOption = 'newest' | 'oldest' | 'title' | 'views' | 'bookings'

export default function ListingManagement({ className = "" }: ListingManagementProps) {
  const { user } = useAuth()
  const { items, loading, error, refresh } = useUserItems(user?.id)
  const [filter, setFilter] = useState<ListingFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)

  const filteredAndSortedItems = items
    .filter(item => {
      // Filter by status
      if (filter !== 'all' && item.status !== filter) return false
      
      // Filter by search query
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'views':
          return b.views_count - a.views_count
        case 'bookings':
          // This would need to be calculated from bookings data
          return 0
        default:
          return 0
      }
    })

  const getStatusCounts = () => {
    return {
      all: items.length,
      active: items.filter(item => item.status === 'active').length,
      inactive: items.filter(item => item.status === 'inactive').length,
      suspended: items.filter(item => item.status === 'suspended').length
    }
  }

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)))
    }
  }

  const handleBulkStatusUpdate = async (newStatus: ItemStatus) => {
    if (selectedItems.size === 0) return

    setIsUpdating(true)
    try {
      const promises = Array.from(selectedItems).map(itemId =>
        itemService.updateItem(itemId, { status: newStatus })
      )
      
      await Promise.all(promises)
      setSelectedItems(new Set())
      refresh()
    } catch (error) {
      console.error('Failed to update items:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteItems = async () => {
    if (selectedItems.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)? This action cannot be undone.`)) {
      return
    }

    setIsUpdating(true)
    try {
      const promises = Array.from(selectedItems).map(itemId =>
        itemService.deleteItem(itemId)
      )
      
      await Promise.all(promises)
      setSelectedItems(new Set())
      refresh()
    } catch (error) {
      console.error('Failed to delete items:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: ItemStatus) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const counts = getStatusCounts()

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-red-50 rounded-lg">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={refresh}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Listings</h1>
            <p className="text-gray-600">Manage your rental items</p>
          </div>
          <Link
            href="/items/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add New Listing
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(counts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as ListingFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
                <option value="views">Most Views</option>
                <option value="bookings">Most Bookings</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkStatusUpdate('active')}
                disabled={isUpdating}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('inactive')}
                disabled={isUpdating}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Deactivate
              </button>
              <button
                onClick={handleDeleteItems}
                disabled={isUpdating}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listings Table */}
      {filteredAndSortedItems.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {item.images && item.images.length > 0 ? (
                            <Image
                              src={item.images[0].image_url}
                              alt={item.title}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.category?.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div>{formatCurrency(item.daily_rate)}/day</div>
                        {item.hourly_rate && (
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.hourly_rate)}/hour
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.views_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/items/${item.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        <Link
                          href={`/items/${item.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleItemSelect(item.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Select
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filter !== 'all' ? 'No items found' : 'No listings yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Start earning by listing your first item for rent.'
            }
          </p>
          {(!searchQuery && filter === 'all') && (
            <Link
              href="/items/new"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Listing
            </Link>
          )}
        </div>
      )}
    </div>
  )
}