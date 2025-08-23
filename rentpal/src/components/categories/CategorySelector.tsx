'use client'

import { useState, useEffect } from 'react'
import { useSimpleCategories } from '@/hooks/useSimpleCategories'
import { Category } from '@/types/database'

interface CategorySelectorProps {
  selectedCategoryId?: string
  onCategorySelect: (categoryId: string, category: Category) => void
  placeholder?: string
  className?: string
  showSubcategories?: boolean
}

export default function CategorySelector({
  selectedCategoryId,
  onCategorySelect,
  placeholder = "Select a category",
  className = "",
  showSubcategories = true
}: CategorySelectorProps) {
  const { categories, loading, error } = useSimpleCategories()
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [subcategories, setSubcategories] = useState<Category[]>([])

  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const category = categories.find(cat => cat.id === selectedCategoryId)
      if (category) {
        setSelectedCategory(category)
        if (category.parent_id) {
          // If selected category is a subcategory, find its siblings
          const siblings = categories.filter(cat => cat.parent_id === category.parent_id)
          setSubcategories(siblings)
        } else {
          // If selected category is a parent, find its children
          const children = categories.filter(cat => cat.parent_id === category.id)
          setSubcategories(children)
        }
      }
    }
  }, [selectedCategoryId, categories])

  const parentCategories = categories.filter(cat => !cat.parent_id)

  const handleParentCategoryChange = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    if (!category) return

    setSelectedCategory(category)
    
    if (showSubcategories) {
      const children = categories.filter(cat => cat.parent_id === categoryId)
      setSubcategories(children)
      
      // If there are subcategories, don't select the parent yet
      if (children.length > 0) {
        return
      }
    }

    onCategorySelect(categoryId, category)
  }

  const handleSubcategoryChange = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    if (!category) return

    onCategorySelect(categoryId, category)
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded"></div>
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
    <div className={`space-y-4 ${className}`}>
      {/* Parent Category Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={selectedCategory?.parent_id ? selectedCategory.parent_id : selectedCategory?.id || ''}
          onChange={(e) => handleParentCategoryChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">{placeholder}</option>
          {parentCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory Selector */}
      {showSubcategories && subcategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory
          </label>
          <select
            value={selectedCategory?.parent_id ? selectedCategory.id : ''}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a subcategory</option>
            {subcategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Category Display */}
      {selectedCategory && (
        <div className="text-sm text-gray-600">
          Selected: <span className="font-medium">{selectedCategory.name}</span>
          {selectedCategory.description && (
            <p className="text-xs text-gray-500 mt-1">{selectedCategory.description}</p>
          )}
        </div>
      )}
    </div>
  )
}