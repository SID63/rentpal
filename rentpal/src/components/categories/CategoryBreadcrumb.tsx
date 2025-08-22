'use client'

import { useEffect, useState } from 'react'
import { useCategories } from '@/hooks/useDatabase'
import { Category } from '@/types/database'
import Link from 'next/link'

interface CategoryBreadcrumbProps {
  categoryId: string
  showLinks?: boolean
  className?: string
}

export default function CategoryBreadcrumb({
  categoryId,
  showLinks = true,
  className = ""
}: CategoryBreadcrumbProps) {
  const { categories } = useCategories()
  const [breadcrumbPath, setBreadcrumbPath] = useState<Category[]>([])

  useEffect(() => {
    if (!categoryId || categories.length === 0) {
      setBreadcrumbPath([])
      return
    }

    const buildBreadcrumbPath = (catId: string): Category[] => {
      const category = categories.find(cat => cat.id === catId)
      if (!category) return []

      if (category.parent_id) {
        const parentPath = buildBreadcrumbPath(category.parent_id)
        return [...parentPath, category]
      }

      return [category]
    }

    setBreadcrumbPath(buildBreadcrumbPath(categoryId))
  }, [categoryId, categories])

  if (breadcrumbPath.length === 0) {
    return null
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Category breadcrumb">
      <Link 
        href="/search" 
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        All Categories
      </Link>
      
      {breadcrumbPath.map((category, index) => (
        <div key={category.id} className="flex items-center space-x-2">
          <svg 
            className="w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          
          {showLinks && index < breadcrumbPath.length - 1 ? (
            <Link
              href={`/search?category=${category.id}`}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {category.name}
            </Link>
          ) : (
            <span className={index === breadcrumbPath.length - 1 ? "text-gray-900 font-medium" : "text-gray-500"}>
              {category.name}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}