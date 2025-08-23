'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { itemService } from '@/lib/database'
import { Item } from '@/types/database'
import ItemForm from '@/components/items/ItemForm'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'

export default function EditItemPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemId = params.id as string

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true)
      const itemData = await itemService.getItemById(itemId)
      
      if (!itemData) {
        setError('Item not found')
        return
      }

      // Check if user owns this item
      if (itemData.owner_id !== user?.id) {
        setError('You can only edit your own items')
        return
      }

      setItem(itemData)
    } catch {
      setError('Failed to load item')
    } finally {
      setLoading(false)
    }
  }, [itemId, user])

  useEffect(() => {
    if (itemId && user) {
      fetchItem()
    }
  }, [itemId, user, fetchItem])

  const handleSuccess = (updatedItem: Item) => {
    router.push(`/items/${updatedItem.id}`)
  }

  const handleCancel = () => {
    router.back()
  }

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Go back
              </button>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        {item && (
          <ItemForm
            item={item}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </div>
    </AuthGuard>
  )
}