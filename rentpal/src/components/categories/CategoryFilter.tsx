'use client'

import { useState } from 'react'
import { useCategories } from '@/hooks/useDatabase'

interface CategoryFilterProps {
  selectedCategories: string[]
  onCategoriesChange: (categoryIds: string[]) => void
  multiSelect?: boolean
  showSubcategories?: boolean
  className?: string
}

export default function CategoryFilter({
  selectedCategories,
  onCategoriesChange,
  multiSelect = false,
  showSubcategories = true,
  className = ""
}: CategoryFilterProps) {
  const { categories, loading, error } = useCategories()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const parentCategories = categories.filter(cat => !cat.parent_id)

  const toggleCategory = (categoryId: string) => {
    if (multiSelect) {
      const newSelection = selectedCategories.includes(categoryId)
        ? selectedCategories.filter(id => id !== categoryId)
        : [...selectedCategories, categoryId]
      onCategoriesChange(newSelection)
    } else {
      onCategoriesChange(selectedCategories.includes(categoryId) ? [] : [categoryId])
    }
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const clearAll = () => {
    onCategoriesChange([])
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="animate-pulse">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 bg-gray-200 rounded mb-2"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Error loading categories: {error}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Categories</h3>
        {selectedCategories.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category List */}
      <div className="space-y-1">
        {parentCategories.map((category) => {
          const subcategories = categories.filter(cat => cat.parent_id === category.id)
          const isExpanded = expandedCategories.has(category.id)
          const isSelected = selectedCategories.includes(category.id)
          const hasSelectedSubcategory = subcategories.some(sub => selectedCategories.includes(sub.id))

          return (
            <div key={category.id} className="space-y-1">
              {/* Parent Category */}
              <div className="flex items-center">
                <label className="flex items-center flex-1 cursor-pointer">
                  <input
                    type={multiSelect ? "checkbox" : "radio"}
                    name="category"
                    checked={isSelected}
                    onChange={() => toggleCategory(category.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className={`ml-2 text-sm ${isSelected || hasSelectedSubcategory ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {category.name}
                  </span>
                </label>

                {/* Expand/Collapse Button */}
                {showSubcategories && subcategories.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(category.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Subcategories */}
              {showSubcategories && isExpanded && subcategories.length > 0 && (
                <div className="ml-6 space-y-1">
                  {subcategories.map((subcategory) => {
                    const isSubSelected = selectedCategories.includes(subcategory.id)

                    return (
                      <label key={subcategory.id} className="flex items-center cursor-pointer">
                        <input
                          type={multiSelect ? "checkbox" : "radio"}
                          name="category"
                          checked={isSubSelected}
                          onChange={() => toggleCategory(subcategory.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className={`ml-2 text-sm ${isSubSelected ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {subcategory.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Count */}
      {multiSelect && selectedCategories.length > 0 && (
        <div className="text-sm text-gray-500 pt-2 border-t">
          {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
        </div>
      )}
    </div>
  )
}