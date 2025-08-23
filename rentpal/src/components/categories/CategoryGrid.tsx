'use client'

import { useState } from 'react'
import { useCategories } from '@/hooks/useDatabase'
import { Category } from '@/types/database'
import Image from 'next/image'

interface CategoryGridProps {
  onCategorySelect?: (category: Category) => void
  showSubcategories?: boolean
  linkToSearch?: boolean
  className?: string
}

export default function CategoryGrid({
  onCategorySelect,
  showSubcategories = false,
  linkToSearch = true,
  className = ""
}: CategoryGridProps) {
  const { categories, loading, error } = useCategories()
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  const parentCategories = categories.filter(cat => !cat.parent_id)
  const subcategories = selectedParentId 
    ? categories.filter(cat => cat.parent_id === selectedParentId)
    : []

  const handleCategoryClick = (category: Category) => {
    if (onCategorySelect) {
      onCategorySelect(category)
      return
    }

    if (showSubcategories && !category.parent_id) {
      const hasSubcategories = categories.some(cat => cat.parent_id === category.id)
      if (hasSubcategories) {
        setSelectedParentId(selectedParentId === category.id ? null : category.id)
        return
      }
    }

    // Default behavior - navigate to search if linkToSearch is true
    if (linkToSearch) {
      window.location.href = `/search?category=${category.id}`
    }
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-3"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center text-red-600 ${className}`}>
        <p>Error loading categories: {error}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Parent Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {parentCategories.map((category) => {
          const hasSubcategories = categories.some(cat => cat.parent_id === category.id)
          const isSelected = selectedParentId === category.id

          return (
            <div key={category.id} className="relative">
              <button
                onClick={() => handleCategoryClick(category)}
                className={`w-full bg-white rounded-lg border-2 p-6 text-center hover:shadow-md transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Category Icon */}
                {category.icon_url ? (
                  <Image
                    src={category.icon_url}
                    alt={category.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 mx-auto mb-3"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                )}

                {/* Category Name */}
                <h3 className="font-medium text-gray-900 mb-1">{category.name}</h3>
                
                {/* Category Description */}
                {category.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {category.description}
                  </p>
                )}

                {/* Subcategory Indicator */}
                {hasSubcategories && showSubcategories && (
                  <div className="absolute top-2 right-2">
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isSelected ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Subcategories */}
      {showSubcategories && subcategories.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              {parentCategories.find(cat => cat.id === selectedParentId)?.name} Subcategories
            </h4>
            <button
              onClick={() => setSelectedParentId(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide subcategories
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {subcategories.map((subcategory) => (
              <button
                key={subcategory.id}
                onClick={() => handleCategoryClick(subcategory)}
                className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:shadow-sm hover:border-gray-300 transition-all duration-200"
              >
                <h5 className="font-medium text-gray-900 text-sm mb-1">
                  {subcategory.name}
                </h5>
                {subcategory.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {subcategory.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Categories Message */}
      {parentCategories.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p>No categories available at the moment.</p>
        </div>
      )}
    </div>
  )
}