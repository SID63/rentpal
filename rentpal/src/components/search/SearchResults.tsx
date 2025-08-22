'use client'

import { useState } from 'react'
import { ItemWithDetails } from '@/types/database'
import ItemCard from '@/components/items/ItemCard'
import { SearchFilters } from './SearchFilters'

interface SearchResultsProps {
  items: ItemWithDetails[]
  filters: SearchFilters
  totalCount: number
  currentPage: number
  itemsPerPage: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onLoadMore?: () => void
  hasMore?: boolean
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  className?: string
}

export default function SearchResults({
  items,
  filters,
  totalCount,
  currentPage,
  itemsPerPage,
  isLoading,
  onPageChange,
  onLoadMore,
  hasMore = false,
  viewMode,
  onViewModeChange,
  className = ""
}: SearchResultsProps) {
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set())

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)

  const handleFavoriteChange = (itemId: string, isFavorited: boolean) => {
    const newFavorites = new Set(favoriteItems)
    if (isFavorited) {
      newFavorites.add(itemId)
    } else {
      newFavorites.delete(itemId)
    }
    setFavoriteItems(newFavorites)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
    )

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          disabled={isLoading}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
        >
          1
        </button>
      )
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300">
            ...
          </span>
        )
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          disabled={isLoading}
          className={`px-3 py-2 text-sm font-medium border ${
            i === currentPage
              ? 'text-blue-600 bg-blue-50 border-blue-500'
              : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300">
            ...
          </span>
        )
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          disabled={isLoading}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
        >
          {totalPages}
        </button>
      )
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    )

    return (
      <div className="flex items-center justify-center space-x-0">
        {pages}
      </div>
    )
  }

  const renderLoadingGrid = () => (
    <div className={`grid gap-6 ${
      viewMode === 'grid' 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
        : 'grid-cols-1'
    }`}>
      {Array.from({ length: itemsPerPage }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="bg-gray-200 aspect-[4/3] rounded-lg mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  )

  if (isLoading && items.length === 0) {
    return (
      <div className={className}>
        {renderLoadingGrid()}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium text-gray-900">
            {totalCount > 0 ? (
              <>
                {totalCount.toLocaleString()} result{totalCount !== 1 ? 's' : ''}
                {filters.query && (
                  <span className="text-gray-600"> for &quot;{filters.query}&quot;</span>
                )}
              </>
            ) : (
              'No results found'
            )}
          </h2>
          {totalCount > 0 && (
            <span className="text-sm text-gray-500">
              Showing {startItem}-{endItem} of {totalCount}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded ${
              viewMode === 'grid' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results Grid/List */}
      {items.length > 0 ? (
        <>
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={{
                  ...item,
                  is_favorited: favoriteItems.has(item.id) || item.is_favorited
                }}
                onFavoriteChange={handleFavoriteChange}
                className={viewMode === 'list' ? 'max-w-none' : ''}
              />
            ))}
          </div>

          {/* Loading More Items */}
          {isLoading && items.length > 0 && (
            <div className="flex justify-center mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Load More Button (for infinite scroll alternative) */}
          {onLoadMore && hasMore && !isLoading && (
            <div className="flex justify-center mt-8">
              <button
                onClick={onLoadMore}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Load More Items
              </button>
            </div>
          )}

          {/* Pagination */}
          {!onLoadMore && totalPages > 1 && (
            <div className="flex flex-col items-center mt-8 space-y-4">
              {renderPagination()}
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
            </div>
          )}
        </>
      ) : (
        /* No Results */
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No items found</h3>
          <p className="mt-2 text-gray-500">
            {filters.query || filters.categories.length > 0 || filters.location ? (
              <>Try adjusting your search criteria or <button onClick={() => window.location.reload()} className="text-blue-600 hover:text-blue-800">browse all items</button></>
            ) : (
              'Be the first to list an item in this area!'
            )}
          </p>
          <div className="mt-6">
            <a
              href="/items/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              List Your Item
            </a>
          </div>
        </div>
      )}
    </div>
  )
}