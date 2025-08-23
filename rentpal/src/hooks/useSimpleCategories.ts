import { useState, useEffect } from 'react'
import { Category } from '@/types/database'

export function useSimpleCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching categories via API...')
        
        const response = await fetch('/api/categories')
        const result = await response.json()

        if (!result.success) {
          console.error('Categories API error:', result.error)
          setError(result.error)
          setCategories([])
        } else {
          console.log('Categories fetched successfully via API:', result.count, 'items')
          setCategories(result.categories || [])
        }
      } catch (err) {
        console.error('Categories fetch exception:', err)
        setError(String(err))
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return { categories, loading, error }
}