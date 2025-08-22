import { Metadata } from 'next'
import { pageMetadata, generateStructuredData } from '@/lib/seo'
import { itemService } from '@/lib/database'
import ItemDetails from '@/components/items/ItemDetails'
import { ProductSEO } from '@/components/SEO'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Basic SSR metadata generation for product page
  try {
    const item = await itemService.getItemById(params.id)
    if (!item) return pageMetadata.item({
      title: 'Item', description: 'Item not found', category: 'item', dailyRate: 0, location: { city: '', state: '' }
    })
    return pageMetadata.item({
      title: item.title,
      description: item.description || '',
      category: item.category?.name || 'item',
      dailyRate: item.daily_rate,
      location: { city: item.location_city || '', state: item.location_state || '' }
    })
  } catch {
    return pageMetadata.item({
      title: 'Item', description: 'Item details', category: 'item', dailyRate: 0, location: { city: '', state: '' }
    })
  }
}

export default async function Page({ params }: Props) {
  const item = await itemService.getItemById(params.id)
  if (!item) return null
  const product = {
    id: item.id,
    title: item.title,
    description: item.description || '',
    images: (item.images || []).map(i => i.image_url),
    dailyRate: item.daily_rate,
    condition: item.condition || 'Used',
    category: item.category?.name || 'item',
    location: { city: item.location_city || '', state: item.location_state || '' },
    owner: { name: item.owner?.full_name || 'Owner', rating: item.owner?.rating || 0, reviewCount: item.owner?.total_reviews || 0 },
    rating: item.rating,
    reviewCount: item.total_reviews,
  }
  return (
    <>
      <ProductSEO item={product} />
      {/* Hydrate client component */}
      {/* @ts-expect-error Async Server Component wrappers */}
      <ItemDetails item={item as any} />
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { itemService } from '@/lib/database'
import { ItemWithDetails } from '@/types/database'
import ItemDetails from '@/components/items/ItemDetails'
import { useAuth } from '@/contexts/AuthContext'

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [item, setItem] = useState<ItemWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemId = params.id as string

  useEffect(() => {
    if (itemId) {
      fetchItem()
    }
  }, [itemId, user])

  const fetchItem = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const itemData = await itemService.getItemById(itemId, user?.id)
      
      if (!itemData) {
        setError('Item not found')
        return
      }

      // Check if item is active (unless user is the owner)
      if (itemData.status !== 'active' && itemData.owner_id !== user?.id) {
        setError('This item is no longer available')
        return
      }

      setItem(itemData)
    } catch {
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

  const handleFavoriteChange = (isFavorited: boolean) => {
    if (item) {
      setItem({
        ...item,
        is_favorited: isFavorited,
        favorites_count: isFavorited 
          ? item.favorites_count + 1 
          : Math.max(0, item.favorites_count - 1)
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            {/* Breadcrumb skeleton */}
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
            
            <div className="lg:grid lg:grid-cols-2 lg:gap-8">
              {/* Image skeleton */}
              <div>
                <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-4"></div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
              
              {/* Content skeleton */}
              <div className="mt-8 lg:mt-0 space-y-6">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Item Not Found</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Go Back
            </button>
            <button
              onClick={() => router.push('/search')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Browse Items
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={() => router.push('/search')}
              className="hover:text-gray-900 transition-colors"
            >
              Search
            </button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            {item.category && (
              <>
                <button
                  onClick={() => router.push(`/search?category=${item.category_id}`)}
                  className="hover:text-gray-900 transition-colors"
                >
                  {item.category.name}
                </button>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            <span className="text-gray-900 font-medium truncate">{item.title}</span>
          </nav>
        </div>
      </div>

      {/* Item Details */}
      <ItemDetails item={item} onFavoriteChange={handleFavoriteChange} />
    </div>
  )
}